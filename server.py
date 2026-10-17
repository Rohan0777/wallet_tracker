"""
Scalable Production FastAPI Server (v6)
Features:
- Async Non-Blocking Threadpool Offloading + In-Flight Request Coalescing (Singleflight)
- 2-Tier Cache: L1 In-Memory LRU + L2 JSON Disk Cache (Google Drive Desktop & Cloud Container Safe)
- IP-Based Sliding Window Rate Limiter (Protects RPC Quotas against Bots)
- GZip Compression & Environment-Driven Ad/Affiliate Configuration
- Cloud Healthcheck (/healthz) & Dynamic $PORT Binding for Railway / Render / Fly.io
"""

import os
import time
import json
import asyncio
import collections
import uvicorn
from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import multichain_tracker

PORT = int(os.environ.get("PORT", 8088))
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", 900))  # Default 15 mins
MAX_L1_CACHE_ITEMS = int(os.environ.get("MAX_L1_CACHE_ITEMS", 500))
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", 25))
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
L2_CACHE_FILE = os.path.join(BASE_DIR, "data_cache", "l2_analysis_cache.json")
os.makedirs(os.path.dirname(L2_CACHE_FILE), exist_ok=True)

app = FastAPI(
    title="OnChain Detective | Scalable Multi-Chain Asset Scanner",
    version="6.0.0"
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)

ADS_TXT_PATH = os.path.join(BASE_DIR, "ads.txt")

# Production security & cache-control headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    path = request.url.path
    if path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    elif path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

# ---------------------------------------------------------------------
# 2-Tier Cache Engine: L1 In-Memory LRU + L2 JSON Disk Cache
# ---------------------------------------------------------------------
l1_cache = collections.OrderedDict()
inflight_locks = {}
metrics = {
    "started_at": int(time.time()),
    "total_requests": 0,
    "l1_hits": 0,
    "l2_hits": 0,
    "rpc_fetches": 0,
    "rate_limited": 0
}

def set_l1_cache(cache_key: str, data: dict, ts: float):
    l1_cache[cache_key] = {"data": data, "timestamp": ts}
    l1_cache.move_to_end(cache_key)
    while len(l1_cache) > MAX_L1_CACHE_ITEMS:
        l1_cache.popitem(last=False)

def get_cached_result(cache_key: str, now: float):
    if cache_key in l1_cache:
        entry = l1_cache[cache_key]
        if now - entry["timestamp"] < CACHE_TTL_SECONDS:
            l1_cache.move_to_end(cache_key)
            metrics["l1_hits"] += 1
            return entry["data"]
        else:
            del l1_cache[cache_key]

    if os.path.exists(L2_CACHE_FILE):
        try:
            with open(L2_CACHE_FILE, "r", encoding="utf-8") as f:
                disk_store = json.load(f)
            entry = disk_store.get(cache_key)
            if entry and (now - float(entry.get("timestamp", 0)) < CACHE_TTL_SECONDS):
                set_l1_cache(cache_key, entry["data"], float(entry["timestamp"]))
                metrics["l2_hits"] += 1
                return entry["data"]
        except Exception:
            pass
    return None

def save_cached_result(cache_key: str, data: dict, now: float):
    set_l1_cache(cache_key, data, now)
    try:
        disk_store = {}
        if os.path.exists(L2_CACHE_FILE):
            try:
                with open(L2_CACHE_FILE, "r", encoding="utf-8") as f:
                    disk_store = json.load(f)
            except Exception:
                disk_store = {}
        # Prune expired entries
        disk_store = {
            k: v for k, v in disk_store.items()
            if now - float(v.get("timestamp", 0)) < CACHE_TTL_SECONDS
        }
        disk_store[cache_key] = {"data": data, "timestamp": now}
        with open(L2_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(disk_store, f, ensure_ascii=False)
    except Exception:
        pass

# ---------------------------------------------------------------------
# Sliding Window IP Rate Limiter
# ---------------------------------------------------------------------
ip_request_log = collections.defaultdict(collections.deque)

def check_rate_limit(client_ip: str, now: float):
    q = ip_request_log[client_ip]
    while q and (now - q[0] > 60.0):
        q.popleft()
    if len(q) >= RATE_LIMIT_PER_MIN:
        metrics["rate_limited"] += 1
        return False
    q.append(now)
    return True

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return (request.client.host if request.client else "127.0.0.1")

# ---------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------
@app.get("/healthz")
def healthcheck():
    return {
        "status": "ok",
        "uptime_sec": int(time.time()) - metrics["started_at"],
        "cache_ttl_sec": CACHE_TTL_SECONDS,
        "l1_cached_keys": len(l1_cache),
        "env_keys": multichain_tracker.get_active_rpc_status()
    }

@app.get("/api/stats")
def get_server_stats():
    return {
        **metrics,
        "l1_size": len(l1_cache),
        "env_keys": multichain_tracker.get_active_rpc_status()
    }

@app.get("/api/ad-config")
def get_ad_config():
    return {
        "affiliate_url": os.environ.get("LEDGER_AFFILIATE_URL", "https://www.ledger.com"),
        "exchange_referral_url": os.environ.get("EXCHANGE_REFERRAL_URL", "https://accounts.binance.com"),
        "aads_unit_id": os.environ.get("AADS_AD_UNIT_ID", ""),
        "adsense_client_id": os.environ.get("ADSENSE_CLIENT_ID", "")
    }

@app.get("/api/chains")
def get_chains():
    return list(multichain_tracker.CHAIN_INFO.values())

@app.get("/api/coffee-info")
def get_coffee_info():
    return multichain_tracker.DONATION_INFO

@app.get("/api/protocols")
def get_protocols():
    return multichain_tracker.KNOWN_PROTOCOLS

@app.get("/api/analysis")
async def get_analysis(
    request: Request,
    chain: str = Query('solana'),
    address: str = Query(None),
    force_refresh: bool = Query(False)
):
    metrics["total_requests"] += 1
    chain = (chain or 'solana').lower().strip()
    if chain not in multichain_tracker.CHAIN_INFO:
        chain = 'solana'

    resolved_address = (address or '').strip() or multichain_tracker.CHAIN_INFO[chain]['default_address']
    cache_key = f"{chain}:{resolved_address.lower()}"
    now = time.time()

    if not force_refresh:
        cached = get_cached_result(cache_key, now)
        if cached is not None:
            return cached

    lock = inflight_locks.setdefault(cache_key, asyncio.Lock())
    async with lock:
        now = time.time()
        if not force_refresh:
            cached = get_cached_result(cache_key, now)
            if cached is not None:
                return cached

        client_ip = get_client_ip(request)
        if not check_rate_limit(client_ip, now):
            raise HTTPException(
                status_code=429,
                detail="분당 최대 실시간 스캔 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요."
            )

        try:
            metrics["rpc_fetches"] += 1
            data = await asyncio.to_thread(
                multichain_tracker.get_analysis_by_chain,
                chain,
                resolved_address
            )
            save_cached_result(cache_key, data, time.time())
            return data
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            inflight_locks.pop(cache_key, None)

static_dir = os.path.join(BASE_DIR, "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse({"status": "ready", "version": "6.0.0"})

if __name__ == '__main__':
    workers = int(os.environ.get("WEB_CONCURRENCY", 1))
    print(f"Starting Scalable OnChain Detective Server on http://0.0.0.0:{PORT} (workers={workers}, cache_ttl={CACHE_TTL_SECONDS}s) ...")
    print("Loaded .env API Keys Status:", multichain_tracker.get_active_rpc_status())
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, workers=workers, reload=False)
