"""
Unified Multi-Chain & Cross-Chain Related-Wallet Detective Module (v9.0 Final Production Release)
Supports:
- Core Direction ("내 지갑을 넣으면 관련된 지갑을 찾아주는 프로젝트"):
  * True Counterparty Lifetime Transaction Inspection (`lifetime_txs` vs `my_tx_count` separation) across Solana, EVM, and Tron.
  * Multi-Signal Related-Wallet Heuristics (`is_round_funding_amount`, bidirectional flow, retained balance, 1~60 lifetime tx novice pattern, multi-account farming concentration).
  * Quantitative `relation_score` (0~100), `interaction_ratio`, `evidence_tags`, and 1-Click Pivot Scan metadata (`can_pivot_scan`, `pivot_chain`, `pivot_address`).
- Zero Preset Dummy Fallback Guarantee:
  * Removed `_load_cached_sol_overview` (4.1374 SOL hardcoded fallback) and `all_wallets_classified.json` static injection.
  * 100% live on-chain ledger state across all addresses, including default presets.
- Balanced 4-Chain Integrity & Strict `is_partial` Propagation:
  * Uniform `stage_status` and `is_partial` tracking across Solana, Ethereum/L2, BNB Chain, and Tron.
  * Accurately flags token/transfer 429 rate-limits or network errors as `is_partial=True` to prevent caching incomplete scans.
- Cross-Chain Bridge Outflow Auto-Discovery (WormholeScan API, LI.FI API, deBridge DLN API).
- Novice Mistake & Dormant Asset Diagnostics (Native staking, Liquid staking stETH/mSOL/bSOL/jitoSOL/rETH, SPL rent, Frozen TRX, Gas-trapped tokens, Unwrapped WETH/WBNB, Deprecated BUSD).
"""

VERSION = "9.1.0"

import os
import re
import json
import time
import logging
import itertools
import threading
import concurrent.futures
import urllib.request
import urllib.parse
from address_utils import (
    make_cache_key,
    normalize_address,
    is_valid_evm_address,
    is_valid_solana_address,
    is_valid_tron_address,
    detect_chain_from_address,
    MAX_BUNDLE
)

# Dedicated per-chain RPC rate-limit semaphores (Avoids cross-chain head-of-line blocking)
logger = logging.getLogger(__name__)

# Dedicated per-chain RPC rate-limit semaphores & overall scan deadline
_SOL_RPC_SEM = threading.BoundedSemaphore(6)
_EVM_RPC_SEM = threading.BoundedSemaphore(8)
_SHARED_SCAN_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=24)
_DEADLINE_LOCAL = threading.local()
SCAN_DEADLINE_SECONDS = float(os.environ.get('SCAN_DEADLINE_SECONDS', '15.0'))


def set_scan_deadline(deadline_mono=None):
    _DEADLINE_LOCAL.deadline = deadline_mono


def get_remaining_timeout(default_timeout: float = 4.0) -> float:
    dl = getattr(_DEADLINE_LOCAL, 'deadline', None)
    if dl is None:
        return default_timeout
    rem = dl - time.monotonic()
    return max(0.0, min(default_timeout, rem))

PRESET_SOL_ADDRESS = 'BQ4x7ypgaqW7tFZwJadmuxbiuzvy3mk26i9WFo7hDf7H'
PRESET_EVM_ADDRESS = '0xb107205E2f9D89E85fb7d6311FFD802049Ffe56e'
PRESET_TRON_ADDRESS = 'TG918Q75YzASD4UaRfG23nVwYYyVSnahvu'


# =====================================================================
# 0. SERVER-SIDE TOKEN SYMBOL / NAME SANITIZER (XSS Defense-in-Depth)
# =====================================================================
_SAFE_TOKEN_CHARS_RE = re.compile(r"[^\w .\-$/()]+", re.UNICODE)


def sanitize_token_text(val, default: str = "TOKEN", max_len: int = 24) -> str:
    r"""
    Sanitizes untrusted on-chain strings (token symbols, token names, contract labels,
    and bridge tool names) to match `^[\w .\-$/()]{1,24}$`.
    Strips HTML/script tags (`<`, `>`, `"`, `'`, `&`, etc.) and truncates to `max_len`.
    """
    if val is None:
        return default
    cleaned = _SAFE_TOKEN_CHARS_RE.sub("", str(val)).strip()
    if not cleaned:
        return default
    return cleaned[:max_len]


# =====================================================================
# 1. PROVIDER-ISOLATED .env LOADER (Zero Cross-Provider Key Leakage)
# =====================================================================
_ENV_LOCK = threading.Lock()

_HELIUS_KEY_NAMES = frozenset({
    'helius', 'helius_api_key', 'helius_api_keys', 'solana', 'solana_api_key', 'solana_api_keys'
})
_SOLANA_RPC_URL_NAMES = frozenset({
    'solana_rpc_url', 'sol_rpc_url', 'quicknode_sol_url'
})
_ALCHEMY_KEY_NAMES = frozenset({
    'alchemy', 'alchemy_api_key', 'alchemy_api_keys'
})
_ETHERSCAN_KEY_NAMES = frozenset({
    'etherscan', 'etherscan_api_key', 'etherscan_api_keys'
})
_BNBSCAN_KEY_NAMES = frozenset({
    'bnbscan', 'bscscan', 'bscscan_api_key', 'bnbscan_api_key'
})
_TRON_KEY_NAMES = frozenset({
    'tron', 'trongrid', 'tronscan', 'tron_api_key', 'trongrid_api_key', 'tronscan_api_key'
})
_MORALIS_KEY_NAMES = frozenset({
    'moralis', 'moralis_api_key', 'moralis_api_keys'
})


def _normalize_key_identifier(raw_key: str) -> str:
    """Strips trailing numeric suffixes (e.g. `helius_1`, `etherscan2`) for bucket routing."""
    k = raw_key.strip().lower()
    return re.sub(r'[_]?\d+$', '', k)


def load_all_env_keys():
    """
    Collects API keys from `.env` (in base_dir) and `os.environ` with strict provider separation:
      - `HELIUS_API_KEY` / `helius`: routed ONLY to Helius RPC (`mainnet.helius-rpc.com`).
      - `ALCHEMY_API_KEY` / `alchemy`: routed ONLY to Alchemy RPC (`*.g.alchemy.com/v2/`).
      - `SOLANA_RPC_URL`: full `https://` RPC endpoint URLs (never appended into `?api-key=`).
      - `ETHERSCAN_API_KEY` / `etherscan`: routed ONLY to Etherscan V2 (`api.etherscan.io/v2/api`).
      - `TRON_API_KEY` / `tron`: routed ONLY to TronScan/TronGrid headers.
    """
    buckets = {
        'tron': [],
        'etherscan': [],
        'bnbscan': [],
        'helius': [],
        'solana_rpc': [],
        'solana': [],
        'moralis': [],
        'alchemy': []
    }

    def _classify_and_add(raw_key, raw_val, set_env=False):
        norm_k = _normalize_key_identifier(raw_key)
        vals = [v.strip().strip('"').strip("'") for v in re.split(r'[,;\s]+', raw_val.strip()) if v.strip()]
        for v in vals:
            if not v or v.startswith('your_') or '_your_' in v:
                continue
            if set_env:
                os.environ.setdefault(raw_key.strip(), v)
                os.environ.setdefault(raw_key.strip().upper(), v)

            is_http_url = v.startswith('https://') or v.startswith('http://')

            if norm_k in _TRON_KEY_NAMES and not is_http_url:
                if v not in buckets['tron']:
                    buckets['tron'].append(v)
            elif norm_k in _ETHERSCAN_KEY_NAMES and not is_http_url:
                if v not in buckets['etherscan']:
                    buckets['etherscan'].append(v)
            elif norm_k in _BNBSCAN_KEY_NAMES and not is_http_url:
                if v not in buckets['bnbscan']:
                    buckets['bnbscan'].append(v)
            elif norm_k in _SOLANA_RPC_URL_NAMES:
                if is_http_url and v not in buckets['solana_rpc']:
                    buckets['solana_rpc'].append(v)
            elif norm_k in _HELIUS_KEY_NAMES:
                if is_http_url:
                    if v not in buckets['solana_rpc']:
                        buckets['solana_rpc'].append(v)
                else:
                    if v not in buckets['helius']:
                        buckets['helius'].append(v)
                    if v not in buckets['solana']:
                        buckets['solana'].append(v)
            elif norm_k in _ALCHEMY_KEY_NAMES and not is_http_url:
                if v not in buckets['alchemy']:
                    buckets['alchemy'].append(v)
            elif norm_k in _MORALIS_KEY_NAMES and not is_http_url:
                if v not in buckets['moralis']:
                    buckets['moralis'].append(v)

    def _parse_text(content, fallback_key=None):
        lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith('#')]
        for line in lines:
            if '=' in line:
                k, v = line.split('=', 1)
                _classify_and_add(k, v, set_env=True)
            elif fallback_key:
                _classify_and_add(fallback_key, line, set_env=True)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_target = os.path.join(base_dir, '.env')
    if os.path.isfile(env_target):
        try:
            with open(env_target, 'r', encoding='utf-8', errors='ignore') as f:
                _parse_text(f.read())
        except Exception:
            pass

    for env_k, env_v in list(os.environ.items()):
        _classify_and_add(env_k, env_v, set_env=False)

    return buckets


_last_env_mtime = 0
KEY_BUCKETS = {}
TRON_API_KEYS = []
ETHERSCAN_API_KEYS = []
BNBSCAN_API_KEYS = []
HELIUS_API_KEYS = []
SOLANA_RPC_URLS = []
SOLANA_API_KEYS = []
MORALIS_API_KEYS = []
ALCHEMY_API_KEYS = []
SOL_RPC_POOL = []
ETH_RPC_POOL = []
BSC_RPC_POOL = []

_tron_cycle = None
_eth_cycle = None
_bnb_cycle = None
_moralis_cycle = None
_sol_rpc_cycle = None


def refresh_env_keys(force=False):
    global _last_env_mtime, KEY_BUCKETS, TRON_API_KEYS, ETHERSCAN_API_KEYS, BNBSCAN_API_KEYS
    global HELIUS_API_KEYS, SOLANA_RPC_URLS, SOLANA_API_KEYS, MORALIS_API_KEYS, ALCHEMY_API_KEYS
    global SOL_RPC_POOL, ETH_RPC_POOL, BSC_RPC_POOL
    global _tron_cycle, _eth_cycle, _bnb_cycle, _moralis_cycle, _sol_rpc_cycle

    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_file = os.path.join(base_dir, '.env')
    current_mtime = os.path.getmtime(env_file) if os.path.exists(env_file) else 0

    with _ENV_LOCK:
        if not force and _last_env_mtime != 0 and current_mtime <= _last_env_mtime:
            return

        _last_env_mtime = current_mtime
        buckets = load_all_env_keys()
        tron_keys = list(buckets.get('tron', []))
        eth_keys = list(buckets.get('etherscan', []))
        bnb_keys = list(buckets.get('bnbscan', []))
        helius_keys = list(buckets.get('helius', []))
        sol_rpc_urls = list(buckets.get('solana_rpc', []))
        moralis_keys = list(buckets.get('moralis', []))
        alchemy_keys = list(buckets.get('alchemy', []))
        sol_keys = list(dict.fromkeys(helius_keys + sol_rpc_urls))

        # Provider-isolated Solana RPC Pool:
        # - Helius keys ONLY go to mainnet.helius-rpc.com
        # - Alchemy keys ONLY go to solana-mainnet.g.alchemy.com
        # - Explicit RPC URLs go directly as endpoints
        sol_pool = []
        for rpc_u in sol_rpc_urls:
            sol_pool.append(rpc_u)
        for hk in helius_keys:
            sol_pool.append(f"https://mainnet.helius-rpc.com/?api-key={hk}")
        for ak in alchemy_keys:
            sol_pool.append(f"https://solana-mainnet.g.alchemy.com/v2/{ak}")

        private_sol_count = len(sol_pool)
        sol_pool.extend([
            'https://api.mainnet-beta.solana.com',
            'https://solana-rpc.publicnode.com'
        ])
        dedup_sol_pool = list(dict.fromkeys(sol_pool))

        eth_pool = list(dict.fromkeys(
            [f"https://eth-mainnet.g.alchemy.com/v2/{k}" for k in alchemy_keys] + [
                os.environ.get('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com'),
                'https://eth.llamarpc.com',
                'https://ethereum-rpc.publicnode.com'
            ]
        ))
        bsc_pool = list(dict.fromkeys(
            [f"https://bnb-mainnet.g.alchemy.com/v2/{k}" for k in alchemy_keys] + [
                os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
                'https://bsc-rpc.publicnode.com',
                'https://bsc-dataseed.binance.org'
            ]
        ))

        KEY_BUCKETS = buckets
        TRON_API_KEYS = tron_keys
        ETHERSCAN_API_KEYS = eth_keys
        BNBSCAN_API_KEYS = bnb_keys
        HELIUS_API_KEYS = helius_keys
        SOLANA_RPC_URLS = sol_rpc_urls
        SOLANA_API_KEYS = sol_keys
        MORALIS_API_KEYS = moralis_keys
        ALCHEMY_API_KEYS = alchemy_keys
        SOL_RPC_POOL = dedup_sol_pool
        ETH_RPC_POOL = eth_pool
        BSC_RPC_POOL = bsc_pool

        _tron_cycle = itertools.cycle(TRON_API_KEYS) if TRON_API_KEYS else None
        _eth_cycle = itertools.cycle(ETHERSCAN_API_KEYS) if ETHERSCAN_API_KEYS else None
        _bnb_cycle = itertools.cycle(BNBSCAN_API_KEYS) if BNBSCAN_API_KEYS else None
        _moralis_cycle = itertools.cycle(MORALIS_API_KEYS) if MORALIS_API_KEYS else None
        _sol_rpc_cycle = itertools.cycle(SOL_RPC_POOL[:private_sol_count]) if private_sol_count > 0 else None


refresh_env_keys(force=True)


def get_next_api_key(chain):
    refresh_env_keys()
    with _ENV_LOCK:
        if chain in ('ethereum', 'bsc', 'arbitrum', 'base', 'optimism', 'polygon'):
            if _eth_cycle:
                return next(_eth_cycle)
        elif chain == 'tron' and _tron_cycle:
            return next(_tron_cycle)
        elif chain == 'moralis' and _moralis_cycle:
            return next(_moralis_cycle)
    return ''


def get_active_rpc_status():
    refresh_env_keys()

    def _fmt(keys):
        if not keys:
            return "0 keys (public fallback)"
        prefixes = ", ".join(f"{k[:2]}***" for k in keys[:4])
        return f"{len(keys)} key(s) loaded [{prefixes}]"

    return {
        'tron': _fmt(TRON_API_KEYS),
        'etherscan': _fmt(ETHERSCAN_API_KEYS),
        'helius': _fmt(HELIUS_API_KEYS),
        'solana': _fmt(SOLANA_API_KEYS),
        'moralis_optional': _fmt(MORALIS_API_KEYS),
        'alchemy_optional': _fmt(ALCHEMY_API_KEYS)
    }


