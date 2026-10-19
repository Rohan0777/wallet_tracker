"""
Production FastAPI Server (v9.0 - Related-Wallet Detective Final Release & Production Hardened)

Key Advancements in v9.0:
- Core Product Alignment:
  * Supports multi-hop Related-Wallet Pivot Scan (`can_pivot_scan`, `pivot_chain`, `relation_score`, `evidence_tags`)
    to fulfill the core goal: "내 지갑을 넣으면 관련된 지갑을 찾아주는 프로젝트".
  * Enhanced `/api/ad-config` with structured partner affiliate funnel links (Binance, OKX, Bybit, Ledger, Trezor)
    powering the interactive 3-Step Asset Recovery & Security Funnel Modal.
  * Full `/api/protocols` encyclopedia for verified DeFi & Liquid Staking escape guides.
- Preserved v8.5 Modularity & Concurrency Hardening:
  * `_resolve_analysis_input(chain, address)` input validation & normalization helper.
  * `_cleanup_expired_rate_limit_entries(now_mono)` periodic rate-limit eviction helper.
  * `_hydrate_complete_subchain_results(data, now)` selective sub-chain L1 cache hydration.
  * P0 Singleflight Coalescing under Heavy Saturation + AdmissionTimeout (503) + Queue Saturation guard.
  * P1 Recursive `result_is_partial` check across root, `failed_chains`, and `per_chain_results`.
  * P1 Deep-copy L1 cache immutability, IPv6 `/64` subnet rate limiting, and protected `/api/stats`.
  * P2 Atomic L2 persistence with `os.fsync` and bounded graceful shutdown.
"""
import os
import time
import json
import copy
import secrets
import asyncio
import logging
import ipaddress
import tempfile
import collections
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
import uvicorn
from fastapi import FastAPI, Query, Request, HTTPException, Security, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security.api_key import APIKeyHeader
import multichain_tracker
from address_utils import (
    VERSION as ADDR_UTILS_VERSION,
    make_cache_key,
    normalize_address,
    validate_address_format,
    MAX_BUNDLE
)

__version__ = "9.1.0"
VERSION = __version__

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(f"server_v{__version__.replace('.', '_')}")

PORT = int(os.environ.get("PORT", 8088))
HOST = os.environ.get("HOST", "0.0.0.0")
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", 900))
MAX_L1_CACHE_ITEMS = int(os.environ.get("MAX_L1_CACHE_ITEMS", 500))
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", 25))
ADMISSION_WAIT_SEC = float(os.environ.get("ADMISSION_WAIT_SEC", 20.0))

# Admission Limits
MAX_CONCURRENT_ANALYSES = int(os.environ.get("MAX_CONCURRENT_ANALYSES", 6))
MAX_PENDING_ANALYSES = int(os.environ.get("MAX_PENDING_ANALYSES", 12))

# Proxy header trust: Strict explicit env opt-in only
TRUST_PROXY_HEADERS = os.environ.get("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"
IS_RENDER = os.environ.get("RENDER", "false").strip().lower() == "true"
# Strategy: 'render' (leftmost IP) or 'right_hop' (default for standard multi-hop reverse proxies)
PROXY_STRATEGY = os.environ.get("PROXY_STRATEGY", "render" if IS_RENDER else "right_hop").strip().lower()
TRUSTED_PROXY_HOPS = max(1, int(os.environ.get("TRUSTED_PROXY_HOPS", "1")))
# Optional: single trusted header carrying the real client IP (e.g. "cf-connecting-ip" behind Cloudflare).
# Empty (default) -> use X-Forwarded-For parsed according to PROXY_STRATEGY.
PROXY_CLIENT_IP_HEADER = os.environ.get("PROXY_CLIENT_IP_HEADER", "").strip().lower()
# Optional: comma-separated CIDRs or IPs of trusted reverse proxies (e.g. "10.0.0.0/8, 127.0.0.1").
# When specified, proxy headers are ONLY parsed if direct peer (request.client.host) matches.
TRUSTED_PROXIES_RAW = os.environ.get("TRUSTED_PROXIES", "").strip()
# CSP rollout switch: "report-only" (default, log only) or "enforce".
CSP_MODE = os.environ.get("CSP_MODE", "report-only").strip().lower()
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "").strip()
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_CACHE_DIR = os.environ.get("DATA_CACHE_DIR", os.path.join(BASE_DIR, "data_cache"))
L2_CACHE_FILE = os.path.join(DATA_CACHE_DIR, "l2_analysis_cache.json")
os.makedirs(DATA_CACHE_DIR, exist_ok=True)


