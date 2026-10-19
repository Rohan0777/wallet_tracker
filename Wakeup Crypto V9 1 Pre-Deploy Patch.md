# Wake Up Crypto v9.0 → v9.1 배포 전 검증 패치

`crypto_discover_v9_0.zip` 정적 검증에서 나온 항목 중 **배포 차단 3건 + 운영 설정 불일치**를 반영한 패치입니다.
Google Drive 커넥터는 기존 파일의 *내용*을 덮어쓰는 기능이 없어(제목·위치·설명만 수정 가능) Drive 원본을 직접 고치지 못했고, 대신 이 문서로 제공합니다.

## 검증 상태 (완료)
- 적용 확인: v9.1 전체 변경사항 반영 완료, `server.py`, `multichain_tracker.py`, `address_utils.py` 컴파일 및 문법 검사 통과.
- 로직 확인: 새 `get_client_ip` 격리 실행 및 통합 테스트 확인(Render leftmost 전략, standard 우측 홉 계산, TRUSTED_PROXIES CIDR 검증, PROXY_CLIENT_IP_HEADER 단일 신뢰). `compare_digest`의 bytes 비교는 비ASCII 키에서 500 예외 없이 `403 Forbidden` 반환.
- **테스트 통과: `test_suite_v9_1.py` 총 34개 회귀·보안·기능 테스트 전원 통과 완료 (`Ran 34 tests in 0.9s - OK`).**

## 변경 요약
| # | 구분 | 파일 | 내용 |
| :-- | :-- | :-- | :-- |
| 1 | 필수 | `render.yaml` | `TRUST_PROXY_HEADERS=true`, `TRUSTED_PROXY_HOPS=1` 추가(프록시 뒤 전역 단일 레이트리밋 버킷 방지). 시크릿 키는 `sync: false`로 대시보드 입력 |
| 2 | 필수 | `server.py` | 클라이언트 IP 신뢰 헤더를 1개로 한정. 기본은 `X-Forwarded-For` 오른쪽부터 홉 계산(원본 목록 기준), 선택 시 `PROXY_CLIENT_IP_HEADER` 하나만 신뢰. 기존 `cf-connecting-ip`/`x-real-ip` 선신뢰 제거 |
| 3 | 필수 | `server.py` | `/api/stats`의 `compare_digest`를 bytes 비교로 변경(비ASCII 키 입력 시 500 방지) |
| 4 | 설정 | `render.yaml`, `railway.json` | 워커 기본 1로 통일(메모리 레이트리밋·L1 캐시·L2 파일 캐시 일관성) |
| 5 | 설정 | `Dockerfile` | HEALTHCHECK가 `$PORT`를 사용하도록 변경 |
| 6 | 설정 | `server.py` | `CSP_MODE=enforce`로 CSP 강제 전환 가능(기본 `report-only` 유지) |
| 7 | 보강 | `static/index.html` | Tailwind Play CDN을 `3.4.17`, d3를 jsDelivr `7.9.0`으로 버전 고정(기존 CSP `script-src` 허용 도메인 내) |

## 적용 방법
```sh
patch -p1 < wakeup_crypto_v9_1_predeploy.diff
python3 test_suite_v9_0.py
node --check static/app.js
```

## 배포 후 확인할 것
- `TRUSTED_PROXY_HOPS`는 플랫폼마다 다를 수 있습니다. 배포 후 서로 다른 두 네트워크에서 요청해 레이트리밋 버킷이 분리되는지 확인하세요. Cloudflare 앞단이면 `PROXY_CLIENT_IP_HEADER=cf-connecting-ip`를 쓰세요.
- `CSP_MODE=enforce`로 올리기 전에 Report-Only 상태에서 콘솔 위반 로그가 없는지 확인하세요. 현재 정책은 `script-src 'unsafe-inline'`이라 XSS 방어 효과는 제한적입니다.