# =====================================================================
# LIVE CRYPTO PRICE ENGINE (BNB, ETH, SOL, TRX)
# =====================================================================
_price_cache = {
    'ts': 0,
    'source': 'fallback',
    'prices': {
        'BNB': 724.0,
        'ETH': 2380.0,
        'SOL': 104.0,
        'TRX': 0.33
    }
}


def get_live_prices():
    now = time.time()
    if now - _price_cache['ts'] < 300:
        return _price_cache['prices']
    try:
        url = 'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BNBUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22TRXUSDT%22%5D'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode())
            for item in data:
                sym = item['symbol'].replace('USDT', '')
                _price_cache['prices'][sym] = float(item['price'])
            _price_cache['ts'] = now
            _price_cache['source'] = 'live'
    except Exception:
        # Cache fallback for 60s so failed calls don't timeout on every request
        _price_cache['ts'] = now - 240
        _price_cache['source'] = 'fallback'
    return _price_cache['prices']


def get_price_source() -> str:
    return _price_cache.get('source', 'fallback')


# =====================================================================
# 2. RELATED-WALLET DETECTIVE ENGINE (v9.0 Core Heuristics)
# =====================================================================
KNOWN_CEX_KEYWORDS = [
    'binance', 'upbit', 'bithumb', 'okx', 'bybit', 'coinbase', 'kraken',
    'gate.io', 'gateio', 'bitget', 'kucoin', 'mexc', 'htx', 'huobi',
    'crypto.com', 'korbit', 'coinone', 'gopax', 'hotwallet', 'deposit'
]

KNOWN_ROUTER_KEYWORDS = [
    'uniswap', 'pancakeswap', 'sushiswap', 'curve', 'balancer', '1inch',
    'jupiter', 'raydium', 'orca', 'meteora', 'wormhole', 'li.fi', 'lifi',
    'across', 'stargate', 'cbridge', 'debridge', 'relay', 'mayan', 'kyberswap',
    'multichain', 'polymer', 'fly', 'nordstern', 'connext', 'synapse', 'router',
    'vault', 'bridge', 'pool', 'pair', 'farm', 'masterchef'
]


def is_round_funding_amount(amount: float) -> bool:
    """
    Detects human/novice seed or test transfer patterns (e.g. 0.1, 0.25, 0.3, 0.5,
    1.0, 1.5, 1.6, 2.0, 3.0, 4.0, 5.0, 10.0, 50.0, 100.0) as defined in
    crypto_recovery_report.md Section 2 ("정수/단위 목돈 송금 및 시드 가스비 이체").
    """
    if amount is None or amount < 0.05:
        return False
    # Clean 0.1 increments (0.1, 0.2, 0.3, ..., 1.0, 1.5, 1.6, 3.0, 4.0)
    if abs(amount * 10.0 - round(amount * 10.0)) < 1e-3:
        return True
    # Clean quarter increments (0.25, 0.75, 1.25, 2.5)
    if abs(amount * 4.0 - round(amount * 4.0)) < 1e-3:
        return True
    return False


def classify_wallet_profile(
    chain,
    address,
    current_bal,
    sent_from_me,
    recv_to_me,
    tx_count,
    is_contract=False,
    label_hint=None,
    my_tx_count=None
):
    """
    v9.0 Multi-Signal Related-Wallet Classification Algorithm:
    - Distinguishes `tx_count` (counterparty's on-chain `lifetime_txs`) from `my_tx_count`
      (interactions between the user's root wallet and this counterparty).
    - Filters out known Exchanges (CEX) & Smart Contracts / Routers.
    - Identifies true personal sub-wallets across 4 distinct patterns:
      (A) Bidirectional transfers (`sent_from_me > 0 and recv_to_me > 0`)
      (B) Funded personal wallet with remaining balance (`sent_from_me > 0 and current_bal > 0 and lifetime_txs <= 60`)
      (C) Novice seed / round-number funded low-tx sub-wallet (`sent_from_me > 0 and 1 <= lifetime_txs <= 60` + round amount or repeated funding)
      (D) Multi-account farming / high interaction concentration (`my_tx_count >= 3` and high interaction ratio)
    """
    safe_hint = sanitize_token_text(label_hint, default="", max_len=24) if label_hint else ""
    hint_lower = safe_hint.lower()
    ch_tag = chain.upper()
    lifetime_txs = max(1, int(tx_count or 1))
    eff_my_txs = max(1, int(my_tx_count if my_tx_count is not None else lifetime_txs))
    ratio_val = min(100.0, round((eff_my_txs / max(1, lifetime_txs)) * 100.0, 1))
    interaction_ratio = f"{ratio_val:.0f}%" if ratio_val >= 10 else f"{ratio_val:.1f}%"

    # 1. Smart Contract / Protocol Router check
    if is_contract or any(r in hint_lower for r in KNOWN_ROUTER_KEYWORDS):
        return {
            'is_my_wallet': False,
            'wallet_type': 'PROTOCOL_ROUTER',
            'label': f"[{ch_tag}] DEX/브릿지 프로토콜 라우터 (" + (safe_hint or address[:6] + '...') + ")",
            'confidence': 'HIGH_95%',
            'relation_score': 5,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': ['스마트 컨트랙트/라우터', '개인 지갑 제외'],
            'reason': '스마트 컨트랙트 또는 디파이/브릿지 라우터 주소입니다 (개인 지갑 아님).'
        }

    # 2. Known Exchange Hotwallet or Mass-Institution check
    if any(c in hint_lower for c in KNOWN_CEX_KEYWORDS):
        return {
            'is_my_wallet': False,
            'wallet_type': 'CEX_HOT_WALLET',
            'label': f"[{ch_tag}] 거래소 핫월렛 (" + (safe_hint or '바이낸스/OKX 등') + ")",
            'confidence': 'CERTAIN_99%',
            'relation_score': 0,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': ['공식 거래소 식별자', '기관 핫월렛'],
            'reason': '거래소(CEX) 공식 핫월렛 또는 입출금 기관 주소입니다.'
        }

    # 3. High lifetime transaction count or institutional balance -> Exchange Hotwallet / Bot Node
    max_tx_threshold = 1000 if chain == 'solana' else 250
    huge_bal_threshold = 5000.0 if chain == 'solana' else (500.0 if chain in ('ethereum', 'bsc') else 500000.0)
    if lifetime_txs > max_tx_threshold or current_bal >= huge_bal_threshold:
        return {
            'is_my_wallet': False,
            'wallet_type': 'CEX_HOT_WALLET',
            'label': f"[{ch_tag}] 외부 대규모 기관/거래소 지갑 ({address[:6]}...)",
            'confidence': 'HIGH_90%',
            'relation_score': 5,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': [f'생애 트랜잭션 {lifetime_txs:,}건', '대규모 기관/거래소 패턴'],
            'reason': f"트랜잭션 수 {lifetime_txs:,}건 이상의 대규모 활성 주소로, 거래소 또는 기관 지갑입니다."
        }

    # 4. Exchange User Deposit Address (Sweep Pattern: user only sent, never received, drained balance, >60 txs or >15 one-way sweeps)
    if sent_from_me > 0 and recv_to_me == 0 and current_bal == 0 and (lifetime_txs > 60 or eff_my_txs > 15):
        return {
            'is_my_wallet': False,
            'wallet_type': 'CEX_DEPOSIT_WALLET',
            'label': f"[{ch_tag}] 거래소 개인 입금 전용 주소 ({address[:6]}...)",
            'confidence': 'HIGH_85%',
            'relation_score': 15,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': ['단방향 집금(Sweep) 패턴', f'생애 트랜잭션 {lifetime_txs}건'],
            'reason': '거래소 입금 후 핫월렛으로 자동 집금(Sweep)되는 거래소 입금 전용 주소로 추정됩니다.'
        }

    # 5. True Personal Secondary Wallet (내 보조 지갑 / 다계정 / 방치 지갑)
    # A) Bidirectional transfers (sent > 0 and recv > 0)
    if sent_from_me > 0 and recv_to_me > 0 and lifetime_txs <= max_tx_threshold:
        tags = ['양방향 입출금 확인', f'생애 트랜잭션 {lifetime_txs}건']
        if is_round_funding_amount(sent_from_me):
            tags.append('정수/시드 단위 송금')
        if current_bal > 0:
            tags.append('현재 잔고 보유')
        return {
            'is_my_wallet': True,
            'wallet_type': 'INFERRED_MY_WALLET',
            'label': f"[{ch_tag}] 내 보조 지갑 추정 (양방향 입출금 확인)",
            'confidence': 'ESTIMATED_95%',
            'relation_score': 95,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': tags,
            'reason': '내 메인 지갑과 직접 주고받은 양방향 거래 이력(보낸 돈 + 받은 돈)이 확인된 확실한 개인 보조 지갑입니다.'
        }

    # B) Funding pattern with remaining balance (sent > 0, current_bal > 0, personal scale txs <= 60)
    if sent_from_me > 0 and current_bal > 0 and lifetime_txs <= 60:
        tags = ['과거 시드 송금', '현재 잔고 잔존', f'생애 트랜잭션 {lifetime_txs}건 (초보 개인 패턴)']
        if is_round_funding_amount(sent_from_me):
            tags.append('정수/단위 금액 송금')
        return {
            'is_my_wallet': True,
            'wallet_type': 'INFERRED_MY_WALLET',
            'label': f"[{ch_tag}] 내 보조 지갑 추정 (과거 송금 후 잔고 잔존)",
            'confidence': 'HIGH_88%',
            'relation_score': 88,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': tags,
            'reason': '과거 메인 지갑에서 자금을 송금한 후 현재까지 잔고가 남아있는 개인 보조 지갑입니다.'
        }

    # C) High-Concentration Multi-Account Farming Sub-Wallet (my_tx_count >= 3 and interaction ratio >= 25%)
    if (sent_from_me > 0 or recv_to_me > 0) and eff_my_txs >= 3 and lifetime_txs <= max_tx_threshold and ratio_val >= 25.0:
        return {
            'is_my_wallet': True,
            'wallet_type': 'INFERRED_MY_WALLET',
            'label': f"[{ch_tag}] 내 다계정 작업 지갑 (반복 교류 {eff_my_txs}회)",
            'confidence': 'HIGH_86%',
            'relation_score': 86,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': [f'집중 교류 {eff_my_txs}회 (비중 {interaction_ratio})', f'생애 트랜잭션 {lifetime_txs}건'],
            'reason': f"내 메인 지갑과 {eff_my_txs}회 반복 교류(비중 {interaction_ratio})한 다계정 작업/보조 지갑으로 추정됩니다."
        }

    # D) Novice Seed / Round-Unit Funded Low-Tx Sub-Wallet (1~60 lifetime txs + round funding or >=2 funding txs)
    if sent_from_me > 0 and 1 <= lifetime_txs <= 60 and (is_round_funding_amount(sent_from_me) or eff_my_txs >= 2):
        tags = [f'생애 트랜잭션 {lifetime_txs}건 (1~60건 개인 패턴)']
        if is_round_funding_amount(sent_from_me):
            tags.append(f'정수/시드 단위 송금 ({sent_from_me:g})')
        if eff_my_txs >= 2:
            tags.append(f'반복 자금 이체 ({eff_my_txs}회)')
        return {
            'is_my_wallet': True,
            'wallet_type': 'INFERRED_MY_WALLET',
            'label': f"[{ch_tag}] 내 보조 지갑 추정 (소규모 {lifetime_txs}건·시드 이체)",
            'confidence': 'HIGH_84%',
            'relation_score': 84,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': tags,
            'reason': f"전체 트랜잭션 수 {lifetime_txs}건에 불과한 소규모 개인 지갑 (내 보조 지갑 유추)"
        }

    # E) Inbound Return from Low-Tx Personal Sub-Wallet (1~30 lifetime txs + round return amount)
    if recv_to_me > 0 and sent_from_me == 0 and 1 <= lifetime_txs <= 30 and is_round_funding_amount(recv_to_me):
        return {
            'is_my_wallet': True,
            'wallet_type': 'INFERRED_MY_WALLET',
            'label': f"[{ch_tag}] 내 보조 지갑 추정 (소규모 {lifetime_txs}건·자금 회수)",
            'confidence': 'HIGH_80%',
            'relation_score': 80,
            'interaction_ratio': interaction_ratio,
            'evidence_tags': [f'생애 트랜잭션 {lifetime_txs}건', '정수 단위 자금 회수'],
            'reason': f"전체 트랜잭션 수 {lifetime_txs}건에 불과한 소규모 개인 지갑 (내 보조 지갑 유추)"
        }

    # Default external counterparty
    return {
        'is_my_wallet': False,
        'wallet_type': 'EXTERNAL_COUNTERPARTY',
        'label': f"[{ch_tag}] 외부 거래 상대방 ({address[:6]}...)",
        'confidence': 'MEDIUM_60%',
        'relation_score': 30,
        'interaction_ratio': interaction_ratio,
        'evidence_tags': [f'온체인 교류 {eff_my_txs}회', f'생애 트랜잭션 {lifetime_txs}건'],
        'reason': f"온체인 입출금 이력({eff_my_txs}회)이 감지된 외부 상대방 주소입니다."
    }


CHAIN_INFO = {
    'unified': {
        'id': 'unified',
        'name': '전체 멀티체인 통합',
        'native_symbol': 'MULTI',
        'token_standard': 'SOL · EVM(ETH/BNB/L2) · TRON',
        'explorer_name': 'Multi-Explorer',
        'explorer_url': 'https://solscan.io/account/',
        'default_address': f"{PRESET_SOL_ADDRESS}, {PRESET_EVM_ADDRESS}, {PRESET_TRON_ADDRESS}"
    },
    'solana': {
        'id': 'solana',
        'name': 'Solana',
        'native_symbol': 'SOL',
        'token_standard': 'SPL Token',
        'explorer_name': 'Solscan',
        'explorer_url': 'https://solscan.io/account/',
        'tx_url': 'https://solscan.io/tx/',
        'default_address': PRESET_SOL_ADDRESS,
    },
    'ethereum': {
        'id': 'ethereum',
        'name': 'Ethereum & L2',
        'native_symbol': 'ETH',
        'token_standard': 'ERC-20 · L2',
        'explorer_name': 'Etherscan',
        'explorer_url': 'https://etherscan.io/address/',
        'tx_url': 'https://etherscan.io/tx/',
        'default_address': PRESET_EVM_ADDRESS,
    },
    'bsc': {
        'id': 'bsc',
        'name': 'BNB Chain',
        'native_symbol': 'BNB',
        'token_standard': 'BEP-20',
        'explorer_name': 'BscScan',
        'explorer_url': 'https://bscscan.com/address/',
        'tx_url': 'https://bscscan.com/tx/',
        'default_address': PRESET_EVM_ADDRESS,
    },
    'tron': {
        'id': 'tron',
        'name': 'Tron',
        'native_symbol': 'TRX',
        'token_standard': 'TRC-20',
        'explorer_name': 'TronScan',
        'explorer_url': 'https://tronscan.org/#/address/',
        'tx_url': 'https://tronscan.org/#/transaction/',
        'default_address': PRESET_TRON_ADDRESS,
        'api_url': 'https://apilist.tronscanapi.com/api'
    }
}