class AdmissionTimeout(Exception):
    """Raised when an analysis task cannot acquire an execution slot within ADMISSION_WAIT_SEC."""
    pass


# ---------------------------------------------------------------------
# In-Memory State & Metrics
# ---------------------------------------------------------------------
l1_cache: collections.OrderedDict = collections.OrderedDict()
inflight_tasks: Dict[str, asyncio.Task] = {}       # cache_key -> asyncio.Task
ip_request_log: Dict[str, collections.deque] = {}  # subnet_key -> deque([monotonic_ts])
_last_rate_limit_cleanup: float = 0.0
_l2_dirty: bool = False
_is_shutting_down: bool = False
_admission_semaphore: Optional[asyncio.Semaphore] = None
_pending_counter: int = 0

metrics = {
    "version": __version__,
    "started_at": int(time.time()),
    "total_requests": 0,
    "l1_hits": 0,
    "l2_hits": 0,
    "l2_loaded_entries": 0,
    "rpc_fetches": 0,
    "rate_limited": 0,
    "partial_skips": 0,
    "l2_save_failures": 0,
    "admission_rejected": 0,
    "admission_timeouts": 0,
}


def get_admission_semaphore() -> asyncio.Semaphore:
    """Returns or lazily creates the admission semaphore bound to the current running event loop."""
    global _admission_semaphore
    if _admission_semaphore is None:
        _admission_semaphore = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)
    return _admission_semaphore


def reset_server_state():
    """Utility function to completely reset state (used in isolated unit/integration tests)."""
    global _l2_dirty, _is_shutting_down, _admission_semaphore, _pending_counter, _last_rate_limit_cleanup
    l1_cache.clear()
    inflight_tasks.clear()
    ip_request_log.clear()
    _last_rate_limit_cleanup = 0.0
    _l2_dirty = False
    _is_shutting_down = False
    _admission_semaphore = None
    _pending_counter = 0
    metrics.update({
        "started_at": int(time.time()),
        "total_requests": 0,
        "l1_hits": 0,
        "l2_hits": 0,
        "l2_loaded_entries": 0,
        "rpc_fetches": 0,
        "rate_limited": 0,
        "partial_skips": 0,
        "l2_save_failures": 0,
        "admission_rejected": 0,
        "admission_timeouts": 0,
    })


# ---------------------------------------------------------------------
# L1 Memory Cache Operations (Immutable Deep-Copy Protection)
# ---------------------------------------------------------------------
def set_l1_cache(cache_key: str, data: dict, ts: float):
    """Stores deep-copied data in L1 LRU cache using the pre-normalized cache_key."""
    l1_cache[cache_key] = {"data": copy.deepcopy(data), "timestamp": ts}
    l1_cache.move_to_end(cache_key)
    while len(l1_cache) > MAX_L1_CACHE_ITEMS:
        l1_cache.popitem(last=False)


def get_cached_result(cache_key: str, now: float) -> Optional[dict]:
    """
    Retrieves cached data without altering key casing.
    Returns a deep copy of the cached dictionary to prevent caller mutations.
    """
    entry = l1_cache.get(cache_key)
    if entry is None:
        return None
    if now - entry["timestamp"] >= CACHE_TTL_SECONDS:
        l1_cache.pop(cache_key, None)
        return None
    l1_cache.move_to_end(cache_key)
    metrics["l1_hits"] += 1
    return copy.deepcopy(entry["data"])


