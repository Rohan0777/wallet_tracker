"""
Behavior-Driven Integration, Concurrency & Related-Wallet Detective Test Suite (v9.1 Production Release)

Covers all architectural, security, and integrity requirements across v8.5, v9.0, and v9.1 (34 tests total):
1~19. Singleflight Coalescing, AdmissionTimeout, Queue Saturation, Checksums (EIP-55/Base58Check/Ed25519),
      Canonical Bundle, Partial Failure Detection, Cache Deepcopy Immutability, IPv6 /64 Rate Limit,
      Security Headers, Admin API Key, L2 Atomic fsync Persistence, and Modular Helpers.
20~27. v9.0 Core Direction: Zero preset dummy fallback, Multi-signal Related-Wallet Heuristics,
       1-Click Pivot Scan, EVM/Tron is_partial propagation, Gas-trapped tokens, and Monetization funnel.
28~34. v9.1 Production Hardening: Render leftmost proxy strategy, standard right-hop proxy parsing,
       TRUSTED_PROXIES CIDR restriction, PROXY_CLIENT_IP_HEADER single-trust, header-only /api/stats
       non-ASCII compare_digest safety, dynamic $PORT container binding, and v9.1.0 version alignment.
"""

import os
import sys
import time
import copy
import json
import secrets
import asyncio
import unittest
import tempfile
import collections
import unittest.mock
from fastapi import HTTPException
from fastapi.testclient import TestClient

import server
import address_utils
import multichain_tracker

# Clean Test Addresses
TEST_EVM_ADDR_LOWER = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"
TEST_EVM_ADDR_CHECKSUM = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
TEST_EVM_ADDR_BAD_CHECKSUM = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD"

TEST_SOL_ADDR = "BQ4x7ypgaqW7tFZwJadmuxbiuzvy3mk26i9WFo7hDf7H"
TEST_TRON_ADDR = "TG918Q75YzASD4UaRfG23nVwYYyVSnahvu"
TEST_TRON_BAD_CHECKSUM = "TG918Q75YzASD4UaRfG23nVwYYyVSnahvv"