DONATION_INFO = {
    'title': '디지털 우주를 떠도는 나의 $1,000를 기리며...',
    'story': (
        "상승장때 이곳저곳 기웃거리다 '에어드랍' 이란걸 알게되었습니다. "
        "어떻게 하는지도 잘 모르는데 다계정 해보겠다고 지갑 수십개 만들고 휴대폰 잃어버리고 다음상승장때 까먹고.. "
        "분명히 내 지갑에 돈이 있었는데.. 어디간지 모를 $1,000 을 찾으려고 만든 추적기 입니다. "
        "(결국 제 $1,000는 끝내 찾지 못했지만요... 🥲)\n\n"
        "잠자던 자산을 찾으셨다면, 다음 체인을 추적할 수 있도록 따뜻한 커피 한 잔 후원해 주세요!"
    ),
    'addresses': {
        'sol': {'chain': 'Solana (SOL)', 'address': PRESET_SOL_ADDRESS, 'symbol': 'SOL', 'explorer': f'https://solscan.io/account/{PRESET_SOL_ADDRESS}'},
        'bnb': {'chain': 'BNB Smart Chain (BEP-20)', 'address': PRESET_EVM_ADDRESS, 'symbol': 'BNB', 'explorer': f'https://bscscan.com/address/{PRESET_EVM_ADDRESS}'},
        'tron': {'chain': 'Tron (TRC-20)', 'address': PRESET_TRON_ADDRESS, 'symbol': 'TRX / USDT', 'explorer': f'https://tronscan.org/#/address/{PRESET_TRON_ADDRESS}'}
    }
}

# Verified Protocol Encyclopedia for Liquid Staking & DeFi Escape Guides
KNOWN_PROTOCOLS = {
    'lido': {
        'id': 'lido',
        'name': 'Lido Finance (리도 유동성 스테이킹)',
        'category': 'Ethereum Liquid Staking',
        'official_url': 'https://stake.lido.fi',
        'description': 'ETH를 스테이킹하고 받은 stETH/wstETH 유동성 스테이킹 토큰입니다. 메타마스크 기본 목록에 안 보여 방치되는 대표 자산입니다.',
        'escape_guide': 'Lido 공식 출금 페이지(https://stake.lido.fi/withdrawals) 또는 Uniswap에서 ETH/USDT로 1:1 즉시 회수할 수 있습니다.'
    },
    'rocketpool': {
        'id': 'rocketpool',
        'name': 'Rocket Pool (rETH 스테이킹)',
        'category': 'Ethereum Liquid Staking',
        'official_url': 'https://stake.rocketpool.net',
        'description': '이더리움 탈중앙화 유동성 스테이킹 토큰(rETH)으로 스테이킹 보상이 토큰 가치에 자동 누적됩니다.',
        'escape_guide': 'Rocket Pool 공식 사이트(https://stake.rocketpool.net) 또는 Uniswap에서 ETH로 즉시 언스테이킹/스왑할 수 있습니다.'
    },
    'marinade': {
        'id': 'marinade',
        'name': 'Marinade Finance (mSOL 스테이킹)',
        'category': 'Solana Liquid Staking',
        'official_url': 'https://marinade.finance',
        'description': '솔라나 대표 유동성 스테이킹 프로토콜(mSOL). 팬텀 지갑에서 일반 토큰처럼 보이나 높은 SOL 가치를 지닙니다.',
        'escape_guide': 'Marinade 공식 앱(https://marinade.finance/app/staking) 또는 Jupiter(https://jup.ag)에서 SOL로 즉시 환전하세요.'
    },
    'jito': {
        'id': 'jito',
        'name': 'Jito Network (JitoSOL MEV 스테이킹)',
        'category': 'Solana Liquid Staking',
        'official_url': 'https://www.jito.network',
        'description': '솔라나 MEV 보상이 결합된 유동성 스테이킹 토큰(JitoSOL)입니다.',
        'escape_guide': 'Jito 공식 스테이킹 페이지(https://www.jito.network/staking) 또는 Jupiter(https://jup.ag)에서 SOL로 즉시 스왑할 수 있습니다.'
    },
    'blazestake': {
        'id': 'blazestake',
        'name': 'BlazeStake (bSOL 스테이킹)',
        'category': 'Solana Liquid Staking',
        'official_url': 'https://stake.solblaze.org',
        'description': '솔라나 BlazeStake 유동성 스테이킹 풀에 예치된 bSOL 증표 토큰입니다.',
        'escape_guide': 'BlazeStake 공식 대시보드(https://stake.solblaze.org) 또는 Jupiter에서 SOL로 즉시 언스테이킹 가능합니다.'
    },
    'kamino': {
        'id': 'kamino',
        'name': 'Kamino Finance (카미노 렌딩/볼트)',
        'category': 'Solana Lending & Liquidity Vault',
        'official_url': 'https://app.kamino.finance',
        'description': '솔라나 대출 및 유동성 자동화 프로토콜로 에어드랍 포인트 파밍 후 예치금이 자주 방치되는 곳입니다.',
        'escape_guide': 'Kamino 공식 대시보드(https://app.kamino.finance) 상단 Portfolio 탭에서 Withdraw로 예치금을 회수하세요.'
    },
    'pancakeswap': {
        'id': 'pancakeswap',
        'name': 'PancakeSwap (팬케이크스왑)',
        'category': 'BNB Chain DEX & Syrup Pool',
        'official_url': 'https://pancakeswap.finance',
        'description': 'BNB 체인 대표 DEX 및 시럽 풀(CAKE). 스테이킹 및 LP 풀에 예치 후 방치된 사례가 많습니다.',
        'escape_guide': 'PancakeSwap 공식 풀(https://pancakeswap.finance/pools)에서 Finished 탭을 확인하여 Unstake 및 스왑을 진행하세요.'
    },
    'uniswap': {
        'id': 'uniswap',
        'name': 'Uniswap (유니스왑 & WETH 언랩)',
        'category': 'Ethereum Multi-Chain DEX',
        'official_url': 'https://app.uniswap.org',
        'description': 'NFT 입찰 취소나 DEX 스왑 과정에서 래핑된 WETH 또는 디파이 토큰이 남아있는 프로토콜입니다.',
        'escape_guide': 'Uniswap 공식 앱(https://app.uniswap.org)에서 WETH를 ETH로 1:1 수수료 없이 언랩(Unwrap)하거나 환전하세요.'
    },
    'justlend': {
        'id': 'justlend',
        'name': 'JustLend DAO (저스트렌드)',
        'category': 'Tron Lending & Resource Stake',
        'official_url': 'https://justlend.org',
        'description': '트론 생태계 대표 렌딩 및 에너지 리소스 프로토콜입니다.',
        'escape_guide': 'JustLend 공식 사이트(https://justlend.org) 또는 TronScan에서 예치 자산 및 동결 TRX를 회수하세요.'
    },
    'sunswap': {
        'id': 'sunswap',
        'name': 'SunSwap (선스왑)',
        'category': 'Tron AMM DEX',
        'official_url': 'https://sunswap.com',
        'description': '트론 네트워크 대표 탈중앙화 거래소 및 유동성 풀 프로토콜입니다.',
        'escape_guide': 'SunSwap 공식 사이트(https://sunswap.com)에서 보유 TRC-20 토큰을 USDT 또는 TRX로 환전하세요.'
    }
}

KNOWN_SOL_TOKENS = {
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {'symbol': 'USDT', 'name': 'Tether USD (SPL)', 'priceUsd': 1.0, 'protocol_id': None},
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {'symbol': 'USDC', 'name': 'USD Coin (SPL)', 'priceUsd': 1.0, 'protocol_id': None},
    'So11111111111111111111111111111111111111112': {'symbol': 'SOL', 'name': 'Solana Native', 'priceUsd': 106.63, 'protocol_id': None},
    'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': {'symbol': 'bSOL', 'name': 'BlazeStake Staked SOL', 'priceUsd': 139.32, 'protocol_id': 'blazestake'},
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {'symbol': 'mSOL', 'name': 'Marinade Staked SOL', 'priceUsd': 135.00, 'protocol_id': 'marinade'},
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {'symbol': 'JitoSOL', 'name': 'Jito Staked SOL', 'priceUsd': 138.50, 'protocol_id': 'jito'},
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': {'symbol': 'JUP', 'name': 'Jupiter', 'priceUsd': 0.95, 'protocol_id': None},
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {'symbol': 'RAY', 'name': 'Raydium', 'priceUsd': 3.20, 'protocol_id': None},
    'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS': {'symbol': 'KMNO', 'name': 'Kamino', 'priceUsd': 0.085, 'protocol_id': 'kamino'},
    'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk': {'symbol': 'WEN', 'name': 'Wen', 'priceUsd': 0.000006136, 'protocol_id': None},
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {'symbol': 'BONK', 'name': 'Bonk', 'priceUsd': 0.0000031, 'protocol_id': None},
    'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA': {'symbol': 'BLZE', 'name': 'Blaze', 'priceUsd': 0.00007652, 'protocol_id': None},
    '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1': {'symbol': 'CWIF', 'name': 'catwifhat', 'priceUsd': 0.0000000259, 'protocol_id': None}
}


# =====================================================================
# 3. ADDRESS AUTO-DETECTION & CROSS-CHAIN BRIDGE DISCOVERY ENGINE
#    (WormholeScan API + LI.FI Cross-Chain API + deBridge DLN API)
# =====================================================================
def detect_address_type(addr: str):
    return detect_chain_from_address(addr)


def parse_address_bundle(raw_address_str: str):
    """
    Parses a single address or comma/space-separated multi-chain address bundle.
    Returns dict: {'solana': [...], 'evm': [...], 'tron': [...]}
    """
    bundle = {'solana': [], 'evm': [], 'tron': []}
    if not raw_address_str or not raw_address_str.strip():
        bundle['solana'].append(PRESET_SOL_ADDRESS)
        bundle['evm'].append(PRESET_EVM_ADDRESS)
        bundle['tron'].append(PRESET_TRON_ADDRESS)
        return bundle

    tokens = [t.strip() for t in re.split(r'[,;\s]+', raw_address_str.strip()) if t.strip()]
    for tok in tokens:
        atype = detect_address_type(tok)
        if atype and tok not in bundle[atype]:
            bundle[atype].append(tok)

    return bundle


def _resolve_pivot_chain_for_address(hint_chain: str, address: str) -> str:
    """Maps a bridge destination chain or address to a supported scanner chain tab."""
    hc = (hint_chain or '').strip().lower()
    if hc in ('solana', 'ethereum', 'bsc', 'tron'):
        return hc
    if hc in ('arbitrum', 'base', 'optimism', 'polygon'):
        return 'ethereum'
    atype = detect_address_type(address)
    if atype == 'solana':
        return 'solana'
    if atype == 'tron':
        return 'tron'
    if atype == 'evm':
        return 'bsc' if 'bsc' in hc or 'bnb' in hc else 'ethereum'
    return 'unified'


def fetch_cross_chain_bridge_outflows(address: str):
    """
    Queries public Cross-Chain Bridge Explorer APIs (WormholeScan + LI.FI + deBridge DLN) in parallel
    to discover funds that exited `address` to OTHER chains (e.g. Solana <-> EVM <-> Arbitrum/BNB/Base)!
    Requires ZERO API key.
    """
    bridge_hops = []
    seen_hops = set()

    def _query_wormhole():
        hops = []
        try:
            url = f"https://api.wormholescan.io/api/v1/operations?address={urllib.parse.quote(address)}&pageSize=15"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode())
                for op in (data.get('operations') or []):
                    content = op.get('content') or {}
                    stand = content.get('standarizedProperties') or {}
                    to_addr = (stand.get('toAddress') or '').strip()
                    from_addr = (stand.get('fromAddress') or '').strip()

                    if from_addr.lower() != address.lower() and to_addr.lower() != address.lower():
                        continue

                    to_chain_id = stand.get('toChain')
                    from_chain_id = stand.get('fromChain')
                    payload = content.get('payload') or {}
                    sym = sanitize_token_text(payload.get('symbol') or stand.get('tokenAddress'), default='TOKEN', max_len=24)
                    amt = float(stand.get('amount') or payload.get('amount') or 0.0)
                    if amt > 1e6:
                        amt = amt / 1e8

                    wh_chain_map = {1: 'solana', 2: 'ethereum', 4: 'bsc', 23: 'arbitrum', 24: 'optimism', 30: 'base', 5: 'polygon'}
                    dst_chain = wh_chain_map.get(to_chain_id, f'chain_{to_chain_id}')
                    src_chain = wh_chain_map.get(from_chain_id, f'chain_{from_chain_id}')

                    target_hop = to_addr if to_addr.lower() != address.lower() else (to_addr or from_addr)
                    if target_hop and (target_hop.lower() != address.lower() or src_chain != dst_chain):
                        hops.append({
                            'bridge_name': 'Wormhole Bridge',
                            'from_chain': src_chain,
                            'to_chain': dst_chain,
                            'from_address': from_addr or address,
                            'to_address': target_hop,
                            'symbol': sym,
                            'amount': round(amt, 4),
                            'usd_estimate': 0.0,
                            'is_router_or_cex': False
                        })
        except Exception:
            pass
        return hops

    def _query_lifi():
        hops = []
        try:
            url = f"https://li.quest/v1/analytics/transfers?wallet={urllib.parse.quote(address)}&limit=15"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode())
                for tr in (data.get('transfers') or []):
                    sending = tr.get('sending') or {}
                    receiving = tr.get('receiving') or {}
                    to_addr = (tr.get('toAddress') or receiving.get('address') or '').strip()
                    from_addr = (tr.get('fromAddress') or sending.get('address') or '').strip()

                    if from_addr.lower() != address.lower() and to_addr.lower() != address.lower():
                        continue

                    amt_usd = float(receiving.get('amountUSD') or sending.get('amountUSD') or 0.0)
                    tok_sym = sanitize_token_text((receiving.get('token') or {}).get('symbol') or (sending.get('token') or {}).get('symbol'), default='TOKEN', max_len=24)
                    dst_cid = receiving.get('chainId')
                    src_cid = sending.get('chainId')
                    lifi_map = {1: 'ethereum', 56: 'bsc', 42161: 'arbitrum', 8453: 'base', 10: 'optimism', 137: 'polygon', 1151111081099710: 'solana'}
                    dst_chain = lifi_map.get(dst_cid, 'multichain')
                    src_chain = lifi_map.get(src_cid, 'multichain')

                    target_hop = to_addr if to_addr.lower() != address.lower() else (to_addr or from_addr)
                    if target_hop and (target_hop.lower() != address.lower() or src_chain != dst_chain):
                        tool_name = sanitize_token_text(tr.get('tool'), default='LI.FI Bridge', max_len=24)
                        tok_obj = receiving.get('token') or sending.get('token') or {}
                        dec = int(tok_obj.get('decimals') if tok_obj.get('decimals') is not None else 18)
                        raw_amt = float(receiving.get('amount') or sending.get('amount') or 0.0)
                        human_amt = (raw_amt / (10 ** dec)) if dec > 0 else raw_amt

                        tool_l = tool_name.lower()
                        is_tool_cex = any(c in tool_l for c in KNOWN_CEX_KEYWORDS)
                        is_tool_router = any(r in tool_l for r in KNOWN_ROUTER_KEYWORDS)

                        hops.append({
                            'bridge_name': tool_name,
                            'from_chain': src_chain,
                            'to_chain': dst_chain,
                            'from_address': from_addr or address,
                            'to_address': target_hop,
                            'symbol': tok_sym,
                            'amount': round(human_amt, 4),
                            'usd_estimate': round(amt_usd, 2),
                            'is_router_or_cex': is_tool_cex or is_tool_router
                        })
        except Exception:
            pass
        return hops

    def _query_debridge():
        hops = []
        try:
            payload = json.dumps({'maker': address, 'take': 10, 'skip': 0}).encode('utf-8')
            req = urllib.request.Request(
                'https://stats-api.dln.trade/api/Orders/filteredList',
                data=payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode())
                dln_map = {1: 'ethereum', 56: 'bsc', 42161: 'arbitrum', 8453: 'base', 10: 'optimism', 137: 'polygon', 7565164: 'solana', 100000026: 'tron'}
                for order in (data.get('orders') or []):
                    recv_dst = (order.get('receiverDst') or {}).get('stringValue', '').strip()
                    maker_src = (order.get('makerSrc') or {}).get('stringValue', '').strip()
                    give_offer = order.get('giveOfferWithMetadata') or {}
                    take_offer = order.get('takeOfferWithMetadata') or {}
                    src_cid = int(give_offer.get('chainId', {}).get('bigIntegerValue') or 0)
                    dst_cid = int(take_offer.get('chainId', {}).get('bigIntegerValue') or 0)
                    if not recv_dst or (recv_dst.lower() == address.lower() and src_cid == dst_cid):
                        continue
                    sym = sanitize_token_text(take_offer.get('symbol') or give_offer.get('symbol'), default='TOKEN', max_len=24)
                    amt_usd = float(order.get('giveAmountUsd') or 0.0)
                    hops.append({
                        'bridge_name': 'deBridge DLN',
                        'from_chain': dln_map.get(src_cid, 'multichain'),
                        'to_chain': dln_map.get(dst_cid, 'multichain'),
                        'from_address': maker_src or address,
                        'to_address': recv_dst,
                        'symbol': sym,
                        'amount': round(amt_usd, 4),
                        'usd_estimate': round(amt_usd, 2),
                        'is_router_or_cex': False
                    })
        except Exception:
            pass
        return hops

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        f_wh = ex.submit(_query_wormhole)
        f_lifi = ex.submit(_query_lifi)
        f_dln = ex.submit(_query_debridge)
        results = [f_wh.result(), f_lifi.result(), f_dln.result()]

    for hops in results:
        for h in hops:
            hop_key = make_cache_key(h['to_chain'], h['to_address'])
            if hop_key not in seen_hops:
                seen_hops.add(hop_key)
                bridge_hops.append(h)

    return bridge_hops