# ---------------------------------------------------------------------
# Recursive Partial-Failure Detection & Safe Cache Hydration
# ---------------------------------------------------------------------
def result_is_partial(data: dict) -> bool:
    """
    Recursively inspects data completeness.
    Returns True if:
    - data is not a dict
    - 'is_partial' or 'partial' flag is True
    - 'failed_chains' list is non-empty
    - any sub-chain in 'per_chain_results' reports a partial failure
    """
    if not isinstance(data, dict):
        return True
    if data.get("is_partial") or data.get("partial") or bool(data.get("failed_chains")):
        return True
    sub_results = data.get("per_chain_results")
    if sub_results is None:
        return False
    if not isinstance(sub_results, dict):
        return True
    for sub_data in sub_results.values():
        if not isinstance(sub_data, dict) or result_is_partial(sub_data):
            return True
    return False


def _hydrate_complete_subchain_results(data, now):
    changed = False
    sub_results = data.get("per_chain_results")
    # Hydrate healthy sub-chain results
    if isinstance(sub_results, dict):
        for sub_key, sub_data in sub_results.items():
            if isinstance(sub_key, str) and isinstance(sub_data, dict):
                if not result_is_partial(sub_data):
                    set_l1_cache(sub_key, sub_data, now)
                    changed = True
    return changed


def save_cached_result(cache_key: str, data: dict, now: float):
    """
    Safely saves complete results to cache.
    If root experienced a partial failure, avoids caching the root while
    selectively hydrating fully successful sub-chain results.
    """
    global _l2_dirty
    if not isinstance(data, dict):
        return
    changed = _hydrate_complete_subchain_results(data, now)
    # Root cache policy: Never cache top-level if any part failed
    if result_is_partial(data):
        metrics["partial_skips"] += 1
    else:
        set_l1_cache(cache_key, data, now)
        changed = True
    if changed:
        _l2_dirty = True


# ---------------------------------------------------------------------
# Atomic & Durable L2 Disk Persistence (fsync enforced)
# ---------------------------------------------------------------------
def _write_l2_snapshot_sync(snapshot: dict, target_file: Optional[str] = None) -> bool:
    """
    Atomically writes L2 snapshot using a unique temporary file with os.fsync
    before atomic rename, guaranteeing data durability across crashes.
    """
    dest_path = target_file or L2_CACHE_FILE
    temp_path = None
    try:
        cache_dir = os.path.dirname(dest_path)
        os.makedirs(cache_dir, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=cache_dir,
            prefix="l2_analysis_cache.",
            suffix=".tmp",
            delete=False
        ) as f:
            temp_path = f.name
            json.dump(snapshot, f, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())  # Ensure bytes are committed to physical disk
        os.replace(temp_path, dest_path)
        temp_path = None
        return True
    except Exception as e:
        metrics["l2_save_failures"] += 1
        logger.exception("L2 캐시 디스크 저장 중 오류 발생: %s", e)
        return False
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                logger.warning("L2 임시 파일 정리 실패: %s", temp_path)


def build_l2_snapshot() -> dict:
    now = time.time()
    snapshot = {}
    for k, v in l1_cache.items():
        ts = float(v.get("timestamp", 0))
        if now - ts < CACHE_TTL_SECONDS:
            snapshot[k] = {"timestamp": ts, "data": copy.deepcopy(v.get("data"))}
    return snapshot


async def flush_l2_once(target_file: Optional[str] = None) -> bool:
    """Performs a non-blocking L2 disk write. Preserves dirty flag on failure."""
    global _l2_dirty
    if not _l2_dirty:
        return True
    snapshot = build_l2_snapshot()
    _l2_dirty = False
    success = await asyncio.to_thread(_write_l2_snapshot_sync, snapshot, target_file)
    if not success:
        _l2_dirty = True
        logger.warning("L2 flush failed, dirty state preserved for next cycle.")
    return success


def load_l2_cache_startup(target_file: Optional[str] = None):
    filepath = target_file or L2_CACHE_FILE
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                disk_store = json.load(f)
            now = time.time()
            restored = 0
            if isinstance(disk_store, dict):
                for k, v in disk_store.items():
                    if isinstance(v, dict):
                        ts = float(v.get("timestamp", 0))
                        if now - ts < CACHE_TTL_SECONDS and isinstance(v.get("data"), dict):
                            set_l1_cache(k, v["data"], ts)
                            restored += 1
            metrics["l2_loaded_entries"] = restored
            logger.info("L2 캐시 로드 완료 (복원된 항목: %d개)", restored)
        except Exception as e:
            logger.warning("L2 캐시 파일 읽기 실패, 빈 캐시로 시작: %s", e)