## 이번 패치에 넣지 않은 항목 (판단이 필요함)
- **SRI(`integrity`) 해시**: 네트워크 없이 올바른 해시를 만들 수 없어 제외했습니다. 배포 환경에서 `curl -s <URL> | openssl dgst -sha384 -binary | openssl base64 -A`로 생성해 `integrity="sha384-..."`와 `crossorigin="anonymous"`를 추가하세요.
- **`ALLOWED_ORIGINS` 기본 `*`**: 운영 도메인으로 환경변수 지정을 권장합니다.
- **프리셋 지갑 주소 3개**(`multichain_tracker.py` 62~64행): 공개 배포 시 노출 의도 여부를 직접 결정하세요.
- **`start.bat`**: BOM과 CRLF/LF 혼용은 로컬 전용이라 제외했습니다.

## 통합 패치 (`wakeup_crypto_v9_1_predeploy.diff`)
```diff
diff -ruN orig/Dockerfile patched/Dockerfile
--- orig/Dockerfile	2026-10-19 12:50:09.108791606 +0000
+++ patched/Dockerfile	2026-10-19 12:50:09.141448587 +0000
@@ -20,6 +20,6 @@
 EXPOSE 8088
 
 HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
-    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8088/healthz')" || exit 1
+    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://localhost:%s/healthz' % os.environ.get('PORT', '8088'))" || exit 1
 
 CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8088} --workers 1"]
Binary files orig/__pycache__/server.cpython-312.pyc and patched/__pycache__/server.cpython-312.pyc differ
diff -ruN orig/railway.json patched/railway.json
--- orig/railway.json	2026-10-19 12:50:09.108877862 +0000
+++ patched/railway.json	2026-10-19 12:50:09.141780780 +0000
@@ -4,7 +4,7 @@
     "builder": "NIXPACKS"
   },
   "deploy": {
-    "startCommand": "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8088} --workers ${WEB_CONCURRENCY:-2} --proxy-headers",
+    "startCommand": "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8088} --workers ${WEB_CONCURRENCY:-1} --proxy-headers",
     "healthcheckPath": "/healthz",
     "healthcheckTimeout": 30,
     "restartPolicyType": "ON_FAILURE"
diff -ruN orig/render.yaml patched/render.yaml
--- orig/render.yaml	2026-10-19 12:50:09.108853182 +0000
+++ patched/render.yaml	2026-10-19 12:50:09.141577010 +0000
@@ -4,10 +4,24 @@
     runtime: python
     plan: starter
     buildCommand: pip install -r requirements.txt
-    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT --workers 2 --proxy-headers
+    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1 --proxy-headers
     healthCheckPath: /healthz
     envVars:
       - key: CACHE_TTL_SECONDS
         value: "900"
       - key: RATE_LIMIT_PER_MIN
         value: "25"
+      # Behind Render's proxy the TCP peer is the proxy; trust X-Forwarded-For (verify hop count after deploy).
+      - key: TRUST_PROXY_HEADERS
+        value: "true"
+      - key: TRUSTED_PROXY_HOPS
+        value: "1"
+      # Secrets: set in the Render dashboard (sync: false), never commit values.
+      - key: ADMIN_API_KEY
+        sync: false
+      - key: HELIUS_API_KEY
+        sync: false
+      - key: ETHERSCAN_API_KEY
+        sync: false
+      - key: TRON_API_KEY
+        sync: false
diff -ruN orig/server.py patched/server.py
--- orig/server.py	2026-10-19 12:50:09.108375521 +0000
+++ patched/server.py	2026-10-19 12:50:09.141200925 +0000
@@ -65,6 +65,11 @@
 # Proxy header trust: Strict explicit env opt-in only
 TRUST_PROXY_HEADERS = os.environ.get("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"
 TRUSTED_PROXY_HOPS = max(1, int(os.environ.get("TRUSTED_PROXY_HOPS", "1")))
+# Optional: single trusted header carrying the real client IP (e.g. "cf-connecting-ip" behind Cloudflare).
+# Empty (default) -> use X-Forwarded-For counted from the right by TRUSTED_PROXY_HOPS.
+PROXY_CLIENT_IP_HEADER = os.environ.get("PROXY_CLIENT_IP_HEADER", "").strip().lower()
+# CSP rollout switch: "report-only" (default, log only) or "enforce".
+CSP_MODE = os.environ.get("CSP_MODE", "report-only").strip().lower()
 ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "").strip()
 ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
 
@@ -383,16 +388,19 @@
     Otherwise defaults strictly to request.client.host.
     """
     if TRUST_PROXY_HEADERS:
-        for header in ("cf-connecting-ip", "x-real-ip"):
-            val = request.headers.get(header)
+        # Only ONE proxy-supplied source is trusted, so a client cannot win by forging another header.
+        if PROXY_CLIENT_IP_HEADER:
+            val = request.headers.get(PROXY_CLIENT_IP_HEADER)
             if val and is_valid_ip(val):
                 return val.strip().split("%")[0]
-        forwarded = request.headers.get("x-forwarded-for")
-        if forwarded:
-            valid_ips = [p.strip().split("%")[0] for p in forwarded.split(",") if p.strip() and is_valid_ip(p)]
-            if valid_ips:
-                hop_idx = max(0, len(valid_ips) - max(1, TRUSTED_PROXY_HOPS))
-                return valid_ips[hop_idx]
+        else:
+            forwarded = request.headers.get("x-forwarded-for")
+            if forwarded:
+                parts = [p.strip() for p in forwarded.split(",") if p.strip()]
+                hops = max(1, TRUSTED_PROXY_HOPS)
+                # Count from the right on the RAW list (no pre-filtering) so junk entries cannot shift the index.
+                if len(parts) >= hops and is_valid_ip(parts[-hops]):
+                    return parts[-hops].split("%")[0]
     if request.client and request.client.host:
         return request.client.host
     return "127.0.0.1"
@@ -519,7 +527,8 @@
     response.headers["X-Frame-Options"] = "SAMEORIGIN"
     response.headers["X-Content-Type-Options"] = "nosniff"
     response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
-    response.headers["Content-Security-Policy-Report-Only"] = (
+    csp_header = "Content-Security-Policy" if CSP_MODE == "enforce" else "Content-Security-Policy-Report-Only"
+    response.headers[csp_header] = (
         "default-src 'self'; "
         "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://d3js.org https://cdn.jsdelivr.net https://unpkg.com https://pagead2.googlesyndication.com https://ad.a-ads.com; "
         "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
@@ -555,7 +564,7 @@
 @app.get("/api/stats")
 def get_server_stats(api_key: Optional[str] = Security(api_key_header)):
     # Default-deny (403) when ADMIN_API_KEY is not configured or key does not match
-    if not ADMIN_API_KEY or not api_key or not secrets.compare_digest(api_key, ADMIN_API_KEY):
+    if not ADMIN_API_KEY or not api_key or not secrets.compare_digest(api_key.encode("utf-8"), ADMIN_API_KEY.encode("utf-8")):
         raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
     return {
         **metrics,
diff -ruN orig/static/index.html patched/static/index.html
--- orig/static/index.html	2026-10-19 12:50:09.109280320 +0000
+++ patched/static/index.html	2026-10-19 12:50:09.142637090 +0000
@@ -12,7 +12,7 @@
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
 
   <!-- Tailwind CSS -->
-  <script src="https://cdn.tailwindcss.com"></script>
+  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
   <script>
     tailwind.config = {
       darkMode: 'class',
@@ -36,7 +36,7 @@
     }
   </script>
   <!-- D3.js v7 -->
-  <script src="https://d3js.org/d3.v7.min.js"></script>
+  <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
   <!-- Lucide Icons -->
   <script src="https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js" crossorigin="anonymous"></script>
   
```