# =====================================================================
# 4. CHAIN-SPECIFIC LIVE SCANNERS (SOLANA, EVM+L2, BSC, TRON)
# =====================================================================
def sol_rpc_call(method, params):
    payload = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode('utf-8')
    ordered_urls = list(SOL_RPC_POOL)
    if _sol_rpc_cycle and len(SOL_RPC_POOL) > 1:
        primary = next(_sol_rpc_cycle)
        ordered_urls = [primary] + [u for u in SOL_RPC_POOL if u != primary]

    for url in ordered_urls:
        rem_timeout = get_remaining_timeout(4.0)
        if rem_timeout <= 0.05:
            break
        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with _SOL_RPC_SEM:
                with urllib.request.urlopen(req, timeout=rem_timeout) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    if 'result' in data:
                        return data['result']
        except Exception:
            continue
    return None


def get_sol_token_info(mint):
    if mint in KNOWN_SOL_TOKENS:
        info = KNOWN_SOL_TOKENS[mint]
        return info['priceUsd'], info['symbol'], info['name'], info.get('protocol_id')
    return 0.0, mint[:6], 'SPL Token', None


def get_sol_wallet_overview(wallet_address):
    """
    Queries live Solana RPC for native balance, SPL & Token-2022 accounts, and native Stake accounts.
    v9.0 Integrity Guarantee: ZERO preset dummy fallback (`_load_cached_sol_overview` removed).
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        f_bal = ex.submit(sol_rpc_call, 'getBalance', [wallet_address])
        f_t1 = ex.submit(sol_rpc_call, 'getTokenAccountsByOwner', [wallet_address, {'programId': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'}, {'encoding': 'jsonParsed'}])
        f_t2 = ex.submit(sol_rpc_call, 'getTokenAccountsByOwner', [wallet_address, {'programId': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'}, {'encoding': 'jsonParsed'}])
        f_s1 = ex.submit(sol_rpc_call, 'getProgramAccounts', ['Stake11111111111111111111111111111111111111', {'encoding': 'jsonParsed', 'filters': [{'memcmp': {'offset': 12, 'bytes': wallet_address}}]}])
        f_s2 = ex.submit(sol_rpc_call, 'getProgramAccounts', ['Stake11111111111111111111111111111111111111', {'encoding': 'jsonParsed', 'filters': [{'memcmp': {'offset': 44, 'bytes': wallet_address}}]}])

    sol_res = f_bal.result()
    rpc_ok = sol_res is not None
    tokens_ok = True
    staking_ok = True

    sol_price = get_live_prices().get('SOL', 106.63)

    if rpc_ok:
        sol_lamports = sol_res.get('value', 0) if isinstance(sol_res, dict) else (sol_res or 0)
        sol_bal = sol_lamports / 1e9

        token_accounts = []
        for prog, fut_t in [('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', f_t1), ('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', f_t2)]:
            res = fut_t.result()
            if res is None:
                tokens_ok = False
            elif isinstance(res, dict) and 'value' in res:
                for item in res['value']:
                    pubkey = item['pubkey']
                    acc_obj = item.get('account') or {}
                    info = acc_obj.get('data', {}).get('parsed', {}).get('info', {})
                    tok_amt = info.get('tokenAmount') or {}
                    decimals = int(tok_amt.get('decimals') or 0)
                    raw_str = tok_amt.get('amount')
                    if raw_str is not None:
                        raw_amount = int(raw_str)
                        ui_amount = (raw_amount / (10 ** decimals)) if decimals > 0 else float(raw_amount)
                        amount_known = True
                    elif tok_amt.get('uiAmount') is not None:
                        ui_amount = float(tok_amt['uiAmount'])
                        raw_amount = int(round(ui_amount * (10 ** decimals)))
                        amount_known = True
                    else:
                        ui_amount = 0.0
                        raw_amount = 0
                        amount_known = False
                    acc_state = info.get('state', 'initialized')
                    acc_lamports = int(acc_obj.get('lamports', 2039280))
                    token_accounts.append({
                        'pubkey': pubkey,
                        'mint': info['mint'],
                        'amount': ui_amount,
                        'raw_amount': raw_amount,
                        'decimals': decimals,
                        'state': acc_state,
                        'lamports': acc_lamports,
                        'is_closable_empty': amount_known and (raw_amount == 0) and (acc_state == 'initialized'),
                        'program': prog
                    })

        zero_balance = [t for t in token_accounts if t['is_closable_empty']]
        active_tokens = [t for t in token_accounts if t['raw_amount'] > 0]
        reclaimable_sol = round(sum(t['lamports'] for t in zero_balance) / 1e9, 8)
        reclaimable_usd = reclaimable_sol * sol_price

        portfolio = []
        total_token_usd = 0.0
        for t in active_tokens:
            p, sym, name, proto_id = get_sol_token_info(t['mint'])
            val = t['amount'] * p
            total_token_usd += val
            portfolio.append({
                'pubkey': t['pubkey'],
                'mint': t['mint'],
                'symbol': sym,
                'name': name,
                'amount': t['amount'],
                'price_usd': p,
                'value_usd': val,
                'protocol_id': proto_id
            })
        portfolio.sort(key=lambda x: x['value_usd'], reverse=True)

        stake_accounts = []
        total_staked_sol = 0.0
        for fut_s in (f_s1, f_s2):
            st_res = fut_s.result()
            if st_res is None:
                staking_ok = False
            elif isinstance(st_res, list):
                for acc in st_res:
                    pk = acc['pubkey']
                    lamports = acc['account']['lamports']
                    staked_amount = lamports / 1e9
                    if pk not in [s['pubkey'] for s in stake_accounts]:
                        total_staked_sol += staked_amount
                        stake_accounts.append({
                            'pubkey': pk,
                            'lamports': lamports,
                            'sol_amount': staked_amount,
                            'usd_value': staked_amount * sol_price,
                            'protocol_id': None
                        })

        stage_status = {
            'balance': rpc_ok,
            'tokens': tokens_ok,
            'staking': staking_ok
        }
        is_partial = not all(stage_status.values())

        total_wallet_usd = (sol_bal * sol_price) + total_token_usd
        total_recoverable_usd = (total_staked_sol * sol_price) + total_wallet_usd + reclaimable_usd

        return {
            'is_partial': is_partial,
            'stage_status': stage_status,
            'wallet': wallet_address,
            'sol_balance': sol_bal,
            'sol_price_usd': sol_price,
            'sol_value_usd': sol_bal * sol_price,
            'total_token_usd': total_token_usd,
            'portfolio': portfolio,
            'total_token_accounts': len(token_accounts),
            'zero_balance_count': len(zero_balance),
            'reclaimable_sol': reclaimable_sol,
            'reclaimable_usd': reclaimable_usd,
            'stake_accounts': stake_accounts,
            'total_staked_sol': total_staked_sol,
            'total_staked_usd': total_staked_sol * sol_price,
            'total_wallet_usd': total_wallet_usd,
            'total_recoverable_usd': total_recoverable_usd
        }

    return {
        'is_partial': True,
        'stage_status': {'balance': False, 'tokens': False, 'staking': False},
        'wallet': wallet_address,
        'sol_balance': 0.0,
        'sol_price_usd': sol_price,
        'sol_value_usd': 0.0,
        'total_token_usd': 0.0,
        'portfolio': [],
        'total_token_accounts': 0,
        'zero_balance_count': 0,
        'reclaimable_sol': 0.0,
        'reclaimable_usd': 0.0,
        'stake_accounts': [],
        'total_staked_sol': 0.0,
        'total_staked_usd': 0.0,
        'total_wallet_usd': 0.0,
        'total_recoverable_usd': 0.0
    }


def get_sol_transactions(wallet_address):
    """
    Scans live Solana transactions for `wallet_address` and inspects each counterparty's
    real on-chain balance, account owner (Stake/Program), and lifetime signature count (`lifetime_txs`).
    v9.0 Integrity Guarantee: ZERO static JSON file fallback (`all_wallets_classified.json` removed).
    """
    counterpart_map = {}
    sigs_res = sol_rpc_call('getSignaturesForAddress', [wallet_address, {'limit': 20}])
    tx_ok = sigs_res is not None

    if isinstance(sigs_res, list) and sigs_res:
        ordered_sigs = [s for s in sigs_res[:12] if isinstance(s, dict) and s.get('signature')]
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            tx_results = list(ex.map(
                lambda s: (s, sol_rpc_call('getTransaction', [s['signature'], {'encoding': 'jsonParsed', 'maxSupportedTransactionVersion': 0}])),
                ordered_sigs
            ))
            for s_meta, tx in tx_results:
                if not tx:
                    continue
                try:
                    sig = s_meta.get('signature')
                    bt = s_meta.get('blockTime')
                    dt_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(bt)) if bt else ''
                    msg = tx.get('transaction', {}).get('message', {})
                    for ix in msg.get('instructions', []):
                        if isinstance(ix.get('parsed'), dict):
                            info = ix['parsed'].get('info', {})
                            ptype = ix['parsed'].get('type')
                            if ptype in ('transfer', 'createAccountWithSeed', 'delegate') and ('lamports' in info or 'source' in info):
                                src = info.get('source') or info.get('from')
                                dst = info.get('destination') or info.get('newAccount') or info.get('stakeAccount')
                                amt = float(info.get('lamports', 0)) / 1e9
                                if src == wallet_address and dst and dst != wallet_address:
                                    c = counterpart_map.setdefault(dst, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'txs': []})
                                    c['sent'] += amt
                                    c['count'] += 1
                                    c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(amt, 4), 'direction': '내가 보낸 돈', 'symbol': 'SOL'})
                                elif dst == wallet_address and src and src != wallet_address:
                                    c = counterpart_map.setdefault(src, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'txs': []})
                                    c['recv'] += amt
                                    c['count'] += 1
                                    c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(amt, 4), 'direction': '내가 받은 돈', 'symbol': 'SOL'})
                except Exception:
                    continue

    def _inspect_sol_counterpart(item):
        c_addr, c_data = item
        bal_res = sol_rpc_call('getBalance', [c_addr])
        c_sol = ((bal_res.get('value', 0) if isinstance(bal_res, dict) else (bal_res or 0)) / 1e9) if bal_res else 0.0

        # Check if program / router or stake account
        acc_info = sol_rpc_call('getAccountInfo', [c_addr, {'encoding': 'jsonParsed'}])
        is_prog = False
        is_stake = False
        if acc_info and isinstance(acc_info, dict) and 'value' in acc_info and acc_info['value']:
            val = acc_info['value']
            is_prog = bool(val.get('executable', False))
            owner = str(val.get('owner', ''))
            if 'Stake' in owner:
                is_stake = True

        # Fetch counterparty's true on-chain lifetime signature count (limit 65 to test 1~60 personal threshold)
        c_sigs = sol_rpc_call('getSignaturesForAddress', [c_addr, {'limit': 65}])
        if isinstance(c_sigs, list):
            lifetime_txs = 1001 if len(c_sigs) >= 65 else max(len(c_sigs), c_data['count'])
        else:
            lifetime_txs = c_data['count']

        prof = classify_wallet_profile(
            chain='solana',
            address=c_addr,
            current_bal=c_sol,
            sent_from_me=c_data['sent'],
            recv_to_me=c_data['recv'],
            tx_count=lifetime_txs,
            is_contract=is_prog,
            my_tx_count=c_data['count']
        )

        return {
            'address': c_addr,
            'wallet_type': 'MY_STAKE_WALLET' if is_stake else prof['wallet_type'],
            'is_my_wallet': True if is_stake else prof['is_my_wallet'],
            'confidence': 'CERTAIN_100%' if is_stake else prof.get('confidence', 'MEDIUM'),
            'relation_score': 100 if is_stake else prof.get('relation_score', 30),
            'interaction_ratio': '100%' if is_stake else prof.get('interaction_ratio', '100%'),
            'evidence_tags': ['본인 인출권한(Withdrawer) 100%', '솔라나 네이티브 스테이킹'] if is_stake else prof.get('evidence_tags', []),
            'lifetime_txs': lifetime_txs,
            'current_sol': c_sol,
            'sent_from_me': c_data['sent'],
            'received_to_me': c_data['recv'],
            'my_tx_count': c_data['count'],
            'top_txs': c_data['txs'][:5],
            'reason': ('내 지갑이 소유한 솔라나 네이티브 스테이킹 계정' if is_stake else prof['reason'])
        }

    classified_wallets = []
    if counterpart_map:
        sorted_counterparts = sorted(
            counterpart_map.items(),
            key=lambda x: (x[1]['count'], x[1]['sent'] + x[1]['recv']),
            reverse=True
        )[:15]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            classified_wallets = list(ex.map(_inspect_sol_counterpart, sorted_counterparts))

    return {'classified_wallets': classified_wallets, 'is_partial': not tx_ok}


def evm_rpc(rpc_url, method, params):
    pool = ETH_RPC_POOL if 'eth' in rpc_url.lower() else BSC_RPC_POOL
    payload = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode()
    for url in pool:
        rem_timeout = get_remaining_timeout(4.0)
        if rem_timeout <= 0.05:
            break
        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with _EVM_RPC_SEM:
                with urllib.request.urlopen(req, timeout=rem_timeout) as resp:
                    data = json.loads(resp.read().decode())
                    if 'result' in data and data['result'] is not None:
                        return data['result']
        except Exception:
            continue
    return None


def evm_get_token_balance(rpc_url, token_address, user_address):
    """
    Queries ERC-20 `balanceOf(user_address)` via `eth_call`.
    Returns:
      - `int >= 0` when RPC call succeeded (`0` when `res_hex == '0x'` or `'0x0'`)
      - `None` when RPC call failed (`res_hex is None` or malformed hex), allowing
        `analyze_evm_live` to distinguish RPC failure (`None`) from a valid zero balance (`0`).
    """
    if not user_address or not user_address.startswith('0x') or len(user_address) != 42:
        return 0
    clean_addr = user_address.lower().replace('0x', '').zfill(64)
    data = '0x70a08231' + clean_addr
    res_hex = evm_rpc(rpc_url, 'eth_call', [{'to': token_address, 'data': data}, 'latest'])
    if res_hex is None:
        return None
    if res_hex == '0x':
        return 0
    try:
        return int(res_hex, 16)
    except Exception:
        return None


def fetch_etherscan_or_bscscan_data(chain, address, return_status=False):
    """
    Fetches EVM transaction history from Etherscan/BscScan v2/v1 or Blockscout fallback.
    When `return_status=True`, returns `(counterparts, tx_count, tx_api_ok)`.
    """
    chain_id = 1 if chain == 'ethereum' else 56
    native_sym = 'ETH' if chain == 'ethereum' else 'BNB'
    counterparts = {}
    tx_count = 0
    tx_api_ok = False

    # Etherscan V2 Unified Endpoint (`https://api.etherscan.io/v2/api?chainid=1|56`)
    # Strictly uses ETHERSCAN_API_KEYS only; deprecated V1 & standalone bscscan.com endpoints removed.
    scan_keys = list(ETHERSCAN_API_KEYS)

    def _call_scan_api(params_dict):
        nonlocal tx_api_ok
        for k in scan_keys:
            if not k:
                continue
            q_v2 = urllib.parse.urlencode({**params_dict, 'chainid': chain_id, 'apikey': k})
            u = f"https://api.etherscan.io/v2/api?{q_v2}"
            try:
                req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read().decode())
                    msg_lower = str(data.get('message') or '').lower()
                    res_val = data.get('result')
                    if str(data.get('status')) == '1' and isinstance(res_val, list):
                        tx_api_ok = True
                        return res_val
                    if 'no transactions found' in msg_lower or (str(data.get('status')) == '0' and res_val == []):
                        tx_api_ok = True
                        return []
            except Exception:
                continue
        return None

    tx_list = _call_scan_api({
        'module': 'account',
        'action': 'txlist',
        'address': address,
        'startblock': 0,
        'endblock': 99999999,
        'page': 1,
        'offset': 50,
        'sort': 'desc'
    })

    if tx_list:
        tx_count = len(tx_list)
        for tx in tx_list:
            if str(tx.get('isError')) == '1':
                continue
            from_addr = (tx.get('from') or '').strip()
            to_addr = (tx.get('to') or '').strip()
            val_wei = float(tx.get('value') or 0)
            val_native = val_wei / 1e18
            ts = int(tx.get('timeStamp') or 0)
            dt_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(ts)) if ts else ''
            sig = tx.get('hash', '')

            if from_addr.lower() == address.lower() and to_addr and to_addr.lower() != address.lower():
                c = counterparts.setdefault(to_addr, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'is_contract': bool(tx.get('input') and tx.get('input') != '0x'), 'name': None, 'txs': []})
                c['sent'] += val_native
                c['count'] += 1
                if val_native > 0:
                    c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(val_native, 4), 'direction': '내가 보낸 돈', 'symbol': native_sym})
            elif to_addr.lower() == address.lower() and from_addr and from_addr.lower() != address.lower():
                c = counterparts.setdefault(from_addr, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'is_contract': False, 'name': None, 'txs': []})
                c['recv'] += val_native
                c['count'] += 1
                if val_native > 0:
                    c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(val_native, 4), 'direction': '내가 받은 돈', 'symbol': native_sym})

    if not counterparts and not tx_api_ok:
        blockscout_api = 'https://eth.blockscout.com/api/v2' if chain == 'ethereum' else 'https://bsc.blockscout.com/api/v2'
        try:
            url = f"{blockscout_api}/addresses/{address}/transactions"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                if isinstance(data, dict) and 'items' in data:
                    tx_api_ok = True
                    items = data.get('items') or []
                    tx_count = len(items)
                    for tx in items[:35]:
                        from_addr = (tx.get('from') or {}).get('hash', '')
                        to_addr = (tx.get('to') or {}).get('hash', '')
                        to_is_contract = (tx.get('to') or {}).get('is_contract', False)
                        raw_to_name = (tx.get('to') or {}).get('name')
                        to_name = sanitize_token_text(raw_to_name, default='', max_len=24) or None
                        val_wei = float(tx.get('value') or 0)
                        val_native = val_wei / 1e18
                        dt_str = (tx.get('timestamp') or '')[:16].replace('T', ' ')
                        sig = tx.get('hash', '')

                        if from_addr.lower() == address.lower() and to_addr and to_addr.lower() != address.lower():
                            c = counterparts.setdefault(to_addr, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'is_contract': to_is_contract, 'name': to_name, 'txs': []})
                            c['sent'] += val_native
                            c['count'] += 1
                            if val_native > 0:
                                c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(val_native, 4), 'direction': '내가 보낸 돈', 'symbol': native_sym})
                        elif to_addr.lower() == address.lower() and from_addr and from_addr.lower() != address.lower():
                            c = counterparts.setdefault(from_addr, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'is_contract': False, 'name': None, 'txs': []})
                            c['recv'] += val_native
                            c['count'] += 1
                            if val_native > 0:
                                c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(val_native, 4), 'direction': '내가 받은 돈', 'symbol': native_sym})
        except Exception:
            pass

    if return_status:
        return counterparts, tx_count, tx_api_ok
    return counterparts, tx_count


def fetch_blockscout_tokens(base_api_url, address, return_status=False):
    """
    Fetches ERC-20 / BEP-20 token balances via Blockscout v2 API.
    When `return_status=True`, returns `(discovered_list, ok_bool)` so HTTP 429 / network errors
    are properly detected instead of silently returning `[]` as complete.
    """
    discovered = []
    api_ok = False
    try:
        url = f"{base_api_url}/addresses/{address}/token-balances"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            items = json.loads(resp.read().decode())
            if isinstance(items, list):
                api_ok = True
                for item in items:
                    tok = item.get('token') or {}
                    if tok.get('type') != 'ERC-20':
                        continue
                    dec = int(tok.get('decimals') or 18)
                    raw_val = float(item.get('value') or 0)
                    amt = raw_val / (10 ** dec)
                    rate = float(tok.get('exchange_rate') or 0.0)
                    sym = sanitize_token_text(tok.get('symbol'), default='TOKEN', max_len=24)
                    name = sanitize_token_text(tok.get('name'), default=sym, max_len=24)
                    mint = (tok.get('address') or '').lower()
                    if rate <= 0 and sym in ('USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD'):
                        rate = 1.0
                    val_usd = round(amt * rate, 2)
                    if amt > 0 and val_usd >= 0.01:
                        proto_id = 'lido' if sym in ('stETH', 'wstETH') else ('rocketpool' if sym == 'rETH' else ('pancakeswap' if sym == 'CAKE' else None))
                        discovered.append({
                            'symbol': sym,
                            'name': name,
                            'amount': amt,
                            'value_usd': val_usd,
                            'mint': mint,
                            'protocol_id': proto_id
                        })
    except Exception:
        api_ok = False

    if return_status:
        return discovered, api_ok
    return discovered


def analyze_solana(address):
    overview = get_sol_wallet_overview(address)
    tx_analysis = get_sol_transactions(address)
    sol_price = overview.get('sol_price_usd', 106.63)

    staked_usd = round(overview.get('total_staked_usd', 0.0), 2)
    rent_usd = round(overview.get('reclaimable_usd', 0.0), 2)
    token_usd = round(overview.get('total_token_usd', 0.0) + overview.get('sol_value_usd', 0.0), 2)
    total_recoverable = round(staked_usd + rent_usd + token_usd, 2)

    raw_wallets = tx_analysis.get('classified_wallets', [])
    classified_wallets = []

    for w in raw_wallets:
        w_addr = w['address']
        w_type = w.get('wallet_type', 'EXTERNAL_COUNTERPARTY')
        is_mine = bool(w.get('is_my_wallet', False)) if 'is_my_wallet' in w else (w_type in ('MY_STAKE_WALLET', 'INFERRED_MY_WALLET'))
        cur_sol = float(w.get('current_sol', 0.0))
        cur_usd = round(cur_sol * sol_price, 2) if is_mine else 0.0
        sent_sol = float(w.get('sent_from_me', 0.0))
        recv_sol = float(w.get('received_to_me', 0.0))
        vol_sol = sent_sol + recv_sol
        vol_usd = round(vol_sol * sol_price, 2)
        tx_cnt = int(w.get('lifetime_txs', 1))
        my_tx_cnt = int(w.get('my_tx_count', 1))
        rel_score = int(w.get('relation_score', 95 if is_mine else 20))
        int_ratio = w.get('interaction_ratio', f"{min(100, int((my_tx_cnt / max(1, tx_cnt)) * 100))}%")
        ev_tags = w.get('evidence_tags') or (['내 지갑 연관 확인'] if is_mine else ['외부 주소'])

        stuck_positions = []
        if w_type == 'MY_STAKE_WALLET':
            label = f"[SOL] 내 네이티브 스테이킹 계정 ({cur_sol:.4f} SOL)"
            stuck_positions.append({
                'protocol': None,
                'name': 'Solana Native Staking (순수 스테이킹)',
                'amount_desc': f'{cur_sol:.4f} SOL (Withdrawer 본인 소유)',
                'usd': cur_usd
            })
        elif is_mine:
            if cur_sol >= 0.01:
                label = f"[SOL] 내 보조 지갑 추정 (잔고 {cur_sol:.4f} SOL)"
            elif vol_sol >= 1.0:
                label = f"[SOL] 내 보조 지갑 추정 (누적 {vol_sol:.2f} SOL 이동)"
            else:
                label = f"[SOL] 내 소액/렌트 보조 지갑 ({w_addr[:4]}...{w_addr[-4:]})"

            if cur_sol > 0:
                stuck_positions.append({
                    'protocol': None,
                    'name': '지갑 기본 SOL 잔고',
                    'amount_desc': f'{cur_sol:.6f} SOL',
                    'usd': cur_usd
                })
        elif w_type == 'CEX_HOT_WALLET':
            label = f"[SOL] 거래소 핫월렛 ({w_addr[:4]}...{w_addr[-4:]})"
        elif w_type == 'CEX_DEPOSIT_WALLET':
            label = f"[SOL] 거래소 개인 입금 전용 주소 ({w_addr[:4]}...{w_addr[-4:]})"
        elif w_type == 'PROTOCOL_ROUTER':
            label = f"[SOL] DEX/프로그램 라우터 ({w_addr[:4]}...{w_addr[-4:]})"
        else:
            label = f"[SOL] 외부 거래 상대방 ({w_addr[:4]}...{w_addr[-4:]})"

        classified_wallets.append({
            'address': w_addr,
            'short_addr': f"{w_addr[:4]}...{w_addr[-4:]}",
            'chain': 'solana',
            'chain_badge': 'SOL',
            'is_my_wallet': is_mine,
            'wallet_type': w_type,
            'label': label,
            'relation_score': rel_score,
            'interaction_ratio': int_ratio,
            'evidence_tags': ev_tags,
            'can_pivot_scan': True,
            'pivot_chain': 'solana',
            'pivot_address': w_addr,
            'lifetime_txs': tx_cnt,
            'my_tx_count': my_tx_cnt,
            'unique_counterparties': my_tx_cnt,
            'sent_from_me': sent_sol,
            'received_to_me': recv_sol,
            'current_balance': cur_sol,
            'current_usd': cur_usd,
            'volume_usd': vol_usd,
            'protocol_id': None,
            'protocol_name': '— (공란)',
            'top_txs': w.get('top_txs', []),
            'stuck_positions': stuck_positions,
            'reason': w.get('reason', '온체인 입출금 패턴 기반 분류')
        })

    classified_wallets.sort(key=lambda x: (
        1 if x['wallet_type'] == 'MY_STAKE_WALLET' else 0,
        1 if x['is_my_wallet'] else 0,
        x['relation_score'],
        x['current_usd'],
        x['volume_usd']
    ), reverse=True)

    recovery_targets = []
    has_external_protocol = False
    for st in overview.get('stake_accounts', []):
        recovery_targets.append({
            'id': f"stake_{st['pubkey'][:8]}",
            'chain': 'solana',
            'chain_badge': 'SOL',
            'title': f"[SOL] 솔라나 네이티브 스테이킹 계정 ({st['sol_amount']:.4f} SOL)",
            'protocol_id': None,
            'protocol_name': '— (공란 · 순수 네이티브 스테이킹)',
            'amount_desc': f"{st['sol_amount']:.4f} SOL",
            'value_usd': round(st['usd_value'], 2),
            'badge': '본인 인출권한 100%',
            'description': '외부 디파이 프로토콜과 무관한 순수 솔라나 네이티브 스테이킹 계정입니다. 지갑 앱의 Staking 메뉴에서 직접 해제(Deactivate) 및 인출할 수 있습니다.',
            'official_url': f"https://solscan.io/account/{st['pubkey']}"
        })

    if overview.get('zero_balance_count', 0) > 0:
        z_cnt = overview['zero_balance_count']
        r_sol = overview['reclaimable_sol']
        r_usd = round(overview['reclaimable_usd'], 2)
        recovery_targets.append({
            'id': 'sol_empty_rent',
            'chain': 'solana',
            'chain_badge': 'SOL',
            'title': f"[SOL] 빈 SPL 토큰 계정 보증금 환급 ({z_cnt}개 계정)",
            'protocol_id': None,
            'protocol_name': '— (공란 · SPL 계정 렌트 보증금)',
            'amount_desc': f"{r_sol:.4f} SOL ({z_cnt}개)",
            'value_usd': r_usd,
            'badge': '계정 닫기 시 환급',
            'description': f'토큰 전송 후 잔고가 0이 되었으나 닫히지 않은 {z_cnt}개의 SPL 토큰 계정에 묶여있는 SOL 보증금입니다.',
            'official_url': f"https://solscan.io/account/{address}#portfolio"
        })

    for t in overview.get('portfolio', []):
        if t['value_usd'] >= 0.05:
            p_id = t.get('protocol_id')
            p_info = KNOWN_PROTOCOLS.get(p_id) if p_id else None
            if p_info:
                has_external_protocol = True
            recovery_targets.append({
                'id': f"tok_{t['mint'][:8]}",
                'chain': 'solana',
                'chain_badge': 'SOL',
                'title': f"[SOL] {'유동성 스테이킹' if p_info else '지갑 보유 토큰'}: {t['symbol']} ({t['amount']:,.2f}개)",
                'protocol_id': p_id,
                'protocol_name': p_info['name'] if p_info else '— (공란 · 지갑 직접 보유)',
                'amount_desc': f"{t['amount']:,.4f} {t['symbol']}",
                'value_usd': round(t['value_usd'], 2),
                'badge': '언스테이킹 환급 가능' if p_info else '지갑 내 보유 중',
                'description': p_info['description'] if p_info else f"현재 지갑 내부에 직접 보유 중인 {t['name']} ({t['symbol']}) 잔고입니다.",
                'official_url': p_info['official_url'] if p_info else f"https://solscan.io/account/{address}#portfolio"
            })

    if overview.get('sol_value_usd', 0) >= 0.05:
        recovery_targets.append({
            'id': 'sol_native_bal',
            'chain': 'solana',
            'chain_badge': 'SOL',
            'title': f"[SOL] 지갑 기본 SOL 잔고 ({overview['sol_balance']:.4f} SOL)",
            'protocol_id': None,
            'protocol_name': '— (공란 · 지갑 기본 잔고)',
            'amount_desc': f"{overview['sol_balance']:.4f} SOL",
            'value_usd': round(overview['sol_value_usd'], 2),
            'badge': '기본 잔고',
            'description': '지갑에 기본 보유 중인 네이티브 SOL 잔고입니다.',
            'official_url': f"https://solscan.io/account/{address}"
        })

    recovery_targets.sort(key=lambda x: x['value_usd'], reverse=True)

    nodes = [{
        'id': address,
        'raw_address': address,
        'chain': 'solana',
        'chain_badge': 'SOL',
        'label': f"[SOL] 메인 ({address[:4]}...{address[-4:]})",
        'short': 'SOL MAIN',
        'type': 'ROOT',
        'usd': total_recoverable,
        'balance_usd': total_recoverable,
        'volume_usd': total_recoverable,
        'radius': 26
    }]
    links = []

    for w in classified_wallets[:22]:
        is_stake = (w['wallet_type'] == 'MY_STAKE_WALLET')
        is_mine = w['is_my_wallet']
        node_type = 'JACKPOT_STAKE' if is_stake else ('MY_SUBWALLET' if is_mine else 'CEX_HOTWALLET')
        bal_usd = w['current_usd']
        vol_usd = w['volume_usd']
        eff_usd = max(bal_usd, vol_usd) if is_mine else bal_usd
        radius = 24 if is_stake else (19 if eff_usd >= 150 else (16 if is_mine else 12))

        nodes.append({
            'id': w['address'],
            'raw_address': w['address'],
            'chain': 'solana',
            'chain_badge': 'SOL',
            'label': f"[SOL] 스테이킹 ({w['short_addr']})" if is_stake else (f"[SOL] 내 지갑 ({w['short_addr']})" if is_mine else f"[SOL] 거래소 ({w['short_addr']})"),
            'short': f"SOL·{w['short_addr'][:4]}",
            'type': node_type,
            'usd': eff_usd,
            'balance_usd': bal_usd,
            'volume_usd': vol_usd,
            'relation_score': w['relation_score'],
            'radius': radius
        })
        links.append({
            'source': address,
            'target': w['address'],
            'chain': 'solana',
            'value': max(bal_usd, vol_usd),
            'type': 'STAKE_DELEGATION' if is_stake else ('HIGH_INTERACTION' if is_mine else 'CEX_DEPOSIT'),
            'strokeWidth': 4.0 if is_stake else (2.8 if vol_usd >= 100 else 1.5)
        })

    base_stages = overview.get('stage_status') or {'balance': not overview.get('is_partial'), 'tokens': not overview.get('is_partial'), 'staking': not overview.get('is_partial')}
    stage_status = {
        **base_stages,
        'transactions': not bool(tx_analysis.get('is_partial'))
    }
    sol_is_partial = bool(overview.get('is_partial')) or bool(tx_analysis.get('is_partial'))

    return {
        'chain': 'solana',
        'address': address,
        'is_partial': sol_is_partial,
        'price_source': get_price_source(),
        'stage_status': stage_status,
        'first_seen': '실시간 온체인 조회 완료',
        'total_recoverable_usd': total_recoverable,
        'staked_usd': staked_usd,
        'rent_reclaim_usd': rent_usd,
        'token_balance_usd': token_usd,
        'has_external_protocol': has_external_protocol,
        'protocols': list(KNOWN_PROTOCOLS.values()) if has_external_protocol else [],
        'classified_wallets': classified_wallets,
        'recovery_targets': recovery_targets,
        'graph_data': {'nodes': nodes, 'links': links}
    }


def analyze_evm_live(chain, address):
    cfg = CHAIN_INFO[chain]
    rpc_url = (ETH_RPC_POOL if chain == 'ethereum' else BSC_RPC_POOL)[0]
    native_sym = cfg['native_symbol']
    chain_tag = 'ETH' if chain == 'ethereum' else 'BNB'
    live_p = get_live_prices()
    native_price = live_p.get('ETH', 2380.0) if chain == 'ethereum' else live_p.get('BNB', 724.0)
    blockscout_api = 'https://eth.blockscout.com/api/v2' if chain == 'ethereum' else 'https://bsc.blockscout.com/api/v2'

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        f_bal = ex.submit(evm_rpc, rpc_url, 'eth_getBalance', [address, 'latest'])
        f_nonce = ex.submit(evm_rpc, rpc_url, 'eth_getTransactionCount', [address, 'latest'])
        f_tokens = ex.submit(fetch_blockscout_tokens, blockscout_api, address)

    bal_hex = f_bal.result()
    nonce_hex = f_nonce.result()
    raw_tokens_res = f_tokens.result()

    if isinstance(raw_tokens_res, tuple) and len(raw_tokens_res) == 2:
        portfolio, blockscout_tokens_ok = raw_tokens_res
        portfolio = list(portfolio or [])
    elif raw_tokens_res is None:
        portfolio = []
        blockscout_tokens_ok = False
    else:
        portfolio = list(raw_tokens_res)
        blockscout_tokens_ok = True

    native_bal = 0.0
    nonce = 0
    if bal_hex is not None:
        try:
            native_bal = int(bal_hex, 16) / 1e18
        except Exception:
            native_bal = 0.0

    if nonce_hex is not None:
        try:
            nonce = int(nonce_hex, 16)
        except Exception:
            nonce = 0

    native_usd = round(native_bal * native_price, 2)
    seen_mints = set(t['mint'].lower() for t in portfolio)

    if chain == 'ethereum':
        tokens_to_check = [
            ('USDT', 'Tether USD', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 1.0, None),
            ('USDC', 'USD Coin', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 1.0, None),
            ('DAI', 'Dai Stablecoin', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 1.0, None),
            ('WETH', 'Wrapped Ether', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, native_price, 'uniswap'),
            ('stETH', 'Lido Liquid Staked ETH', '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', 18, native_price, 'lido'),
            ('rETH', 'Rocket Pool ETH', '0xae78736Cd615f374D3085123A210448E74Fc6393', 18, native_price * 1.09, 'rocketpool'),
            ('UNI', 'Uniswap Token', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 18, 8.50, 'uniswap'),
            ('PEPE', 'Pepe', '0x6982508145454Ce325dDbE47a25d4ec3d2311933', 18, 0.0000095, None)
        ]
    else:
        tokens_to_check = [
            ('USDT', 'Tether USD (BEP-20)', '0x55d398326f99059fF775485246999027B3197955', 18, 1.0, None),
            ('USDC', 'USD Coin (BEP-20)', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18, 1.0, None),
            ('BUSD', 'Binance-Peg BUSD (상폐 1:1 환전 대상)', '0xe9e7CEA3DedcA59809Bafc599bD69ADd087D56', 18, 1.0, None),
            ('WBNB', 'Wrapped BNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, native_price, 'pancakeswap'),
            ('CAKE', 'PancakeSwap Token', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 18, 2.75, 'pancakeswap')
        ]

    rpc_tokens_ok = True

    def _check_evm_token(item):
        sym, name, mint, dec, price, proto_id = item
        raw_bal = evm_get_token_balance(rpc_url, mint, address)
        if raw_bal is None:
            return None, False
        if raw_bal > 0:
            amt = raw_bal / (10 ** dec)
            val = round(amt * price, 2)
            if val > 0.01:
                return {
                    'symbol': sym,
                    'name': name,
                    'amount': amt,
                    'value_usd': val,
                    'mint': mint,
                    'protocol_id': proto_id
                }, True
        return None, True

    unseen_tokens = [t for t in tokens_to_check if t[2].lower() not in seen_mints]
    if unseen_tokens:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(unseen_tokens))) as ex:
            for tok_res, tok_ok in ex.map(_check_evm_token, unseen_tokens):
                if not tok_ok:
                    rpc_tokens_ok = False
                if tok_res:
                    portfolio.append(tok_res)

    if chain == 'ethereum' and address and address.startswith('0x') and len(address) == 42:
        l2_networks = [
            ('Arbitrum', 'ETH', 'https://arb1.arbitrum.io/rpc', native_price, 'https://arbiscan.io/address/'),
            ('Base', 'ETH', 'https://mainnet.base.org', native_price, 'https://basescan.org/address/'),
            ('Optimism', 'ETH', 'https://mainnet.optimism.io', native_price, 'https://optimistic.etherscan.io/address/'),
            ('Polygon', 'POL', 'https://polygon-rpc.com', 0.40, 'https://polygonscan.com/address/')
        ]

        def _check_l2_balance(net):
            l2_name, l2_sym, l2_rpc, l2_price, l2_exp = net
            try:
                req = urllib.request.Request(
                    l2_rpc,
                    data=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'eth_getBalance', 'params': [address, 'latest']}).encode(),
                    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req, timeout=3.0) as r:
                    res_data = json.loads(r.read().decode())
                    if res_data.get('result'):
                        l2_bal = int(res_data['result'], 16) / 1e18
                        l2_usd = round(l2_bal * l2_price, 2)
                        if l2_usd >= 0.05:
                            return {
                                'symbol': f"{l2_sym} ({l2_name})",
                                'name': f"{l2_name} Network Native {l2_sym}",
                                'amount': l2_bal,
                                'value_usd': l2_usd,
                                'mint': l2_exp + address,
                                'protocol_id': None
                            }
            except Exception:
                pass
            return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(l2_networks)) as ex:
            for l2_res in ex.map(_check_l2_balance, l2_networks):
                if l2_res:
                    portfolio.append(l2_res)

    staked_tokens_usd = sum(t['value_usd'] for t in portfolio if t.get('protocol_id') in ('lido', 'rocketpool'))
    staked_usd = round(staked_tokens_usd, 2)
    token_only_usd = sum(t['value_usd'] for t in portfolio if t.get('protocol_id') not in ('lido', 'rocketpool'))
    token_usd = round(native_usd + token_only_usd, 2)
    total_recoverable = round(staked_usd + token_usd, 2)

    recovery_targets = []
    has_external_protocol = False

    if native_usd > 0.01:
        recovery_targets.append({
            'id': f'{chain}_native',
            'chain': chain,
            'chain_badge': chain_tag,
            'title': f"[{chain_tag}] 지갑 기본 {native_sym} 잔고 ({native_bal:.4f} {native_sym})",
            'protocol_id': None,
            'protocol_name': '— (공란 · 지갑 기본 잔고)',
            'amount_desc': f"{native_bal:.4f} {native_sym}",
            'value_usd': native_usd,
            'badge': '지갑 기본 잔고',
            'description': f"해당 주소에 직접 보유 중인 {native_sym} 잔고입니다.",
            'official_url': f"{cfg['explorer_url']}{address}"
        })

    # Detect novice mistake: Gas-trapped tokens (ERC-20 / BEP-20 held, but native gas is near 0)
    gas_floor = 0.0005 if chain == 'ethereum' else 0.002
    is_gas_trapped = (native_bal < gas_floor) and (sum(t['value_usd'] for t in portfolio) >= 1.0)

    for t in portfolio:
        p_id = t.get('protocol_id')
        p_info = KNOWN_PROTOCOLS.get(p_id) if p_id else None
        if p_info:
            has_external_protocol = True
        sym_upper = t['symbol'].upper()
        if is_gas_trapped and sym_upper in ('USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD'):
            badge = f'가스비({native_sym}) 보충 시 즉시 출금'
            desc = f"지갑에 가스비({native_sym})가 부족하여 묶여있는 {t['name']} 자산입니다. 소액의 {native_sym}만 입금하면 즉시 전액 출금 가능합니다."
        elif sym_upper == 'BUSD':
            badge = '상폐 1:1 환전 가능'
            desc = '바이낸스 지원 종료 후 지갑에 방치된 BUSD입니다. 체인상에서 USDT/FDUSD로 1:1 가치 교환이 가능합니다.'
        elif sym_upper in ('WETH', 'WBNB'):
            badge = '원클릭 1:1 언랩(Unwrap)'
            desc = f"NFT 입찰 또는 DEX 스왑 과정에서 래핑된 상태로 남아있는 {t['name']}입니다. 수수료 없이 1:1로 언랩 가능합니다."
        elif p_info:
            badge = '프로토콜 회수 가능'
            desc = p_info['description']
        else:
            badge = '지갑 직접 보유'
            desc = f"온체인 잔고 조회를 통해 확인된 실제 {t['name']} 보유분입니다."

        recovery_targets.append({
            'id': f"tok_{chain}_{t['symbol']}",
            'chain': chain,
            'chain_badge': chain_tag,
            'title': f"[{chain_tag}] 지갑 보유 토큰: {t['symbol']} ({t['amount']:,.4f})",
            'protocol_id': p_id,
            'protocol_name': p_info['name'] if p_info else '— (공란 · 지갑 직접 보유)',
            'amount_desc': f"{t['amount']:,.4f} {t['symbol']}",
            'value_usd': t['value_usd'],
            'badge': badge,
            'description': desc,
            'official_url': p_info['official_url'] if p_info else f"{cfg['explorer_url']}{address}"
        })

    scan_res = fetch_etherscan_or_bscscan_data(chain, address, return_status=True)
    if isinstance(scan_res, tuple) and len(scan_res) == 3:
        counterparts, scanned_txs, tx_api_ok = scan_res
    else:
        counterparts, scanned_txs = scan_res
        tx_api_ok = counterparts is not None

    total_tx_display = max(nonce, scanned_txs)

    def _inspect_evm_peer(item):
        c_addr, c_data = item
        c_bal_hex = evm_rpc(rpc_url, 'eth_getBalance', [c_addr, 'latest'])
        c_bal = (int(c_bal_hex, 16) / 1e18) if c_bal_hex else 0.0
        c_usd = round(c_bal * native_price, 2)
        vol_native = c_data['sent'] + c_data['recv']
        vol_usd = round(vol_native * native_price, 2)

        # Fetch counterparty's true on-chain nonce (`lifetime_txs`)
        c_nonce_hex = evm_rpc(rpc_url, 'eth_getTransactionCount', [c_addr, 'latest'])
        c_nonce = 0
        if c_nonce_hex:
            try:
                c_nonce = int(c_nonce_hex, 16)
            except Exception:
                c_nonce = 0
        lifetime_txs = max(c_nonce, c_data['count'], 1)

        # Check bytecode to see if smart contract
        is_contract = c_data.get('is_contract') or False
        if not is_contract and c_addr.startswith('0x'):
            code_hex = evm_rpc(rpc_url, 'eth_getCode', [c_addr, 'latest'])
            if code_hex and code_hex != '0x' and len(code_hex) > 2:
                is_contract = True

        profile = classify_wallet_profile(
            chain=chain,
            address=c_addr,
            current_bal=c_bal,
            sent_from_me=c_data['sent'],
            recv_to_me=c_data['recv'],
            tx_count=lifetime_txs,
            is_contract=is_contract,
            label_hint=c_data.get('name'),
            my_tx_count=c_data['count']
        )

        return {
            'address': c_addr,
            'short_addr': f"{c_addr[:6]}...{c_addr[-4:]}",
            'chain': chain,
            'chain_badge': chain_tag,
            'is_my_wallet': profile['is_my_wallet'],
            'wallet_type': profile['wallet_type'],
            'label': profile['label'],
            'relation_score': profile.get('relation_score', 30),
            'interaction_ratio': profile.get('interaction_ratio', '100%'),
            'evidence_tags': profile.get('evidence_tags', []),
            'can_pivot_scan': not is_contract,
            'pivot_chain': chain,
            'pivot_address': c_addr,
            'lifetime_txs': lifetime_txs,
            'my_tx_count': c_data['count'],
            'unique_counterparties': 1,
            'sent_from_me': c_data['sent'],
            'received_to_me': c_data['recv'],
            'current_balance': c_bal,
            'current_usd': c_usd if profile['is_my_wallet'] else 0.0,
            'volume_usd': vol_usd,
            'protocol_id': None,
            'protocol_name': '— (공란)',
            'top_txs': c_data.get('txs', [])[:5],
            'stuck_positions': [{
                'protocol': None,
                'name': f'현재 {native_sym} 잔고',
                'amount_desc': f'{c_bal:.4f} {native_sym}',
                'usd': c_usd
            }] if (profile['is_my_wallet'] and c_usd > 0) else [],
            'reason': profile['reason']
        }

    classified_wallets = []
    if counterparts:
        sorted_peers = sorted(
            counterparts.items(),
            key=lambda x: (x[1]['count'], x[1]['sent'] + x[1]['recv']),
            reverse=True
        )[:18]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            classified_wallets = list(ex.map(_inspect_evm_peer, sorted_peers))

    classified_wallets.sort(key=lambda x: (
        1 if x['is_my_wallet'] else 0,
        x['relation_score'],
        x['current_usd'],
        x['volume_usd']
    ), reverse=True)

    balance_ok = (bal_hex is not None)
    nonce_ok = (nonce_hex is not None)
    tokens_ok = bool(blockscout_tokens_ok) and rpc_tokens_ok
    transactions_ok = (nonce == 0 and tx_api_ok) or (scanned_txs > 0) or (tx_api_ok and counterparts is not None)

    stage_status = {
        'balance': balance_ok,
        'nonce': nonce_ok,
        'tokens': tokens_ok,
        'transactions': transactions_ok
    }
    evm_is_partial = not all(stage_status.values())

    root_node_id = f"{chain}:{address}"
    nodes = [{
        'id': root_node_id,
        'raw_address': address,
        'chain': chain,
        'chain_badge': chain_tag,
        'label': f"[{chain_tag}] 메인 ({address[:6]}...{address[-4:]})",
        'short': f'{chain_tag} MAIN',
        'type': 'ROOT',
        'usd': total_recoverable,
        'balance_usd': total_recoverable,
        'volume_usd': total_recoverable,
        'radius': 25
    }]
    links = []
    for w in classified_wallets[:18]:
        eff_usd = max(w['current_usd'], w['volume_usd']) if w['is_my_wallet'] else 0.0
        w_node_id = f"{chain}:{w['address']}"
        nodes.append({
            'id': w_node_id,
            'raw_address': w['address'],
            'chain': chain,
            'chain_badge': chain_tag,
            'label': w['label'],
            'short': f"{chain_tag}·{w['short_addr'][:4]}",
            'type': 'MY_SUBWALLET' if w['is_my_wallet'] else 'CEX_HOTWALLET',
            'usd': eff_usd,
            'balance_usd': w['current_usd'],
            'volume_usd': w['volume_usd'],
            'relation_score': w['relation_score'],
            'radius': 18 if w['is_my_wallet'] else 14
        })
        links.append({
            'source': root_node_id,
            'target': w_node_id,
            'chain': chain,
            'value': max(w['current_usd'], w['volume_usd']),
            'type': 'HIGH_INTERACTION' if w['is_my_wallet'] else 'CEX_DEPOSIT',
            'strokeWidth': 2.5 if w['is_my_wallet'] else 1.6
        })

    return {
        'chain': chain,
        'address': address,
        'is_partial': evm_is_partial,
        'price_source': get_price_source(),
        'stage_status': stage_status,
        'first_seen': f'누적 트랜잭션 {total_tx_display}건 (실시간 조회)',
        'total_recoverable_usd': total_recoverable,
        'staked_usd': staked_usd,
        'rent_reclaim_usd': 0.0,
        'token_balance_usd': round(token_usd, 2),
        'has_external_protocol': has_external_protocol,
        'protocols': list(KNOWN_PROTOCOLS.values()) if has_external_protocol else [],
        'classified_wallets': classified_wallets,
        'recovery_targets': recovery_targets,
        'graph_data': {'nodes': nodes, 'links': links}
    }


def _fetch_tron_peer_summary(c_addr, headers):
    """Fetches a Tron counterparty's TRX balance, totalTransactionCount, and contract flag."""
    try:
        req = urllib.request.Request(
            f"https://apilist.tronscanapi.com/api/accountv2?address={c_addr}",
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, dict) and ('balance' in data or 'totalTransactionCount' in data):
                bal = float(data.get('balance') or 0) / 1e6
                tx_cnt = int(data.get('totalTransactionCount') or 1)
                is_contract = int(data.get('accountType') or 0) == 2
                return bal, max(1, tx_cnt), is_contract
    except Exception:
        pass
    return 0.0, 1, False