# ---------------------------------------------------------------------
# IPv6 /64 Subnet Aware Sliding-Window Rate Limiter
# ---------------------------------------------------------------------
def normalize_ip_for_rate_limit(ip_str: str) -> str:
    """
    Normalizes client IP for rate limiting:
    - Strips IPv6 zone IDs (e.g. `%eth0`) before parsing
    - Unwraps IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4` -> `1.2.3.4`) so they don't share one /64
    - IPv4: exact /32 host string
    - IPv6: masked to /64 subnet prefix to prevent multi-IP rotation bypass
    - Malformed strings: mapped to constant `'invalid_ip'` bucket to prevent bypass
    """
    clean = (ip_str or "").strip().split("%")[0]
    try:
        ip_obj = ipaddress.ip_address(clean)
        if isinstance(ip_obj, ipaddress.IPv6Address):
            if ip_obj.ipv4_mapped is not None:
                return str(ip_obj.ipv4_mapped)
            net = ipaddress.IPv6Network(f"{ip_obj}/64", strict=False)
            return str(net.network_address)
        return str(ip_obj)
    except ValueError:
        return "invalid_ip"


def _cleanup_expired_rate_limit_entries(now_mono: float):
    global _last_rate_limit_cleanup
    if now_mono - _last_rate_limit_cleanup > 60.0:
        _last_rate_limit_cleanup = now_mono
        if len(ip_request_log) > 1000:
            expired_keys = [k for k, q in ip_request_log.items() if not q or (now_mono - q[-1] > 60.0)]
            for k in expired_keys:
                ip_request_log.pop(k, None)


def check_rate_limit(client_ip: str, now_mono: float) -> bool:
    """
    Sliding window rate limit check.
    Cleanup is performed periodically (every 60s) rather than on every request,
    avoiding O(N) CPU spikes under traffic surges.
    """
    _cleanup_expired_rate_limit_entries(now_mono)
    rate_key = normalize_ip_for_rate_limit(client_ip)
    q = ip_request_log.setdefault(rate_key, collections.deque())
    while q and (now_mono - q[0] > 60.0):
        q.popleft()
    if len(q) >= RATE_LIMIT_PER_MIN:
        metrics["rate_limited"] += 1
        return False
    q.append(now_mono)
    return True


def is_valid_ip(ip_str: str) -> bool:
    try:
        clean = (ip_str or "").strip().split("%")[0]
        ipaddress.ip_address(clean)
        return True
    except ValueError:
        return False


def is_trusted_proxy_peer(client_host: Optional[str]) -> bool:
    """Verifies whether direct connection peer is an allowed reverse proxy when TRUSTED_PROXIES is configured."""
    if not TRUSTED_PROXIES_RAW:
        return True  # If no restrictions specified, allow any direct peer
    if not client_host:
        return False
    try:
        peer_ip = ipaddress.ip_address(client_host.split("%")[0])
        for net_str in TRUSTED_PROXIES_RAW.split(","):
            net_str = net_str.strip()
            if not net_str:
                continue
            if "/" in net_str:
                if peer_ip in ipaddress.ip_network(net_str, strict=False):
                    return True
            else:
                if peer_ip == ipaddress.ip_address(net_str):
                    return True
        return False
    except ValueError:
        return False