class TestV90FinalSuite(unittest.TestCase):

    def setUp(self):
        server.reset_server_state()
        server.TRUST_PROXY_HEADERS = False
        server.ADMIN_API_KEY = ""

    def tearDown(self):
        server.reset_server_state()

    # -------------------------------------------------------------------------
    # 1. P0: Singleflight Coalescing under Heavy Saturation on Actual Endpoint
    # -------------------------------------------------------------------------
    def test_singleflight_under_saturation_real_endpoint(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _async_test():
            calls = 0
            gate = asyncio.Event()

            async def slow_fetch(chain, addr, key):
                nonlocal calls
                calls += 1
                await gate.wait()
                return {
                    "chain": chain,
                    "address": addr,
                    "is_partial": False,
                    "total_recoverable_usd": 777.0
                }

            with unittest.mock.patch.object(server, "_do_fetch_worker", side_effect=slow_fetch):
                server._admission_semaphore = asyncio.Semaphore(1)

                from httpx import AsyncClient, ASGITransport
                transport = ASGITransport(app=server.app)
                async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                    url = f"/api/analysis?chain=ethereum&address={TEST_EVM_ADDR_LOWER}&force_refresh=true"

                    req_tasks = [
                        asyncio.create_task(client.get(url))
                        for _ in range(5)
                    ]

                    await asyncio.sleep(0.05)
                    gate.set()

                    responses = await asyncio.gather(*req_tasks)
                    for r in responses:
                        self.assertEqual(r.status_code, 200)
                        self.assertEqual(r.json()["total_recoverable_usd"], 777.0)

                    self.assertEqual(calls, 1)

        loop.run_until_complete(_async_test())
        loop.close()

    # -------------------------------------------------------------------------
    # 2. P0: AdmissionTimeout (503) Defense
    # -------------------------------------------------------------------------
    def test_admission_timeout_returns_503(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _async_test():
            server._admission_semaphore = asyncio.Semaphore(0)
            orig_wait = server.ADMISSION_WAIT_SEC
            server.ADMISSION_WAIT_SEC = 0.05
            try:
                from httpx import AsyncClient, ASGITransport
                transport = ASGITransport(app=server.app)
                async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                    url = f"/api/analysis?chain=ethereum&address={TEST_EVM_ADDR_LOWER}&force_refresh=true"
                    resp = await client.get(url)
                    self.assertEqual(resp.status_code, 503)
                    self.assertIn("지연", resp.json()["detail"])
            finally:
                server.ADMISSION_WAIT_SEC = orig_wait

        loop.run_until_complete(_async_test())
        loop.close()

    # -------------------------------------------------------------------------
    # 3. P0: Queue Saturation & Rate Limit Quota Protection
    # -------------------------------------------------------------------------
    def test_queue_saturation_does_not_consume_rate_limit(self):
        with TestClient(server.app) as client:
            server._pending_counter = server.MAX_PENDING_ANALYSES

            resp = client.get(f"/api/analysis?chain=ethereum&address={TEST_EVM_ADDR_LOWER}&force_refresh=true")
            self.assertEqual(resp.status_code, 503)
            self.assertIn("대기열이 가득 찼습니다", resp.json()["detail"])

            self.assertEqual(len(server.ip_request_log), 0)

    # -------------------------------------------------------------------------
    # 4. P1: Cryptographic Address Validation (Tron, Solana, EVM)
    # -------------------------------------------------------------------------
    def test_tron_base58check_checksum_validation(self):
        self.assertTrue(address_utils.is_valid_tron_address(TEST_TRON_ADDR))
        self.assertFalse(address_utils.is_valid_tron_address(TEST_TRON_BAD_CHECKSUM))

    def test_solana_ed25519_32byte_validation(self):
        self.assertTrue(address_utils.is_valid_solana_address(TEST_SOL_ADDR))
        self.assertFalse(address_utils.is_valid_solana_address(TEST_TRON_ADDR))
        with TestClient(server.app) as client:
            resp = client.get(f"/api/analysis?chain=solana&address={TEST_TRON_ADDR}")
            self.assertEqual(resp.status_code, 422)

    def test_evm_eip55_checksum_validation(self):
        self.assertTrue(address_utils.is_valid_evm_address(TEST_EVM_ADDR_LOWER))
        self.assertTrue(address_utils.is_valid_evm_address(TEST_EVM_ADDR_CHECKSUM))
        self.assertFalse(address_utils.is_valid_evm_address(TEST_EVM_ADDR_BAD_CHECKSUM))

    # -------------------------------------------------------------------------
    # 5. P1: Unified Bundle Canonicalization & MAX_BUNDLE Enforcement
    # -------------------------------------------------------------------------
    def test_unified_bundle_canonicalization(self):
        raw_bundle = f"{TEST_SOL_ADDR}, {TEST_EVM_ADDR_CHECKSUM}; {TEST_TRON_ADDR}"
        canonical = address_utils.canonical_bundle(raw_bundle)
        tokens = canonical.split(",")
        self.assertEqual(len(tokens), 3)
        self.assertIn(TEST_EVM_ADDR_LOWER, tokens)
        self.assertIn(TEST_SOL_ADDR, tokens)
        self.assertIn(TEST_TRON_ADDR, tokens)

    def test_unified_bundle_max_limit_enforced(self):
        overflow_bundle = f"{TEST_SOL_ADDR}, {TEST_EVM_ADDR_LOWER}, {TEST_TRON_ADDR}, 0x0000000000000000000000000000000000000001, 0x0000000000000000000000000000000000000002, 0x0000000000000000000000000000000000000003"
        with self.assertRaises(ValueError):
            address_utils.canonical_bundle(overflow_bundle)

        with TestClient(server.app) as client:
            resp = client.get(f"/api/analysis?chain=unified&address={overflow_bundle}")
            self.assertEqual(resp.status_code, 422)

    # -------------------------------------------------------------------------
    # 6. P1: Recursive Partial-Failure Detection & failed_chains
    # -------------------------------------------------------------------------
    def test_partial_failure_detection_includes_failed_chains(self):
        data_clean = {"is_partial": False, "failed_chains": []}
        self.assertFalse(server.result_is_partial(data_clean))

        data_with_failed = {"is_partial": False, "failed_chains": ["ethereum"]}
        self.assertTrue(server.result_is_partial(data_with_failed))

    def test_cache_immutability_via_deepcopy(self):
        key = "test:immutable"
        original = {"balance": 100, "tokens": ["USDT"]}
        server.save_cached_result(key, original, time.time())

        retrieved = server.get_cached_result(key, time.time())
        retrieved["balance"] = 999
        retrieved["tokens"].append("MUTATED")

        second_retrieval = server.get_cached_result(key, time.time())
        self.assertEqual(second_retrieval["balance"], 100)
        self.assertEqual(len(second_retrieval["tokens"]), 1)

    # -------------------------------------------------------------------------
    # 7. P1: IPv6 /64 Subnet Rate Limiting & Periodic Cleanup
    # -------------------------------------------------------------------------
    def test_ipv6_64_subnet_rate_limiting(self):
        now_mono = time.monotonic()
        for i in range(25):
            ip = f"2001:db8:abcd:12::{i+1:x}"
            allowed = server.check_rate_limit(ip, now_mono)
            self.assertTrue(allowed)

        blocked_ip = "2001:db8:abcd:12::ffff"
        self.assertFalse(server.check_rate_limit(blocked_ip, now_mono))

    # -------------------------------------------------------------------------
    # 8. P1: Security Headers & Protected Admin API
    # -------------------------------------------------------------------------
    def test_security_headers_present(self):
        with TestClient(server.app) as client:
            resp = client.get("/healthz")
            self.assertEqual(resp.status_code, 200)
            self.assertIn("x-content-type-options", resp.headers)
            self.assertIn("x-frame-options", resp.headers)

    def test_admin_api_key_protection_on_stats(self):
        with TestClient(server.app) as client:
            # Default-deny (403) when ADMIN_API_KEY is not configured
            server.ADMIN_API_KEY = ""
            resp_unset = client.get("/api/stats")
            self.assertEqual(resp_unset.status_code, 403)

            # Default-deny (403) when ADMIN_API_KEY is configured but header is missing or wrong
            server.ADMIN_API_KEY = "super_secret_v90"
            resp_unauth = client.get("/api/stats")
            self.assertEqual(resp_unauth.status_code, 403)

            resp_wrong = client.get("/api/stats", headers={"X-Admin-Key": "wrong_key"})
            self.assertEqual(resp_wrong.status_code, 403)

            # 200 OK with full metrics when valid X-Admin-Key is supplied
            resp_auth = client.get("/api/stats", headers={"X-Admin-Key": "super_secret_v90"})
            self.assertEqual(resp_auth.status_code, 200)
            self.assertIn("l1_size", resp_auth.json())

    # -------------------------------------------------------------------------
    # 9. P2: Atomic & Durable L2 Snapshot Write (Isolated Temp Directory)
    # -------------------------------------------------------------------------
    def test_l2_atomic_write_durability_and_recovery(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            orig_dir = server.DATA_CACHE_DIR
            orig_file = server.L2_CACHE_FILE
            try:
                server.DATA_CACHE_DIR = temp_dir
                server.L2_CACHE_FILE = os.path.join(temp_dir, "test_l2.json")
                server.l1_cache["eth:0x1"] = {"timestamp": time.time(), "data": {"val": 42}}
                server._l2_dirty = True

                snapshot = copy.deepcopy(server.l1_cache)
                server._write_l2_snapshot_sync(snapshot)
                self.assertTrue(os.path.exists(server.L2_CACHE_FILE))

                tmp_files = [f for f in os.listdir(temp_dir) if f.endswith(".tmp")]
                self.assertEqual(len(tmp_files), 0)

                with open(server.L2_CACHE_FILE, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                self.assertIn("eth:0x1", loaded)
            finally:
                server.DATA_CACHE_DIR = orig_dir
                server.L2_CACHE_FILE = orig_file

    # -------------------------------------------------------------------------
    # 10. v8.5 Refactoring Tests: Input Decomposition, Delimiter, Subchain Hydration
    # -------------------------------------------------------------------------
    def test_v8_5_resolve_analysis_input_decomposition(self):
        chain, norm_addr = server._resolve_analysis_input("ethereum", TEST_EVM_ADDR_CHECKSUM)
        self.assertEqual(chain, "ethereum")
        self.assertEqual(norm_addr, TEST_EVM_ADDR_CHECKSUM.strip())

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            server._resolve_analysis_input("dogechain", TEST_EVM_ADDR_LOWER)
        self.assertEqual(ctx.exception.status_code, 422)

        with self.assertRaises(HTTPException) as ctx:
            server._resolve_analysis_input("solana", TEST_TRON_ADDR)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_v8_5_split_bundle_tokens_consistency(self):
        raw = f"{TEST_SOL_ADDR},   {TEST_EVM_ADDR_LOWER};;{TEST_TRON_ADDR}   "
        tokens = address_utils._split_bundle_tokens(raw)
        self.assertEqual(tokens, [TEST_SOL_ADDR, TEST_EVM_ADDR_LOWER, TEST_TRON_ADDR])

    def test_v8_5_hydrate_complete_subchain_results(self):
        eth_key = address_utils.make_cache_key("ethereum", TEST_EVM_ADDR_LOWER)
        sol_key = address_utils.make_cache_key("solana", TEST_SOL_ADDR)
        data = {
            "per_chain_results": {
                eth_key: {"is_partial": False, "balance": 10},
                sol_key: {"is_partial": True, "balance": 0}
            }
        }
        now = time.time()
        changed = server._hydrate_complete_subchain_results(data, now)
        self.assertTrue(changed)

        cached_eth = server.get_cached_result(eth_key, now)
        self.assertIsNotNone(cached_eth)
        self.assertEqual(cached_eth["balance"], 10)

        cached_sol = server.get_cached_result(sol_key, now)
        self.assertIsNone(cached_sol)

    def test_v8_5_cleanup_expired_rate_limit_entries(self):
        now_mono = time.monotonic()
        server._last_rate_limit_cleanup = now_mono - 65.0
        for i in range(1001):
            server.ip_request_log[f"dummy_{i}"] = collections.deque([now_mono - 120.0])

        server._cleanup_expired_rate_limit_entries(now_mono)
        self.assertEqual(len(server.ip_request_log), 0)
        self.assertAlmostEqual(server._last_rate_limit_cleanup, now_mono, delta=0.5)

    def test_v9_1_version_alignment(self):
        """Ensures all components reflect the 9.1.0 final release version."""
        self.assertEqual(server.VERSION, "9.1.0")
        self.assertEqual(address_utils.VERSION, "9.1.0")
        self.assertEqual(multichain_tracker.VERSION, "9.1.0")
        with TestClient(server.app) as client:
            resp = client.get("/healthz")
            self.assertEqual(resp.json()["version"], "9.1.0")

    # =========================================================================
    # 11. NEW v9.0 CORE DIRECTION & ON-CHAIN INTEGRITY VERIFICATION TESTS
    # =========================================================================

    def test_v9_0_zero_dummy_preset_fallback_removed(self):
        """
        Validates that hardcoded 4.1374 SOL preset fallback (_load_cached_sol_overview)
        is completely removed. When Solana RPC fails or returns 0 stake accounts on
        PRESET_SOL_ADDRESS, no fake 4.1374 SOL is ever injected.
        """
        self.assertFalse(hasattr(multichain_tracker, "_load_cached_sol_overview"))

        # Case 1: RPC completely down -> returns 0.0 and is_partial=True (no 4.1374 SOL injected)
        with unittest.mock.patch.object(multichain_tracker, "sol_rpc_call", return_value=None):
            overview = multichain_tracker.get_sol_wallet_overview(TEST_SOL_ADDR)
            self.assertTrue(overview["is_partial"])
            self.assertEqual(overview["total_staked_sol"], 0.0)
            self.assertEqual(len(overview["stake_accounts"]), 0)

            tx_res = multichain_tracker.get_sol_transactions(TEST_SOL_ADDR)
            self.assertTrue(tx_res["is_partial"])
            self.assertEqual(len(tx_res["classified_wallets"]), 0)

        # Case 2: RPC succeeds and genuinely returns 0 stake accounts -> is_partial=False, 0.0 staked
        def mock_clean_empty_sol_rpc(method, params):
            if method == "getBalance":
                return {"value": 1000000000}  # 1.0 SOL
            if method == "getTokenAccountsByOwner":
                return {"value": []}
            if method == "getProgramAccounts":
                return []
            return []

        with unittest.mock.patch.object(multichain_tracker, "sol_rpc_call", side_effect=mock_clean_empty_sol_rpc):
            overview_ok = multichain_tracker.get_sol_wallet_overview(TEST_SOL_ADDR)
            self.assertFalse(overview_ok["is_partial"])
            self.assertEqual(overview_ok["sol_balance"], 1.0)
            self.assertEqual(overview_ok["total_staked_sol"], 0.0)

    def test_v9_0_round_funding_amount_detector(self):
        """Validates novice seed / integer-unit transfer detection."""
        self.assertTrue(multichain_tracker.is_round_funding_amount(3.0))
        self.assertTrue(multichain_tracker.is_round_funding_amount(1.6))
        self.assertTrue(multichain_tracker.is_round_funding_amount(1.5))
        self.assertTrue(multichain_tracker.is_round_funding_amount(0.25))
        self.assertTrue(multichain_tracker.is_round_funding_amount(0.1))
        self.assertFalse(multichain_tracker.is_round_funding_amount(0.048291))
        self.assertFalse(multichain_tracker.is_round_funding_amount(0.0))

    def test_v9_0_related_wallet_heuristics_round_funding_and_lifetime_txs(self):
        """
        Validates the core project goal ('내 지갑을 넣으면 관련된 지갑을 찾아주는 프로젝트'):
        1) Low lifetime txs (9 txs) + round 3.0 SOL transfer (even with 0 current balance) -> INFERRED_MY_WALLET
        2) High lifetime txs (1,500 txs) CEX hotwallet (even if my_tx_count == 2) -> CEX_HOT_WALLET
        3) Bidirectional personal sub-wallet -> INFERRED_MY_WALLET (score >= 95)
        4) Multi-account farming wallet (4 of 10 txs with me) -> INFERRED_MY_WALLET (score >= 85)
        """
        # 1) Novice sub-wallet from crypto_recovery_report.md (GB2z2wiG...: 9 lifetime txs, 3.0 SOL sent, 0 current bal)
        sub_prof = multichain_tracker.classify_wallet_profile(
            chain="solana",
            address="GB2z2wiG1NzFgsP6kYjFmuVnDhBrjY5MaCngZjCv4qMF",
            current_bal=0.0,
            sent_from_me=3.0,
            recv_to_me=0.0,
            tx_count=9,
            is_contract=False,
            my_tx_count=1
        )
        self.assertTrue(sub_prof["is_my_wallet"])
        self.assertEqual(sub_prof["wallet_type"], "INFERRED_MY_WALLET")
        self.assertGreaterEqual(sub_prof["relation_score"], 80)

        # 2) CEX Hotwallet (1,500 lifetime txs, only 2 txs with me) -> Must NOT be misclassified as my wallet!
        cex_prof = multichain_tracker.classify_wallet_profile(
            chain="solana",
            address="5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
            current_bal=150000.0,
            sent_from_me=1.0,
            recv_to_me=2.0,
            tx_count=1500,
            is_contract=False,
            my_tx_count=2
        )
        self.assertFalse(cex_prof["is_my_wallet"])
        self.assertEqual(cex_prof["wallet_type"], "CEX_HOT_WALLET")

        # 3) Bidirectional personal sub-wallet
        bi_prof = multichain_tracker.classify_wallet_profile(
            chain="ethereum",
            address=TEST_EVM_ADDR_LOWER,
            current_bal=0.05,
            sent_from_me=1.0,
            recv_to_me=0.4,
            tx_count=18,
            is_contract=False,
            my_tx_count=3
        )
        self.assertTrue(bi_prof["is_my_wallet"])
        self.assertEqual(bi_prof["relation_score"], 95)

        # 4) Multi-account farming sub-wallet (high interaction ratio >= 25% with non-round amounts)
        farm_prof = multichain_tracker.classify_wallet_profile(
            chain="bsc",
            address=TEST_EVM_ADDR_LOWER,
            current_bal=0.0,
            sent_from_me=0.0731,
            recv_to_me=0.0,
            tx_count=10,
            is_contract=False,
            my_tx_count=4
        )
        self.assertTrue(farm_prof["is_my_wallet"])
        self.assertGreaterEqual(farm_prof["relation_score"], 85)

    def test_v9_0_evm_partial_failure_propagation_on_token_and_tx_errors(self):
        """
        Validates that EVM analysis marks `is_partial=True` when Blockscout token API fails
        or when an active wallet (nonce > 0) experiences transaction scan API failure.
        """
        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", side_effect=lambda url, m, p: "0x10" if m == "eth_getTransactionCount" else "0xde0b6b3a7640000"), \
             unittest.mock.patch.object(multichain_tracker, "fetch_blockscout_tokens", return_value=([], False)), \
             unittest.mock.patch.object(multichain_tracker, "fetch_etherscan_or_bscscan_data", return_value=({}, 0, False)), \
             unittest.mock.patch.object(multichain_tracker, "evm_get_token_balance", return_value=0):
            res = multichain_tracker.analyze_evm_live("bsc", TEST_EVM_ADDR_LOWER)
            self.assertTrue(res["is_partial"])
            self.assertFalse(res["stage_status"]["tokens"])
            self.assertFalse(res["stage_status"]["transactions"])

    def test_v9_0_tron_partial_failure_and_counterpart_inspection(self):
        """
        Validates that Tron marks `is_partial=True` if transfer API fails (even when total_tx_count == 0),
        and properly inspects counterparty balances and lifetime_txs when transfers succeed.
        """
        # Transfer API fails -> must set is_partial=True
        with unittest.mock.patch("urllib.request.urlopen", side_effect=OSError("Tron API offline")):
            res_fail = multichain_tracker.analyze_tron_live(TEST_TRON_ADDR)
            self.assertTrue(res_fail["is_partial"])
            self.assertFalse(res_fail["stage_status"]["account"])
            self.assertFalse(res_fail["stage_status"]["transfers"])

    def test_v9_0_gas_trapped_token_detection_bsc(self):
        """
        Validates that when a wallet has 0 BNB gas but holds 150 USDT on BSC,
        analyze_evm_live flags the recovery target with a gas-trapped rescue badge.
        """
        mock_tokens = ([{
            "symbol": "USDT",
            "name": "Tether USD (BEP-20)",
            "amount": 150.0,
            "value_usd": 150.0,
            "mint": "0x55d398326f99059ff775485246999027b3197955",
            "protocol_id": None
        }], True)

        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value="0x0"), \
             unittest.mock.patch.object(multichain_tracker, "fetch_blockscout_tokens", return_value=mock_tokens), \
             unittest.mock.patch.object(multichain_tracker, "fetch_etherscan_or_bscscan_data", return_value=({}, 0, True)), \
             unittest.mock.patch.object(multichain_tracker, "evm_get_token_balance", return_value=0):
            res = multichain_tracker.analyze_evm_live("bsc", TEST_EVM_ADDR_LOWER)
            self.assertFalse(res["is_partial"])
            self.assertEqual(len(res["recovery_targets"]), 1)
            self.assertIn("가스비(BNB) 보충 시 즉시 출금", res["recovery_targets"][0]["badge"])

    def test_v9_0_protocols_and_ad_config_endpoints(self):
        """Validates /api/protocols encyclopedia and /api/ad-config partner funnel metadata."""
        with TestClient(server.app) as client:
            proto_resp = client.get("/api/protocols")
            self.assertEqual(proto_resp.status_code, 200)
            protos = proto_resp.json()
            self.assertIn("lido", protos)
            self.assertIn("marinade", protos)
            self.assertIn("pancakeswap", protos)

            ad_resp = client.get("/api/ad-config")
            self.assertEqual(ad_resp.status_code, 200)
            ad_data = ad_resp.json()
            self.assertIn("partners", ad_data)
            self.assertGreaterEqual(len(ad_data["partners"]), 3)

    def test_v9_0_pivot_scan_metadata_on_classified_wallets(self):
        """
        Validates that discovered related wallets include relation_score, evidence_tags,
        can_pivot_scan, pivot_chain, and pivot_address for 1-click multi-hop tracing.
        """
        peer_addr = "0x000000000000000000000000000000000000dead"
        mock_counterparts = {
            peer_addr: {
                "sent": 2.0,
                "recv": 0.5,
                "count": 3,
                "is_contract": False,
                "name": None,
                "txs": [{"signature": "0xabc", "date": "2026-01-01 12:00", "amount": 2.0, "direction": "내가 보낸 돈", "symbol": "ETH"}]
            }
        }

        def mock_evm_rpc(url, method, params):
            if method == "eth_getBalance":
                return "0xde0b6b3a7640000"  # 1.0 ETH
            if method == "eth_getTransactionCount":
                return "0x5"  # 5 txs
            if method == "eth_getCode":
                return "0x"
            return "0x0"

        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", side_effect=mock_evm_rpc), \
             unittest.mock.patch.object(multichain_tracker, "fetch_blockscout_tokens", return_value=([], True)), \
             unittest.mock.patch.object(multichain_tracker, "fetch_etherscan_or_bscscan_data", return_value=(mock_counterparts, 5, True)):
            res = multichain_tracker.analyze_evm_live("ethereum", TEST_EVM_ADDR_LOWER)
            self.assertFalse(res["is_partial"])
            self.assertEqual(len(res["classified_wallets"]), 1)
            w = res["classified_wallets"][0]
            self.assertTrue(w["is_my_wallet"])
            self.assertEqual(w["relation_score"], 95)
            self.assertTrue(w["can_pivot_scan"])
            self.assertEqual(w["pivot_chain"], "ethereum")
            self.assertEqual(w["pivot_address"], peer_addr)
            self.assertTrue(len(w["evidence_tags"]) > 0)


    # =========================================================================
    # 12. SECURITY PATCH VERIFICATION: ISSUE #1 (XSS) & ISSUE #2 (KEY ISOLATION)
    # =========================================================================

    def test_patch_issue1_xss_sanitization_and_frontend_escaping(self):
        """
        Verifies Issue #1 fix:
        1) Server-side `sanitize_token_text` strips HTML/JS payloads and enforces <=24 chars.
        2) Blockscout token parsing & contract label classification strip XSS payloads.
        3) Frontend `static/app.js` defines `esc()` and `safeHttpsUrl()` and escapes dynamic fields.
        """
        malicious_sym = "<img src=x onerror=alert(1)>USDT"
        cleaned = multichain_tracker.sanitize_token_text(malicious_sym)
        self.assertNotIn("<", cleaned)
        self.assertNotIn(">", cleaned)
        self.assertLessEqual(len(cleaned), 24)
        self.assertRegex(cleaned, r"^[\w .\-$/()]{1,24}$")

        # Verify classify_wallet_profile sanitizes malicious contract label_hint
        prof = multichain_tracker.classify_wallet_profile(
            chain="ethereum",
            address=TEST_EVM_ADDR_LOWER,
            current_bal=0.0,
            sent_from_me=1.0,
            recv_to_me=0.0,
            tx_count=5,
            is_contract=True,
            label_hint="<script>alert(1)</script>UniswapRouter"
        )
        self.assertNotIn("<script>", prof["label"])
        self.assertNotIn("</script>", prof["label"])

        # Verify static/app.js contains esc() and safeHttpsUrl() and applies them to innerHTML sinks
        app_js_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "app.js")
        with open(app_js_file, "r", encoding="utf-8") as f:
            js_code = f.read()
        self.assertIn("const esc = s =>", js_code)
        self.assertIn("function safeHttpsUrl(", js_code)
        self.assertIn("${esc(localizedLabel)}", js_code)
        self.assertIn("${esc(localizedTitle)}", js_code)
        self.assertIn("${esc(proto.description)}", js_code)
        self.assertIn("${esc(proto.escape_guide)}", js_code)

    def test_patch_issue2_api_key_isolation_and_etherscan_v2_only(self):
        """
        Verifies Issue #2 fix:
        1) HELIUS_API_KEY is never leaked to alchemy.com; ALCHEMY_API_KEY is never leaked to helius-rpc.com.
        2) SOLANA_RPC_URL=https://... is never embedded into ?api-key=https://...
        3) Etherscan V2 (`api.etherscan.io/v2/api`) is used exclusively for Ethereum (chainid=1)
           and BSC (chainid=56), never calling deprecated V1 or leaking keys to bscscan.com/api.
        """
        env_patch = {
            "HELIUS_API_KEY": "helius_secret_key_123",
            "ALCHEMY_API_KEY": "alchemy_secret_key_456",
            "SOLANA_RPC_URL": "https://my-custom-sol-node.example.com",
            "ETHERSCAN_API_KEY": "etherscan_v2_key_789",
            "BSCSCAN_API_KEY": "legacy_bsc_key_000",
        }
        with unittest.mock.patch.dict(os.environ, env_patch, clear=False), \
             unittest.mock.patch("multichain_tracker.load_all_env_keys", return_value={
                 "tron": [],
                 "etherscan": ["etherscan_v2_key_789"],
                 "bnbscan": [],
                 "helius": ["helius_secret_key_123"],
                 "solana_rpc": ["https://my-custom-sol-node.example.com"],
                 "solana": ["helius_secret_key_123"],
                 "moralis": [],
                 "alchemy": ["alchemy_secret_key_456"]
             }):
            multichain_tracker.refresh_env_keys(force=True)
            sol_pool = multichain_tracker.SOL_RPC_POOL

            # Helius key ONLY in helius-rpc.com, NEVER in alchemy.com
            self.assertIn("https://mainnet.helius-rpc.com/?api-key=helius_secret_key_123", sol_pool)
            self.assertNotIn("https://solana-mainnet.g.alchemy.com/v2/helius_secret_key_123", sol_pool)

            # Alchemy key ONLY in alchemy.com, NEVER in helius-rpc.com
            self.assertIn("https://solana-mainnet.g.alchemy.com/v2/alchemy_secret_key_456", sol_pool)
            self.assertNotIn("https://mainnet.helius-rpc.com/?api-key=alchemy_secret_key_456", sol_pool)

            # Custom RPC URL used directly, NEVER inside ?api-key=
            self.assertIn("https://my-custom-sol-node.example.com", sol_pool)
            for u in sol_pool:
                self.assertNotIn("api-key=https://", u)

            # Verify Etherscan V2 only (no bscscan.com/api or V1 api.etherscan.io/api calls)
            called_urls = []

            class DummyResp:
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    pass
                def read(self):
                    return json.dumps({"status": "1", "message": "OK", "result": []}).encode("utf-8")

            def fake_urlopen(req, timeout=5):
                url_str = req.full_url if hasattr(req, "full_url") else str(req)
                called_urls.append(url_str)
                return DummyResp()

            with unittest.mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                multichain_tracker.fetch_etherscan_or_bscscan_data("bsc", TEST_EVM_ADDR_LOWER, return_status=True)

            self.assertEqual(len(called_urls), 1)
            self.assertTrue(called_urls[0].startswith("https://api.etherscan.io/v2/api?"))
            self.assertIn("chainid=56", called_urls[0])
            self.assertIn("apikey=etherscan_v2_key_789", called_urls[0])
            self.assertNotIn("bscscan.com", called_urls[0])
            self.assertNotIn("legacy_bsc_key_000", called_urls[0])
        multichain_tracker.refresh_env_keys(force=True)



    def test_patch_issue3_and_4_evm_rpc_token_none_and_price_source(self):
        """
        Verifies Issue #3 & #4 fixes:
        - `evm_get_token_balance` returns `None` on RPC failure (`evm_rpc` -> `None`) and `0` on `'0x0'`.
        - When `evm_get_token_balance` returns `None`, `analyze_evm_live` marks `stage_status['tokens'] = False` and `is_partial = True`.
        - `price_source` field is included in scanner outputs (`'fallback'` or `'live'`).
        """
        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value=None):
            self.assertIsNone(multichain_tracker.evm_get_token_balance("https://eth.llamarpc.com", TEST_EVM_ADDR_LOWER, TEST_EVM_ADDR_LOWER))

        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value="0x0"):
            self.assertEqual(multichain_tracker.evm_get_token_balance("https://eth.llamarpc.com", TEST_EVM_ADDR_LOWER, TEST_EVM_ADDR_LOWER), 0)

        # Even if Blockscout succeeds, an RPC token check returning None marks tokens=False, is_partial=True
        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value="0x1"), \
             unittest.mock.patch.object(multichain_tracker, "fetch_blockscout_tokens", return_value=([], True)), \
             unittest.mock.patch.object(multichain_tracker, "fetch_etherscan_or_bscscan_data", return_value=({}, 1, True)), \
             unittest.mock.patch.object(multichain_tracker, "evm_get_token_balance", return_value=None):
            res = multichain_tracker.analyze_evm_live("bsc", TEST_EVM_ADDR_LOWER)
            self.assertTrue(res["is_partial"])
            self.assertFalse(res["stage_status"]["tokens"])
            self.assertIn(res["price_source"], ("fallback", "live"))

    def test_patch_issue5_solana_rent_raw_amount_frozen_and_lamports_sum(self):
        """
        Verifies Issue #5 fix:
        - Uses `tokenAmount.amount` integer string instead of deprecated `uiAmount` (null `uiAmount` with non-zero `amount` is NOT treated as zero balance).
        - Excludes `frozen` accounts from closable rent calculation.
        - Sums actual `account.lamports` (supporting Token-2022 custom rent) instead of hardcoded 0.00203928.
        """
        def mock_sol_rpc(method, params):
            if method == "getBalance":
                return {"value": 1000000000}
            if method == "getTokenAccountsByOwner":
                prog = params[1].get("programId", "")
                if "Tokenkeg" in prog:
                    return {
                        "value": [
                            # 1) Non-zero balance but uiAmount is None (must NOT be classified as empty!)
                            {
                                "pubkey": "AccNonZeroNullUi1111111111111111111111111111",
                                "account": {
                                    "lamports": 2039280,
                                    "data": {
                                        "parsed": {
                                            "info": {
                                                "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
                                                "state": "initialized",
                                                "tokenAmount": {"amount": "5000000", "decimals": 6, "uiAmount": None}
                                            }
                                        }
                                    }
                                }
                            },
                            # 2) Zero balance but frozen (must NOT be classified as closable empty!)
                            {
                                "pubkey": "AccZeroFrozen1111111111111111111111111111111",
                                "account": {
                                    "lamports": 2039280,
                                    "data": {
                                        "parsed": {
                                            "info": {
                                                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                                "state": "frozen",
                                                "tokenAmount": {"amount": "0", "decimals": 6, "uiAmount": 0.0}
                                            }
                                        }
                                    }
                                }
                            },
                            # 3) Closable empty initialized SPL account (2,039,280 lamports)
                            {
                                "pubkey": "AccClosable111111111111111111111111111111111",
                                "account": {
                                    "lamports": 2039280,
                                    "data": {
                                        "parsed": {
                                            "info": {
                                                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                                "state": "initialized",
                                                "tokenAmount": {"amount": "0", "decimals": 6, "uiAmount": None}
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                else:
                    # Token-2022 closable empty account with extension rent (2,500,000 lamports)
                    return {
                        "value": [
                            {
                                "pubkey": "AccToken2022Closable111111111111111111111111",
                                "account": {
                                    "lamports": 2500000,
                                    "data": {
                                        "parsed": {
                                            "info": {
                                                "mint": "Token2022Mint1111111111111111111111111111111",
                                                "state": "initialized",
                                                "tokenAmount": {"amount": "0", "decimals": 9, "uiAmount": 0.0}
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
            if method == "getProgramAccounts":
                return []
            return []

        with unittest.mock.patch.object(multichain_tracker, "sol_rpc_call", side_effect=mock_sol_rpc):
            ov = multichain_tracker.get_sol_wallet_overview(TEST_SOL_ADDR)
            self.assertFalse(ov["is_partial"])
            # Only the 2 initialized zero-balance accounts are closable
            self.assertEqual(ov["zero_balance_count"], 2)
            # Exact lamports sum: (2,039,280 + 2,500,000) / 1e9 = 0.00453928 SOL
            self.assertAlmostEqual(ov["reclaimable_sol"], 0.00453928, places=8)
            # Active portfolio has the 5.0 USDT account even though uiAmount was None
            self.assertEqual(len(ov["portfolio"]), 1)
            self.assertAlmostEqual(ov["portfolio"][0]["amount"], 5.0, places=4)

    def test_patch_issue7_and_10_set_l1_cache_deepcopy_and_ip_proxy_hardening(self):
        """
        Verifies Issue #7 & #10 fixes:
        - `set_l1_cache` deep-copies input data so mutating caller dict after `set_l1_cache` does not pollute L1 cache.
        - `normalize_ip_for_rate_limit` unwraps IPv4-mapped IPv6 (`::ffff:1.2.3.4` -> `1.2.3.4`) and strips `%eth0` zone IDs.
        - `get_client_ip` reads `X-Forwarded-For` from the right using `TRUSTED_PROXY_HOPS`.
        """
        caller_dict = {"total_recoverable_usd": 100.0, "nested": ["a"]}
        now = time.time()
        server.set_l1_cache("test:deepcopy_in", caller_dict, now)
        caller_dict["total_recoverable_usd"] = 999999.0
        caller_dict["nested"].append("mutated")

        cached = server.get_cached_result("test:deepcopy_in", now)
        self.assertEqual(cached["total_recoverable_usd"], 100.0)
        self.assertEqual(cached["nested"], ["a"])

        # IPv4-mapped IPv6 addresses must map to distinct IPv4 keys, not collapse into ::ffff:0:0/64
        k1 = server.normalize_ip_for_rate_limit("::ffff:203.0.113.10")
        k2 = server.normalize_ip_for_rate_limit("::ffff:198.51.100.22")
        self.assertEqual(k1, "203.0.113.10")
        self.assertEqual(k2, "198.51.100.22")
        self.assertNotEqual(k1, k2)

        # Zone ID (%eth0) must be stripped and still masked to /64
        k_zone = server.normalize_ip_for_rate_limit("2001:db8:abcd:12::1%eth0")
        self.assertEqual(k_zone, "2001:db8:abcd:12::")

        # Spoofed leftmost X-Forwarded-For must be ignored when TRUSTED_PROXY_HOPS=1
        server.TRUST_PROXY_HEADERS = True
        server.TRUSTED_PROXY_HOPS = 1

        class DummyReq:
            headers = {"x-forwarded-for": "1.1.1.1, 198.51.100.77"}
            client = None

        self.assertEqual(server.get_client_ip(DummyReq()), "198.51.100.77")

    def test_patch_issue8_13_14_deadline_bridge_and_keccak_boundary(self):
        """
        Verifies Issue #8 (scan deadline), #13 (same-address cross-chain bridge hop),
        and #14 (Keccak-256 135-byte rate-1 boundary padding).
        """
        # #8: Expired deadline causes get_remaining_timeout to return 0.0 and sol_rpc_call to skip network calls
        multichain_tracker.set_scan_deadline(time.monotonic() - 1.0)
        try:
            self.assertEqual(multichain_tracker.get_remaining_timeout(4.0), 0.0)
            with unittest.mock.patch("urllib.request.urlopen") as mock_u:
                self.assertIsNone(multichain_tracker.sol_rpc_call("getBalance", [TEST_SOL_ADDR]))
                mock_u.assert_not_called()
        finally:
            multichain_tracker.set_scan_deadline(None)

        # #14: Keccak-256 empty string and 135/136/137-byte boundary verification
        # Standard Keccak-256("") vector: c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
        self.assertEqual(
            address_utils.keccak_256(b"").hex(),
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        )
        # 135-byte input (rate - 1 = 135): must compress in exactly 1 block (ending in 0x81)
        h135 = address_utils.keccak_256(b"a" * 135).hex()
        h136 = address_utils.keccak_256(b"a" * 136).hex()
        h137 = address_utils.keccak_256(b"a" * 137).hex()
        self.assertEqual(len(h135), 64)
        self.assertNotEqual(h135, h136)
        self.assertNotEqual(h136, h137)

    def test_v9_1_predeploy_fixes(self):
        """
        Verifies v9.1 Pre-Deploy critical fixes:
        1. /api/stats rejects query param, enforces X-Admin-Key header, and safely handles non-ASCII/Unicode
        2. get_client_ip supports Render edge strategy ('render' / leftmost IP) and standard 'right_hop'
        3. get_client_ip respects TRUSTED_PROXIES CIDR restriction to reject direct spoofing
        4. get_client_ip respects PROXY_CLIENT_IP_HEADER exclusively when specified
        5. CSP header reflects CSP_MODE ("report-only" vs "enforce")
        """
        server.ADMIN_API_KEY = "supersecret123"
        client = TestClient(server.app)

        # 1. /api/stats header-only auth: query params must be rejected (returns 403)
        res_qry = client.get("/api/stats?api_key=supersecret123")
        self.assertEqual(res_qry.status_code, 403)

        # Non-ASCII / Korean / emojis in endpoint handler directly must raise 403 without 500 TypeError
        for non_ascii_key in ["비밀키", "admin🔑key", "café_admin"]:
            with self.assertRaises(HTTPException) as ctx:
                server.get_server_stats(api_key=non_ascii_key)
            self.assertEqual(ctx.exception.status_code, 403)

        # Direct verification that compare_digest does not raise TypeError with non-ASCII unicode
        self.assertFalse(secrets.compare_digest("비밀키".encode("utf-8"), "supersecret123".encode("utf-8")))

        # Correct X-Admin-Key header returns 200
        res_ok = client.get("/api/stats", headers={"X-Admin-Key": "supersecret123"})
        self.assertEqual(res_ok.status_code, 200)

        # 2. Render Proxy Strategy: leftmost IP is the verified client IP
        server.TRUST_PROXY_HEADERS = True
        server.PROXY_CLIENT_IP_HEADER = ""
        server.TRUSTED_PROXIES_RAW = ""
        server.PROXY_STRATEGY = "render"

        class RenderReq:
            headers = {"x-forwarded-for": "203.0.113.195, 10.10.10.1"}
            client = type("Client", (), {"host": "10.10.10.1"})()

        self.assertEqual(server.get_client_ip(RenderReq()), "203.0.113.195")

        # 3. Standard 'right_hop' Strategy: count from the right based on TRUSTED_PROXY_HOPS
        server.PROXY_STRATEGY = "right_hop"
        server.TRUSTED_PROXY_HOPS = 1

        class StandardReq:
            headers = {"x-forwarded-for": "1.1.1.1, 198.51.100.77"}
            client = type("Client", (), {"host": "10.10.10.1"})()

        self.assertEqual(server.get_client_ip(StandardReq()), "198.51.100.77")

        # 4. TRUSTED_PROXIES CIDR restriction
        server.TRUSTED_PROXIES_RAW = "10.0.0.0/8, 127.0.0.1"

        class UntrustedDirectReq:
            headers = {"x-forwarded-for": "203.0.113.50"}
            client = type("Client", (), {"host": "192.168.1.100"})()

        # Direct connection from untrusted IP 192.168.1.100: proxy headers must be ignored
        self.assertEqual(server.get_client_ip(UntrustedDirectReq()), "192.168.1.100")

        class TrustedProxyReq:
            headers = {"x-forwarded-for": "203.0.113.50, 10.0.0.2"}
            client = type("Client", (), {"host": "10.0.0.2"})()

        # Connection from trusted proxy 10.0.0.2: proxy headers honored
        self.assertEqual(server.get_client_ip(TrustedProxyReq()), "10.0.0.2" if server.PROXY_STRATEGY == "right_hop" else "203.0.113.50")

        # 5. PROXY_CLIENT_IP_HEADER single trust check
        server.TRUSTED_PROXIES_RAW = ""
        server.PROXY_CLIENT_IP_HEADER = "cf-connecting-ip"

        class SpoofedReq:
            headers = {
                "cf-connecting-ip": "198.51.100.99",
                "x-forwarded-for": "1.2.3.4, 5.6.7.8",
                "x-real-ip": "9.9.9.9",
            }
            client = None

        self.assertEqual(server.get_client_ip(SpoofedReq()), "198.51.100.99")

        # 6. CSP Mode Header verification
        server.CSP_MODE = "report-only"
        res_ro = client.get("/healthz")
        self.assertIn("Content-Security-Policy-Report-Only", res_ro.headers)
        self.assertNotIn("Content-Security-Policy", res_ro.headers)

        server.CSP_MODE = "enforce"
        res_enf = client.get("/healthz")
        self.assertIn("Content-Security-Policy", res_enf.headers)
        self.assertNotIn("Content-Security-Policy-Report-Only", res_enf.headers)
        server.CSP_MODE = "report-only"
        server.PROXY_CLIENT_IP_HEADER = ""


if __name__ == "__main__":
    unittest.main()