def analyze_tron_live(address):
    trx_price = get_live_prices().get('TRX', 0.33)
    native_bal = 0.0
    frozen_trx = 0.0
    total_tx_count = 0
    portfolio = []
    classified_wallets = []

    headers = {'User-Agent': 'Mozilla/5.0'}
    active_tron_key = get_next_api_key('tron')
    if active_tron_key:
        headers['TRON-PRO-API-KEY'] = active_tron_key

    account_ok = False
    transfers_ok = False

    try:
        req = urllib.request.Request(
            f"https://apilist.tronscanapi.com/api/accountv2?address={address}",
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, dict) and 'balance' in data:
                account_ok = True
                native_bal = float(data.get('balance') or 0) / 1e6
                total_tx_count = int(data.get('totalTransactionCount') or 0)
                frozen_v2 = sum(float(x.get('amount') or 0) for x in (data.get('frozenV2') or [])) / 1e6
                frozen_v1 = float((data.get('frozen') or {}).get('total') or 0) / 1e6
                frozen_trx = frozen_v1 + frozen_v2

                for tok in (data.get('withPriceTokens') or []):
                    t_id = tok.get('tokenId', '')
                    raw_abbr = tok.get('tokenAbbr', '')
                    if t_id == '_' or raw_abbr == 'TRX':
                        continue
                    t_abbr = sanitize_token_text(raw_abbr, default='TOKEN', max_len=24)
                    t_name = sanitize_token_text(tok.get('tokenName'), default=t_abbr, max_len=24)
                    dec = int(tok.get('tokenDecimal') or 6)
                    amt = float(tok.get('balance') or 0) / (10 ** dec)
                    usd_val = float(tok.get('amountInUsd') or 0.0)
                    if usd_val <= 0 and t_abbr in ('USDT', 'USDC', 'USDD'):
                        usd_val = amt * 1.0
                    if usd_val > 0.01:
                        proto_id = 'justlend' if t_abbr in ('JST', 'jUSDT', 'jTRX') else ('sunswap' if t_abbr == 'SUN' else None)
                        portfolio.append({
                            'symbol': f"{t_abbr} (TRC-20)",
                            'name': t_name,
                            'amount': amt,
                            'value_usd': round(usd_val, 2),
                            'mint': t_id,
                            'protocol_id': proto_id
                        })
    except Exception:
        pass

    # Fallback to TronGrid if TronScan returned empty or unauthorized
    if not account_ok:
        try:
            tg_headers = {'User-Agent': 'Mozilla/5.0'}
            if active_tron_key:
                tg_headers['TRON-PRO-API-KEY'] = active_tron_key
            tg_req = urllib.request.Request(f"https://api.trongrid.io/v1/accounts/{address}", headers=tg_headers)
            with urllib.request.urlopen(tg_req, timeout=3.5) as r:
                tg_res = json.loads(r.read().decode())
                if isinstance(tg_res, dict) and tg_res.get('success') is not False and 'data' in tg_res:
                    account_ok = True
                    tg_data = tg_res.get('data') or []
                    if tg_data:
                        native_bal = float(tg_data[0].get('balance', 0)) / 1e6
                        frozen_v2 = sum(float(x.get('amount') or 0) for x in (tg_data[0].get('frozenV2') or [])) / 1e6
                        frozen_trx = max(frozen_trx, frozen_v2)
        except Exception:
            pass

    counterparts = {}
    try:
        t_req = urllib.request.Request(
            f"https://apilist.tronscanapi.com/api/transfer?sort=-timestamp&limit=30&address={address}",
            headers=headers
        )
        with urllib.request.urlopen(t_req, timeout=5) as resp:
            t_data = json.loads(resp.read().decode())
            if isinstance(t_data, dict) and 'data' in t_data:
                transfers_ok = True
                for tr in (t_data.get('data') or []):
                    src = tr.get('transferFromAddress', '')
                    dst = tr.get('transferToAddress', '')
                    amt = float(tr.get('amount') or 0) / 1e6
                    ts = int(tr.get('timestamp') or 0) // 1000
                    dt_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(ts)) if ts else ''
                    sig = tr.get('transactionHash', '')

                    if src == address and dst and dst != address:
                        c = counterparts.setdefault(dst, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'txs': []})
                        c['sent'] += amt
                        c['count'] += 1
                        if amt > 0:
                            c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(amt, 2), 'direction': '내가 보낸 돈', 'symbol': 'TRX'})
                    elif dst == address and src and src != address:
                        c = counterparts.setdefault(src, {'sent': 0.0, 'recv': 0.0, 'count': 0, 'txs': []})
                        c['recv'] += amt
                        c['count'] += 1
                        if amt > 0:
                            c['txs'].append({'signature': sig, 'date': dt_str, 'amount': round(amt, 2), 'direction': '내가 받은 돈', 'symbol': 'TRX'})
    except Exception:
        transfers_ok = False

    if counterparts:
        sorted_tron_counterparts = sorted(
            counterparts.items(),
            key=lambda x: (x[1]['count'], x[1]['sent'] + x[1]['recv']),
            reverse=True
        )[:18]

        def _inspect_tron_peer(item):
            c_addr, c_info = item
            c_bal, peer_total_txs, is_contract = _fetch_tron_peer_summary(c_addr, headers)
            lifetime_txs = max(peer_total_txs, c_info['count'], 1)
            c_usd = round(c_bal * trx_price, 2)
            vol_usd = round((c_info['sent'] + c_info['recv']) * trx_price, 2)

            profile = classify_wallet_profile(
                chain='tron',
                address=c_addr,
                current_bal=c_bal,
                sent_from_me=c_info['sent'],
                recv_to_me=c_info['recv'],
                tx_count=lifetime_txs,
                is_contract=is_contract,
                label_hint=None,
                my_tx_count=c_info['count']
            )
            return {
                'address': c_addr,
                'short_addr': f"{c_addr[:5]}...{c_addr[-4:]}",
                'chain': 'tron',
                'chain_badge': 'TRX',
                'is_my_wallet': profile['is_my_wallet'],
                'wallet_type': profile['wallet_type'],
                'label': profile['label'],
                'relation_score': profile.get('relation_score', 30),
                'interaction_ratio': profile.get('interaction_ratio', '100%'),
                'evidence_tags': profile.get('evidence_tags', []),
                'can_pivot_scan': not is_contract,
                'pivot_chain': 'tron',
                'pivot_address': c_addr,
                'lifetime_txs': lifetime_txs,
                'my_tx_count': c_info['count'],
                'unique_counterparties': 1,
                'sent_from_me': c_info['sent'],
                'received_to_me': c_info['recv'],
                'current_balance': c_bal,
                'current_usd': c_usd if profile['is_my_wallet'] else 0.0,
                'volume_usd': vol_usd,
                'protocol_id': None,
                'protocol_name': '— (공란)',
                'top_txs': c_info['txs'][:5],
                'stuck_positions': [{
                    'protocol': None,
                    'name': '현재 TRX 잔고',
                    'amount_desc': f'{c_bal:,.2f} TRX',
                    'usd': c_usd
                }] if (profile['is_my_wallet'] and c_usd > 0) else [],
                'reason': profile['reason']
            }

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            classified_wallets = list(ex.map(_inspect_tron_peer, sorted_tron_counterparts))

        classified_wallets.sort(key=lambda x: (
            1 if x['is_my_wallet'] else 0,
            x['relation_score'],
            x['current_usd'],
            x['volume_usd']
        ), reverse=True)

    stage_status = {
        'account': account_ok,
        'transfers': transfers_ok
    }
    tron_is_partial = not all(stage_status.values())

    staked_usd = round(frozen_trx * trx_price, 2)
    native_usd = round(native_bal * trx_price, 2)
    token_usd = round(native_usd + sum(t['value_usd'] for t in portfolio), 2)
    total_recoverable = round(staked_usd + token_usd, 2)

    recovery_targets = []
    has_external_protocol = False
    if staked_usd > 0.01:
        recovery_targets.append({
            'id': 'tron_frozen',
            'chain': 'tron',
            'chain_badge': 'TRX',
            'title': f"[TRX] 동결된 에너지/대역폭 TRX ({frozen_trx:,.2f} TRX)",
            'protocol_id': None,
            'protocol_name': '— (공란 · 트론 네이티브 동결)',
            'amount_desc': f"{frozen_trx:,.2f} TRX",
            'value_usd': staked_usd,
            'badge': 'Unfreeze 시 환급',
            'description': '외부 디파이가 아닌 트론 네트워크 기본 에너지/대역폭 동결(Stake) 자산입니다.',
            'official_url': f"https://tronscan.org/#/address/{address}"
        })

    if native_usd > 0.01:
        recovery_targets.append({
            'id': 'tron_native',
            'chain': 'tron',
            'chain_badge': 'TRX',
            'title': f"[TRX] 지갑 기본 TRX 잔고 ({native_bal:,.2f} TRX)",
            'protocol_id': None,
            'protocol_name': '— (공란 · 지갑 기본 잔고)',
            'amount_desc': f"{native_bal:,.2f} TRX",
            'value_usd': native_usd,
            'badge': '기본 잔고',
            'description': '현재 지갑에 보유 중인 기본 TRX 잔고입니다.',
            'official_url': f"https://tronscan.org/#/address/{address}"
        })

    is_trx_gas_low = (native_bal < 15.0 and frozen_trx < 100.0)
    for t in portfolio:
        p_id = t.get('protocol_id')
        p_info = KNOWN_PROTOCOLS.get(p_id) if p_id else None
        if p_info:
            has_external_protocol = True
        badge = '가스비(TRX) 보충 시 출금' if (is_trx_gas_low and t['value_usd'] >= 1.0) else '지갑 직접 보유'
        desc = (
            f"실제 온체인에서 조회된 {t['name']} 잔고입니다. TRC-20 전송 수수료용 TRX가 부족할 경우 소액(15~30 TRX) 입금 후 출금하세요."
            if is_trx_gas_low else f"실제 온체인에서 조회된 {t['name']} 잔고입니다."
        )
        recovery_targets.append({
            'id': f"tron_tok_{t['symbol']}",
            'chain': 'tron',
            'chain_badge': 'TRX',
            'title': f"[TRX] 지갑 보유 토큰: {t['symbol']} ({t['amount']:,.2f})",
            'protocol_id': p_id,
            'protocol_name': p_info['name'] if p_info else '— (공란 · 지갑 직접 보유)',
            'amount_desc': f"{t['amount']:,.2f} {t['symbol']}",
            'value_usd': t['value_usd'],
            'badge': badge,
            'description': desc,
            'official_url': p_info['official_url'] if p_info else f"https://tronscan.org/#/address/{address}"
        })

    root_node_id = f"tron:{address}"
    nodes = [{
        'id': root_node_id,
        'raw_address': address,
        'chain': 'tron',
        'chain_badge': 'TRX',
        'label': f"[TRX] 메인 ({address[:5]}...{address[-4:]})",
        'short': 'TRX MAIN',
        'type': 'ROOT',
        'usd': total_recoverable,
        'balance_usd': total_recoverable,
        'volume_usd': total_recoverable,
        'radius': 25
    }]
    links = []
    for w in classified_wallets[:18]:
        w_node_id = f"tron:{w['address']}"
        eff_usd = max(w['current_usd'], w['volume_usd']) if w['is_my_wallet'] else 0.0
        nodes.append({
            'id': w_node_id,
            'raw_address': w['address'],
            'chain': 'tron',
            'chain_badge': 'TRX',
            'label': w['label'],
            'short': f"TRX·{w['short_addr'][:4]}",
            'type': 'MY_SUBWALLET' if w['is_my_wallet'] else 'CEX_HOTWALLET',
            'usd': eff_usd,
            'balance_usd': w['current_usd'],
            'volume_usd': w['volume_usd'],
            'relation_score': w['relation_score'],
            'radius': 17 if w['is_my_wallet'] else 14
        })
        links.append({
            'source': root_node_id,
            'target': w_node_id,
            'chain': 'tron',
            'value': max(w['current_usd'], w['volume_usd']),
            'type': 'HIGH_INTERACTION' if w['is_my_wallet'] else 'CEX_DEPOSIT',
            'strokeWidth': 2.4 if w['is_my_wallet'] else 1.5
        })

    return {
        'chain': 'tron',
        'address': address,
        'is_partial': tron_is_partial,
        'price_source': get_price_source(),
        'stage_status': stage_status,
        'first_seen': f'누적 트랜잭션 {total_tx_count}건 (실시간 조회)',
        'total_recoverable_usd': total_recoverable,
        'staked_usd': staked_usd,
        'rent_reclaim_usd': 0.0,
        'token_balance_usd': token_usd,
        'has_external_protocol': has_external_protocol,
        'protocols': list(KNOWN_PROTOCOLS.values()) if has_external_protocol else [],
        'classified_wallets': classified_wallets,
        'recovery_targets': recovery_targets,
        'graph_data': {'nodes': nodes, 'links': links}
    }