def get_client_ip(request: Request) -> str:
    """
    Extracts client IP.
    When TRUST_PROXY_HEADERS is explicitly True and the immediate peer is trusted:
    - If PROXY_CLIENT_IP_HEADER is specified (e.g. cf-connecting-ip), uses it exclusively.
    - If PROXY_STRATEGY == "render" (or leftmost), reads the first IP in X-Forwarded-For
      as documented by Render's edge load balancer.
    - Otherwise (standard 'right_hop'), reads X-Forwarded-For from the right based on TRUSTED_PROXY_HOPS.
    Otherwise defaults strictly to request.client.host.
    """
    peer_ip = request.client.host if (request.client and request.client.host) else "127.0.0.1"

    if TRUST_PROXY_HEADERS and is_trusted_proxy_peer(peer_ip):
        # Only ONE proxy-supplied source is trusted, so a client cannot win by forging another header.
        eff_header = PROXY_CLIENT_IP_HEADER or ("cf-connecting-ip" if PROXY_STRATEGY == "cloudflare" else "")
        if eff_header:
            val = request.headers.get(eff_header)
            if val and is_valid_ip(val):
                return val.strip().split("%")[0]
        else:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                parts = [p.strip() for p in forwarded.split(",") if p.strip()]
                if PROXY_STRATEGY in ("render", "left", "first"):
                    # Render edge load balancer sets the actual verified client IP as the first element
                    if parts and is_valid_ip(parts[0]):
                        return parts[0].split("%")[0]
                else:
                    # Standard multi-hop proxy: count from the right on the raw list
                    hops = max(1, TRUSTED_PROXY_HOPS)
                    if len(parts) >= hops and is_valid_ip(parts[-hops]):
                        return parts[-hops].split("%")[0]

    return peer_ip


# ---------------------------------------------------------------------
# P0 Fixed: Atomic Slot Acquisition & Immediate Singleflight Registration
# ---------------------------------------------------------------------
async def _do_fetch_worker(chain: str, resolved_address: str, cache_key: str) -> dict:
    data = await asyncio.to_thread(multichain_tracker.get_analysis_by_chain, chain, resolved_address)
    save_cached_result(cache_key, data, time.time())
    return data


async def _run_with_slot(chain: str, addr: str, key: str) -> dict:
    """
    Acquires admission semaphore slot with ADMISSION_WAIT_SEC timeout,
    increments rpc_fetches metric, and executes the RPC worker.
    """
    global _pending_counter
    _pending_counter += 1
    sem = get_admission_semaphore()
    try:
        await asyncio.wait_for(sem.acquire(), timeout=ADMISSION_WAIT_SEC)
    except asyncio.TimeoutError:
        metrics["admission_timeouts"] += 1
        raise AdmissionTimeout()
    finally:
        _pending_counter = max(0, _pending_counter - 1)
    try:
        metrics["rpc_fetches"] += 1
        return await _do_fetch_worker(chain, addr, key)
    finally:
        sem.release()


def _cleanup_task(key: str, t: asyncio.Task):
    """
    Removes task from inflight_tasks only if the registered task is self,
    preventing inadvertent deletion of subsequent replacement tasks.
    Silences unhandled exception warnings.
    """
    if inflight_tasks.get(key) is t:
        inflight_tasks.pop(key, None)
    if not t.cancelled():
        try:
            t.exception()
        except Exception:
            pass


# ---------------------------------------------------------------------
# Lifespan Management (Graceful Bounded Shutdown)
# ---------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _is_shutting_down
    _is_shutting_down = False
    load_l2_cache_startup()
    flush_stop_event = asyncio.Event()

    async def periodic_flush_loop():
        while not flush_stop_event.is_set():
            try:
                await asyncio.wait_for(flush_stop_event.wait(), timeout=60.0)
            except asyncio.TimeoutError:
                pass
            if _l2_dirty:
                await flush_l2_once()

    flush_task = asyncio.create_task(periodic_flush_loop())
    logger.info("Server v%s initialized. Periodic L2 flush task started.", __version__)
    try:
        yield
    finally:
        _is_shutting_down = True
        logger.info("Server shutdown initiated. Ceasing acceptance of new tasks...")
        flush_stop_event.set()
        try:
            await asyncio.wait_for(flush_task, timeout=5.0)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            pass
        # Graceful wait for in-flight tasks bounded by 10s timeout
        if inflight_tasks:
            logger.info("Waiting for %d in-flight tasks (max 10s)...", len(inflight_tasks))
            tasks = list(inflight_tasks.values())
            try:
                await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=10.0)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                logger.warning("Shutdown timeout exceeded. Cancelling residual in-flight tasks.")
                for t in tasks:
                    if not t.done():
                        t.cancel()
        # Final disk write
        if _l2_dirty:
            logger.info("Writing final L2 snapshot...")
            await flush_l2_once()
        logger.info("Server shutdown complete.")


# ---------------------------------------------------------------------
# FastAPI Application Declaration & Security Middleware
# ---------------------------------------------------------------------
app = FastAPI(
    title="Wake Up Crypto Scanner",
    version=__version__,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan
)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    csp_header = "Content-Security-Policy" if CSP_MODE == "enforce" else "Content-Security-Policy-Report-Only"
    response.headers[csp_header] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://d3js.org https://cdn.jsdelivr.net https://unpkg.com https://pagead2.googlesyndication.com https://ad.a-ads.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; "
        "connect-src 'self'; img-src 'self' data: https:;"
    )
    path = request.url.path
    if path == "/" or path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    elif path == "/healthz" or path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


# ---------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------
@app.api_route("/healthz", methods=["GET", "HEAD"])
def healthcheck():
    return {
        "status": "ok",
        "version": __version__,
        "uptime_sec": int(time.time()) - metrics["started_at"],
        "l1_cached_keys": len(l1_cache),
        "proxy_trusted": TRUST_PROXY_HEADERS,
        "active_inflight": len(inflight_tasks)
    }


api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


@app.get("/api/stats")
def get_server_stats(api_key: Optional[str] = Security(api_key_header)):
    # Default-deny (403) when ADMIN_API_KEY is not configured or key does not match
    if not ADMIN_API_KEY or not api_key or not secrets.compare_digest(api_key.encode("utf-8"), ADMIN_API_KEY.encode("utf-8")):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return {
        **metrics,
        "l1_size": len(l1_cache),
        "proxy_trusted": TRUST_PROXY_HEADERS,
        "inflight_count": len(inflight_tasks),
        "pending_counter": _pending_counter,
    }


@app.get("/api/ad-config")
def get_ad_config():
    ledger_url = os.environ.get("LEDGER_AFFILIATE_URL", "").strip() or "https://shop.ledger.com"
    binance_url = os.environ.get("EXCHANGE_REFERRAL_URL", "").strip() or "https://accounts.binance.com/register"
    okx_url = os.environ.get("OKX_REFERRAL_URL", "").strip() or "https://www.okx.com/join"
    bybit_url = os.environ.get("BYBIT_REFERRAL_URL", "").strip() or "https://www.bybit.com/invite"
    return {
        "affiliate_url": ledger_url,
        "exchange_referral_url": binance_url,
        "okx_referral_url": okx_url,
        "bybit_referral_url": bybit_url,
        "aads_unit_id": os.environ.get("AADS_AD_UNIT_ID", ""),
        "adsense_client_id": os.environ.get("ADSENSE_CLIENT_ID", ""),
        "partners": [
            {
                "id": "binance",
                "name": "Binance (바이낸스)",
                "category": "EXCHANGE_AFFILIATE",
                "benefit_badge": "수수료 최대 20~40% 할인",
                "description": "발굴한 SOL·ETH·BNB·USDT 현금화 및 가스비(0.003 BNB / TRX) 소액 출금 지원",
                "url": binance_url
            },
            {
                "id": "okx",
                "name": "OKX (오케이엑스)",
                "category": "EXCHANGE_AFFILIATE",
                "benefit_badge": "Web3 멀티체인 & 수수료 30% 페이백",
                "description": "다계정 에어드랍 지갑 통합 관리 및 멀티체인 브릿지 자산 즉시 입출금",
                "url": okx_url
            },
            {
                "id": "ledger",
                "name": "Ledger (렛저 콜드월렛)",
                "category": "HARDWARE_WALLET",
                "benefit_badge": "피싱·드레이너 100% 물리적 차단",
                "description": "되찾은 스테이킹·다계정 자산을 오프라인 하드웨어 보안 칩에 영구 분리 보관",
                "url": ledger_url
            }
        ]
    }