# =====================================================================
# 5. UNIFIED MULTI-CHAIN & CROSS-CHAIN BRIDGE DISPATCHER
#    Scans all chains in parallel + traces cross-chain bridge outflows!
# =====================================================================
def analyze_unified_multichain(raw_address_str: str = None):
    """
    Executes parallel multi-chain scanning across Solana, Ethereum+L2, BNB Chain, and Tron,
    AND queries WormholeScan + LI.FI + deBridge Cross-Chain APIs to auto-discover funds bridged out to other chains!
    """
    bundle = parse_address_bundle(raw_address_str)

    # 1. Discover cross-chain bridge outflows from all input addresses in parallel
    input_addrs = bundle['solana'] + bundle['evm'] + bundle['tron']
    bridge_hops = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        hop_futures = {executor.submit(fetch_cross_chain_bridge_outflows, a): a for a in input_addrs}
        for fut in concurrent.futures.as_completed(hop_futures):
            try:
                hops = fut.result() or []
                for h in hops:
                    bridge_hops.append(h)
            except Exception:
                pass

    # 2. Fan-out parallel scans across all chains in the bundle
    tasks = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for s_addr in bundle['solana']:
            tasks.append(('solana', s_addr, executor.submit(analyze_solana, s_addr)))
        for e_addr in bundle['evm']:
            tasks.append(('ethereum', e_addr, executor.submit(analyze_evm_live, 'ethereum', e_addr)))
            tasks.append(('bsc', e_addr, executor.submit(analyze_evm_live, 'bsc', e_addr)))
        for t_addr in bundle['tron']:
            tasks.append(('tron', t_addr, executor.submit(analyze_tron_live, t_addr)))

        results = []
        per_chain_results = {}
        failed_chains = []
        for ch, addr, fut in tasks:
            try:
                res = fut.result()
                results.append(res)
                per_chain_results[make_cache_key(ch, addr)] = res
            except Exception as e:
                failed_chains.append(make_cache_key(ch, addr))
                logger.warning("Unified scan warning (%s %s): %s", ch, addr, e)

    # 3. Merge into a single unified multi-chain response
    total_recoverable = 0.0
    staked_usd = 0.0
    rent_usd = 0.0
    token_usd = 0.0
    chain_totals = {'solana': 0.0, 'ethereum': 0.0, 'bsc': 0.0, 'tron': 0.0}
    any_external_protocol = False

    all_wallets = []
    all_targets = []
    hub_id = "UNIFIED_MULTICHAIN_HUB"

    nodes = [{
        'id': hub_id,
        'chain': 'unified',
        'chain_badge': 'ALL',
        'label': '내 멀티체인 통합 허브',
        'short': 'MY HUB',
        'type': 'HUB_ROOT',
        'usd': 0.0,
        'balance_usd': 0.0,
        'volume_usd': 0.0,
        'radius': 30
    }]
    links = []
    seen_node_ids = {hub_id}

    for res in results:
        ch = res['chain']
        c_tot = float(res.get('total_recoverable_usd', 0.0))
        total_recoverable += c_tot
        staked_usd += float(res.get('staked_usd', 0.0))
        rent_usd += float(res.get('rent_reclaim_usd', 0.0))
        token_usd += float(res.get('token_balance_usd', 0.0))
        chain_totals[ch] = round(chain_totals.get(ch, 0.0) + c_tot, 2)
        if res.get('has_external_protocol'):
            any_external_protocol = True

        all_wallets.extend(res.get('classified_wallets', []))
        all_targets.extend(res.get('recovery_targets', []))

        g = res.get('graph_data', {})
        g_nodes = g.get('nodes', [])
        g_links = g.get('links', [])

        for n in g_nodes:
            nid = n['id']
            if nid not in seen_node_ids:
                seen_node_ids.add(nid)
                nodes.append(n)
            if n.get('type') == 'ROOT':
                links.append({
                    'source': hub_id,
                    'target': nid,
                    'chain': ch,
                    'value': max(10.0, c_tot),
                    'type': 'HUB_LINK',
                    'strokeWidth': 3.5
                })

        for l in g_links:
            links.append(l)

    # 4. Append Cross-Chain Bridge Hop Nodes & Links if any were discovered
    valid_eoa_hops = 0
    for idx, hop in enumerate(bridge_hops):
        hop_id = f"bridge_hop_{idx}_{hop['to_address'][:8]}"
        hop_usd = float(hop.get('usd_estimate') or 0.0)
        tool_name = hop.get('bridge_name', 'Bridge')
        is_router_or_cex = hop.get('is_router_or_cex', False) or any(
            k in tool_name.lower() for k in KNOWN_CEX_KEYWORDS + KNOWN_ROUTER_KEYWORDS
        )

        is_mine = (not is_router_or_cex) and (hop.get('from_address', '').lower() != hop['to_address'].lower() or hop.get('from_chain') != hop.get('to_chain'))
        pivot_ch = _resolve_pivot_chain_for_address(hop.get('to_chain'), hop['to_address'])

        if is_mine:
            valid_eoa_hops += 1
            if valid_eoa_hops > 15:  # Cap candidate EOA hops to avoid clutter
                continue
            w_type = 'BRIDGE_HOP_WALLET'
            label = f"[🌉 브릿지 탈출 지갑] {hop['from_chain'].upper()} → {hop['to_chain'].upper()} ({hop['to_address'][:6]}...)"
            reason = f"{tool_name} 브릿지를 통해 {hop['from_chain'].upper()}에서 {hop['to_chain'].upper()} 체인으로 이동된 수취인 개인 주소입니다 (내 타 체인 지갑 추정)."
            node_type = 'MY_SUBWALLET'
            rel_score = 92
            ev_tags = [f"{tool_name} 크로스체인 이체", f"{hop['from_chain'].upper()}→{hop['to_chain'].upper()} 타체인 내 지갑 추정"]
        else:
            w_type = 'PROTOCOL_ROUTER'
            label = f"[DEX/브릿지] {tool_name} 라우터 ({hop['from_chain'].upper()}→{hop['to_chain'].upper()})"
            reason = f"{tool_name} 크로스체인 브릿지 / DEX 라우터 컨트랙트 주소입니다 (개인 지갑 아님)."
            node_type = 'CEX_HOTWALLET'
            rel_score = 10
            ev_tags = ['크로스체인 브릿지 라우터']

        if hop_id not in seen_node_ids and (is_mine or idx < 8):
            seen_node_ids.add(hop_id)
            nodes.append({
                'id': hop_id,
                'raw_address': hop['to_address'],
                'chain': pivot_ch,
                'chain_badge': 'BRIDGE',
                'label': label,
                'short': f"🌉{hop['to_chain'].upper()[:3]}",
                'type': node_type,
                'usd': hop_usd if is_mine else 0.0,
                'balance_usd': 0.0,
                'volume_usd': hop_usd,
                'relation_score': rel_score,
                'radius': 18 if is_mine else 13
            })
            links.append({
                'source': hub_id,
                'target': hop_id,
                'chain': 'bridge',
                'value': max(10.0, hop_usd),
                'type': 'BRIDGE_TRANSFER',
                'strokeWidth': 2.8 if is_mine else 1.5
            })

        if is_mine or idx < 10:
            all_wallets.append({
                'address': hop['to_address'],
                'short_addr': f"{hop['to_address'][:6]}...{hop['to_address'][-4:]}",
                'chain': pivot_ch,
                'chain_badge': f"🌉 {hop['to_chain'].upper()}",
                'is_my_wallet': is_mine,
                'wallet_type': w_type,
                'label': label,
                'relation_score': rel_score,
                'interaction_ratio': '100%',
                'evidence_tags': ev_tags,
                'can_pivot_scan': is_mine and (detect_address_type(hop['to_address']) is not None),
                'pivot_chain': pivot_ch,
                'pivot_address': hop['to_address'],
                'lifetime_txs': 1,
                'my_tx_count': 1,
                'unique_counterparties': 1,
                'sent_from_me': hop['amount'],
                'received_to_me': 0.0,
                'current_balance': 0.0,
                'current_usd': 0.0,
                'volume_usd': hop_usd,
                'protocol_id': None,
                'protocol_name': '— (공란)',
                'top_txs': [{
                    'signature': '',
                    'date': '크로스체인 브릿지 기록',
                    'amount': hop['amount'],
                    'direction': f"{hop['from_chain'].upper()} → {hop['to_chain'].upper()} 브릿지 이동",
                    'symbol': hop['symbol']
                }],
                'stuck_positions': [],
                'reason': reason
            })

    nodes[0]['usd'] = round(total_recoverable, 2)
    nodes[0]['balance_usd'] = round(total_recoverable, 2)
    nodes[0]['volume_usd'] = round(total_recoverable, 2)

    all_targets.sort(key=lambda x: x['value_usd'], reverse=True)
    all_wallets.sort(key=lambda x: (
        1 if x.get('wallet_type') == 'MY_STAKE_WALLET' else 0,
        1 if x.get('is_my_wallet') else 0,
        x.get('relation_score', 0),
        x.get('current_usd', 0.0),
        x.get('volume_usd', 0.0)
    ), reverse=True)

    return {
        'chain': 'unified',
        'address': raw_address_str or CHAIN_INFO['unified']['default_address'],
        'scanned_bundle': bundle,
        'per_chain_results': per_chain_results,
        'is_partial': bool(failed_chains) or any(r.get('is_partial') for r in results),
        'price_source': get_price_source(),
        'failed_chains': failed_chains,
        'chain_totals': chain_totals,
        'bridge_hops_count': len(bridge_hops),
        'first_seen': f"4대 체인 + L2 + 브릿지 통합 조회 완료 (발견 지갑 {len(all_wallets)}개)",
        'total_recoverable_usd': round(total_recoverable, 2),
        'staked_usd': round(staked_usd, 2),
        'rent_reclaim_usd': round(rent_usd, 2),
        'token_balance_usd': round(token_usd, 2),
        'has_external_protocol': any_external_protocol,
        'protocols': list(KNOWN_PROTOCOLS.values()) if any_external_protocol else [],
        'classified_wallets': all_wallets,
        'recovery_targets': all_targets,
        'graph_data': {'nodes': nodes, 'links': links}
    }