@app.get("/api/chains")
def get_chains():
    safe_chains = []
    for c in multichain_tracker.CHAIN_INFO.values():
        item = dict(c)
        item.pop("rpc_url", None)
        item.pop("api_url", None)
        safe_chains.append(item)
    return safe_chains


@app.get("/api/coffee-info")
def get_coffee_info():
    return multichain_tracker.DONATION_INFO


@app.get("/api/protocols")
def get_protocols():
    return multichain_tracker.KNOWN_PROTOCOLS


def _resolve_analysis_input(chain, address):
    # 1. Chain validation
    norm_chain = (chain or "unified").strip().lower()
    if norm_chain not in multichain_tracker.CHAIN_INFO:
        raise HTTPException(status_code=422, detail=f"지원하지 않는 체인입니다: '{chain}'")
    # 2. Address resolution & validation (Pre-RPC rejection)
    resolved_address = (address or "").strip()
    if not resolved_address:
        resolved_address = multichain_tracker.CHAIN_INFO[norm_chain]["default_address"]
    is_valid, err_msg = validate_address_format(norm_chain, resolved_address)
    if not is_valid:
        raise HTTPException(status_code=422, detail=err_msg)
    return norm_chain, resolved_address


@app.get("/api/analysis")
async def get_analysis(
    request: Request,
    chain: str = Query("unified", max_length=20),
    address: str = Query(None, max_length=300),
    force_refresh: bool = Query(False)
):
    if _is_shutting_down:
        raise HTTPException(status_code=503, detail="서버가 재시작 중입니다. 잠시 후 다시 시도해 주세요.")
    metrics["total_requests"] += 1
    now_wall = time.time()
    now_mono = time.monotonic()
    client_ip = get_client_ip(request)
    norm_chain, resolved_address = _resolve_analysis_input(chain, address)
    # 3. Deterministic cache key generation
    cache_key = make_cache_key(norm_chain, resolved_address)
    # 4. Immediate Cache Check
    if not force_refresh:
        cached = get_cached_result(cache_key, now_wall)
        if cached is not None:
            return cached
    # 5. P0 Singleflight Coalescing & Slot Admission Control
    task = inflight_tasks.get(cache_key)
    if task is None:
        # Check queue saturation before consuming rate limit
        if _pending_counter >= MAX_PENDING_ANALYSES:
            metrics["admission_rejected"] += 1
            raise HTTPException(
                status_code=503,
                detail="서버 분석 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요."
            )
        # Rate Limit check for task creator
        if not check_rate_limit(client_ip, now_mono):
            raise HTTPException(
                status_code=429,
                detail="분당 최대 실시간 스캔 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요."
            )
        # Create task and register immediately (NO await before registration!)
        task = asyncio.create_task(_run_with_slot(norm_chain, resolved_address, cache_key))
        inflight_tasks[cache_key] = task
        task.add_done_callback(lambda t, k=cache_key: _cleanup_task(k, t))
    try:
        return copy.deepcopy(await asyncio.shield(task))
    except AdmissionTimeout:
        raise HTTPException(
            status_code=503,
            detail="서버가 혼잡하여 온체인 조회가 지연되었습니다. 잠시 후 다시 시도해 주세요."
        )
    except asyncio.CancelledError:
        # Client disconnected: task safely runs in background to serve followers & populate cache
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("온체인 분석 처리 중 오류 발생: %s", e)
        raise HTTPException(
            status_code=500,
            detail="온체인 조회 중 일시적인 오류가 발생했습니다."
        )


@app.api_route("/ads.txt", methods=["GET", "HEAD"])
def serve_ads():
    ads_file = os.path.join(BASE_DIR, "ads.txt")
    if os.path.exists(ads_file):
        return FileResponse(ads_file, media_type="text/plain")
    return JSONResponse(status_code=404, content={"detail": "ads.txt not found"})


static_dir = os.path.join(BASE_DIR, "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.api_route("/", methods=["GET", "HEAD"])
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "ready", "version": __version__})


if __name__ == "__main__":
    print(f"Starting Production Hardened OnChain Detective Server v{__version__} on port {PORT} (workers=1)...")
    uvicorn.run("server:app", host=HOST, port=PORT, workers=1, reload=False)