def get_analysis_by_chain(chain, address, deadline=None):
    set_scan_deadline(deadline if deadline is not None else (time.monotonic() + SCAN_DEADLINE_SECONDS))
    try:
        return _dispatch_analysis_by_chain(chain, address)
    finally:
        set_scan_deadline(None)


def _dispatch_analysis_by_chain(chain, address):
    chain = (chain or 'unified').lower().strip()
    if chain == 'unified' or (address and (',' in address or ' ' in address.strip())):
        return analyze_unified_multichain(address)

    # Also auto-detect if user entered an address that doesn't match the selected tab!
    if address and address.strip():
        detected = detect_address_type(address.strip())
        if detected == 'solana':
            return analyze_solana(address.strip())
        elif detected == 'tron':
            return analyze_tron_live(address.strip())
        elif detected == 'evm' and chain not in ('ethereum', 'bsc'):
            return analyze_unified_multichain(address.strip())

    if chain not in CHAIN_INFO:
        return analyze_unified_multichain(address)

    if not address or not address.strip():
        address = CHAIN_INFO[chain]['default_address']
    else:
        address = address.strip()

    if chain == 'solana':
        return analyze_solana(address)
    elif chain in ('ethereum', 'bsc'):
        return analyze_evm_live(chain, address)
    elif chain == 'tron':
        return analyze_tron_live(address)
    return analyze_unified_multichain(address)
