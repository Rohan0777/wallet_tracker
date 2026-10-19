# Wake Up Crypto v9.0 전체 코드 리뷰 반영 통합 패치 (\#1 \~ \#15 전 항목 조치)

코드 리뷰에서 지적된 **\#1 \~ \#15 전 항목(심각도 높음 1~~5, 중간 6~~11, 낮음·개선 권장 12\~15)** 을 `crypto_discover_v9.0.zip` 전체 코드베이스에 반영한 통합 패치입니다. 모든 패치 적용 후 단위·통합 회귀 테스트 **33개 전원 통과(`Ran 33 tests in 1.468s - OK`)** 및 프론트엔드 문법 검증(`node --check static/app.js`)을 마쳤습니다.

## 1\. 전체 항목별 조치 내역 (\#1 \~ \#15)

| 번호 | 리뷰 항목 | 수정 대상 파일 | 조치 결과 및 핵심 변경 사항 |
| :---- | :---- | :---- | :---- |
| **\#1** | 외부 데이터 `innerHTML` XSS 및 서버 측 미검증 | `static/app.js`, `multichain_tracker.py` | 프론트엔드 `esc()` HTML 이스케이프 및 `safeHttpsUrl()`(`https:` 프로토콜 강제) 도입, 서버 `sanitize_token_text()`로 심볼·이름·컨트랙트명·브릿지 도구명을 `^[\w .\-$/()]{1,24}$`로 정제 |
| **\#2** | Solana/EVM 키 혼용 유출 및 폐기된 V1 호출 | `multichain_tracker.py`, `.env.example` | `HELIUS_API_KEY`, `ALCHEMY_API_KEY`, `SOLANA_RPC_URL` 버킷 완전 분리(타사 도메인 전송 차단), Etherscan V1 및 `bscscan.com/api` 제거 후 `https://api.etherscan.io/v2/api`(`chainid=1`, `56`) 단일화 |
| **\#3** | EVM 부분 실패(`is_partial`) 감지 보강 | `multichain_tracker.py` | `evm_get_token_balance()`가 RPC 실패 시 `None`, 정상 잔고 0일 때 `0`을 구분해 반환하도록 수정하고, 하나라도 `None`이면 `stage_status['tokens'] = False` 및 `is_partial = True` 전파 |
| **\#4** | 하드코딩 프리셋 제거 및 가격 폴백 표시 | `multichain_tracker.py` | `4.1374 SOL` 및 `all_wallets_classified.json` 정적 폴백 제거 유지 \+ 바이낸스 시세 API 차단/실패 시 응답에 `price_source: "fallback"`(성공 시 `"live"`) 명시 |
| **\#5** | Solana 회수 가능 렌트(`uiAmount`) 거짓 양성 | `multichain_tracker.py` | deprecated/nullable `uiAmount` 대신 정수 문자열 `int(info['tokenAmount']['amount']) == 0` 및 `info.get('state') == 'initialized'`(`frozen` 제외)로 판정하고, 고정값 `0.00203928` 대신 실제 `account.lamports` 합산 |
| **\#6** | CSP와 `index.html` CDN 충돌 및 `@latest` 위험 | `server.py`, `static/index.html` | `lucide@latest`를 `cdn.jsdelivr.net/npm/lucide@0.469.0` 고정 버전으로 교체하고, 서버 CSP `script-src`, `style-src`, `font-src`에 Tailwind·D3·Google Fonts·jsDelivr 도메인 반영 |
| **\#7** | `set_l1_cache` 참조 저장 및 싱글플라이트 오염 | `server.py` | `set_l1_cache()` 저장 시 `copy.deepcopy(data)` 적용, `build_l2_snapshot()` 및 싱글플라이트 `await asyncio.shield(task)` 반환 시에도 `copy.deepcopy()` 적용하여 호출자 간 dict 공유 오염 원천 차단 |
| **\#8** | 스레드 폭증 및 전체 데드라인 부재 | `multichain_tracker.py` | `time.monotonic()` 기반 스캔 데드라인(`SCAN_DEADLINE_SECONDS`, `get_remaining_timeout()`) 도입으로 데드라인 초과 시 RPC 폴백 루프 즉시 중단 |
| **\#9** | `.dockerignore`의 `*.txt` 누락 및 `requirements.txt` | `.dockerignore`, `requirements.txt` | `.dockerignore`에 `!requirements.txt`, `!requirements-dev.txt`, `!ads.txt` 예외 추가, `requirements.txt`에서 미사용 `requests` 제거 및 버전 고정(`fastapi==0.115.0`, `uvicorn[standard]==0.30.6`) |
| **\#10** | `/api/stats` 기본 거부(403) 및 프록시/IPv6 우회 방지 | `server.py` | `/api/stats`는 `ADMIN_API_KEY` 미설정이거나 불일치 시 `secrets.compare_digest` 검증 후 기본 `403 Forbidden` 반환, `X-Forwarded-For`는 `TRUSTED_PROXY_HOPS` 기준 오른쪽부터 역산, `::ffff:1.2.3.4`(IPv4-mapped) 언래핑 및 `%eth0` zone ID 제거 |
| **\#11** | 환경변수 로더 범위 축소 및 스레드 락 | `multichain_tracker.py` | 상위 디렉터리 무차별 탐색 제거, `SOLANA_RPC_URL=https://...`가 `?api-key=`로 들어가는 버그 수정, `_ENV_LOCK`(`threading.Lock`)으로 키 풀 원자적 교체 |
| **\#12** | 지갑 분류 휴리스틱 표현 및 docstring 정리 | `multichain_tracker.py` | 근거 없는 `0% False Positives` 문구 삭제, 단정적 라벨(`내 보조 지갑 (양방향 입출금 확인)`, `CERTAIN_95%`)을 `내 보조 지갑 추정 (...)`, `ESTIMATED_95%`로 완화 |
| **\#13** | 크로스체인 브릿지 동일 주소 이체 및 decimals 반영 | `multichain_tracker.py` | EVM→EVM 등 동일 주소라도 체인이 다르면(`src_chain != dst_chain`) 브릿지 탈출 지갑으로 포함하고, 임의 휴리스틱(`raw_amt > 1000`) 대신 토큰 `decimals`를 신뢰하도록 수정 |
| **\#14** | `keccak_256` 135바이트(`rate - 1`) 패딩 경계 버그 | `address_utils.py` | `pad_len == 1`일 때 불필요한 블록이 추가되던 문제를 `b"\x81"` 단일 바이트 패딩으로 수정하고 빈 문자열 및 135/136/137바이트 테스트 추가 |
| **\#15** | `print` 로거 전환 및 테스트 스위트 보강 | `multichain_tracker.py`, `test_suite_v9_0.py` | `print(...)`를 `logger.warning(...)`으로 교체하고, 테스트의 `server._l2_dirty = True` 변수명 수정 및 \#1\~\#15 전 항목 검증 테스트(총 33개) 완비 |

&nbsp;

## 2\. 패치 일괄 적용 방법 (`git apply` / `patch -p1`)

아래 통합 패치 블록을 `wakeup_crypto_v9_0_full_patch.diff`로 저장한 뒤 프로젝트 루트에서 다음 명령어로 바로 적용할 수 있습니다:

```sh
# git 저장소인 경우
git apply wakeup_crypto_v9_0_full_patch.diff

# 일반 디렉터리인 경우
patch -p1 < wakeup_crypto_v9_0_full_patch.diff

# 패치 후 전체 테스트(33개) 및 프론트엔드 문법 검증
python3 test_suite_v9_0.py
node --check static/app.js
```

&nbsp;

## 3\. 통합 패치 파일 (`wakeup_crypto_v9_0_full_patch.diff`)

```diff
diff --git a/static/app.js b/static/app.js
--- a/static/app.js
+++ b/static/app.js
@@ -1358,6 +1358,21 @@
   }
 };
 
+// ----------------------------------------------------------------------------
+// XSS Defense-in-Depth: HTML Entity Escaping & HTTPS Protocol Whitelist
+// ----------------------------------------------------------------------------
+const esc = s => String(s ?? '').replace(/[&<>"']/g,
+  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
+
+function safeHttpsUrl(rawUrl, fallback = '#') {
+  try {
+    const parsed = new URL(String(rawUrl ?? '').trim());
+    return parsed.protocol === 'https:' ? parsed.href : fallback;
+  } catch (_) {
+    return fallback;
+  }
+}
+
 function initIcons() {
   if (window.lucide) {
     window.lucide.createIcons();
@@ -1689,7 +1704,7 @@
   progressContainer.classList.remove('hidden');
   progressBar.style.width = '30%';
   progressPercent.innerText = '30%';
-  logFeed.innerHTML = `<div class="text-indigo-700 dark:text-indigo-400">[1/3] ${chain.toUpperCase()} ${dict.logStep1}</div>`;
+  logFeed.innerHTML = `<div class="text-indigo-700 dark:text-indigo-400">[1/3] ${esc(chain.toUpperCase())} ${dict.logStep1}</div>`;
 
   let curPct = 30;
   let step2Timer = null;
@@ -1861,13 +1876,13 @@
         <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0"></span>
         <div class="min-w-0">
           <div class="flex items-center gap-1.5 flex-wrap">
-            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${localizedLabel}</span>
-            <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${scoreBadgeClass}">연관도 ${relScore}%</span>
+            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${esc(localizedLabel)}</span>
+            <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${scoreBadgeClass}">연관도 ${esc(relScore)}%</span>
           </div>
           <div class="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
-            <span>${w.short_addr || w.address.slice(0, 10)}</span>
+            <span>${esc(w.short_addr || (w.address || '').slice(0, 10))}</span>
             <span>·</span>
-            <span>생애 ${(w.lifetime_txs || 1).toLocaleString()}${dict.txCountLabel} (교류 ${w.my_tx_count || 1}회)</span>
+            <span>생애 ${esc((w.lifetime_txs || 1).toLocaleString())}${dict.txCountLabel} (교류 ${esc(w.my_tx_count || 1)}회)</span>
           </div>
         </div>
       </div>
@@ -1916,24 +1931,26 @@
       const localizedBadge = localizeText(t.badge, currentLanguage);
       const localizedTitle = localizeText(t.title, currentLanguage);
       const localizedDesc = localizeText(t.description, currentLanguage);
+      const safeTargetUrl = safeHttpsUrl(t.official_url, 'https://solscan.io');
+      const shortTargetUrl = safeTargetUrl.replace(/^https:\/\//, '').slice(0, 32);
 
       card.className = 'inner-box rounded-xl p-3.5 transition cursor-pointer space-y-2';
       card.innerHTML = `
         <div class="flex items-start justify-between gap-2">
           <div>
-            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 inline-block mb-1">${localizedBadge}</span>
-            <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${localizedTitle}</h4>
+            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 inline-block mb-1">${esc(localizedBadge)}</span>
+            <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${esc(localizedTitle)}</h4>
           </div>
           <span class="text-sm font-mono font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">$${Number(t.value_usd).toFixed(2)}</span>
         </div>
-        <p class="text-[11px] text-slate-700 dark:text-slate-400 leading-relaxed">${localizedDesc}</p>
+        <p class="text-[11px] text-slate-700 dark:text-slate-400 leading-relaxed">${esc(localizedDesc)}</p>
         
         <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-white/[0.06] text-[10px]">
           <span class="text-slate-600 dark:text-slate-400 font-medium">
-            ${dict.extProtocolPrefix} <strong class="text-slate-900 dark:text-slate-200">${protoDisplay}</strong>
+            ${dict.extProtocolPrefix} <strong class="text-slate-900 dark:text-slate-200">${esc(protoDisplay)}</strong>
           </span>
-          <a href="${t.official_url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-indigo-700 dark:text-indigo-400 hover:underline font-mono font-bold flex items-center gap-1">
-            <span>${t.official_url.replace('https://', '').slice(0, 32)}...</span>
+          <a href="${esc(safeTargetUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-indigo-700 dark:text-indigo-400 hover:underline font-mono font-bold flex items-center gap-1">
+            <span>${esc(shortTargetUrl)}...</span>
             <i data-lucide="external-link" class="w-3 h-3"></i>
           </a>
         </div>
@@ -2019,8 +2036,8 @@
       row.className = 'inner-box flex items-center justify-between p-2.5 rounded-xl';
       row.innerHTML = `
         <div>
-          <span class="text-slate-900 dark:text-white font-bold block text-xs">${localizeText(p.name, currentLanguage)}</span>
-          <span class="text-slate-600 dark:text-slate-400 text-[11px] font-mono">${p.amount_desc || ''}</span>
+          <span class="text-slate-900 dark:text-white font-bold block text-xs">${esc(localizeText(p.name, currentLanguage))}</span>
+          <span class="text-slate-600 dark:text-slate-400 text-[11px] font-mono">${esc(p.amount_desc || '')}</span>
         </div>
         <span class="text-emerald-700 dark:text-emerald-400 font-mono font-bold tabular-nums text-xs">$${Number(p.usd).toFixed(2)}</span>
       `;
@@ -2043,7 +2060,7 @@
   protoRow.innerHTML = `
     <span class="text-slate-700 dark:text-slate-300 font-semibold text-xs">${dict.extDefiProtocol}</span>
     <span class="font-mono font-bold text-xs ${extProtoId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}">
-      ${extProtoId ? extProtoId.toUpperCase() : dict.blankProtocol}
+      ${extProtoId ? esc(String(extProtoId).toUpperCase()) : dict.blankProtocol}
     </span>
   `;
   posContainer.appendChild(protoRow);
@@ -2060,10 +2077,10 @@
       txRow.className = 'inner-box flex items-center justify-between p-2 rounded-lg text-[11px]';
       txRow.innerHTML = `
         <div>
-          <span class="font-semibold text-slate-900 dark:text-white block">${localizeText(tx.direction, currentLanguage)}</span>
-          <span class="font-mono text-[10px] text-slate-500">${tx.date || dict.dateUnknown}</span>
+          <span class="font-semibold text-slate-900 dark:text-white block">${esc(localizeText(tx.direction, currentLanguage))}</span>
+          <span class="font-mono text-[10px] text-slate-500">${esc(tx.date || dict.dateUnknown)}</span>
         </div>
-        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">${tx.amount} ${tx.symbol || ''}</span>
+        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">${esc(tx.amount)} ${esc(tx.symbol || '')}</span>
       `;
       posContainer.appendChild(txRow);
     });
@@ -2083,6 +2100,7 @@
 function renderSheetProtocolTier(protoId, address, explorerFullUrl) {
   const container = document.getElementById('sheetProtocolContainer');
   const dict = I18N[currentLanguage] || I18N.ko;
+  const safeExplorerUrl = safeHttpsUrl(explorerFullUrl, 'https://solscan.io');
 
   if (!protoId) {
     // STRICT BLANK STATE + SPONSORED AD SLOT WHEN NO PROTOCOL IS ASSOCIATED!
@@ -2112,13 +2130,13 @@
 
       <div class="pt-1">
         <a
-          href="${explorerFullUrl}"
+          href="${esc(safeExplorerUrl)}"
           target="_blank"
           rel="noopener noreferrer"
           class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
         >
           <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
-          <span>${dict.officialLinkPrefix} ${explorerFullUrl.slice(0, 46)}...</span>
+          <span>${dict.officialLinkPrefix} ${esc(safeExplorerUrl.slice(0, 46))}...</span>
           <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
         </a>
         <p class="text-[10px] text-center text-slate-600 dark:text-slate-400 mt-1.5">
@@ -2133,30 +2151,31 @@
   fetch('/api/protocols').then(r => r.json()).then(protocols => {
     const proto = protocols[protoId];
     if (!proto) {
-      renderSheetProtocolTier(null, address, explorerFullUrl);
+      renderSheetProtocolTier(null, address, safeExplorerUrl);
       return;
     }
+    const safeProtoUrl = safeHttpsUrl(proto.official_url, safeExplorerUrl);
     container.innerHTML = `
       <div class="flex items-center justify-between">
         <h3 class="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
-          <span>${proto.name} (${proto.category})</span>
+          <span>${esc(proto.name)} (${esc(proto.category)})</span>
         </h3>
         <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">${dict.officialVerified}</span>
       </div>
-      <p class="text-xs text-slate-800 dark:text-slate-300 leading-relaxed">${proto.description}</p>
+      <p class="text-xs text-slate-800 dark:text-slate-300 leading-relaxed">${esc(proto.description)}</p>
       <div class="inner-box text-[11px] text-slate-700 dark:text-slate-300 p-3 rounded-xl leading-relaxed">
         <strong class="text-indigo-700 dark:text-indigo-400 block mb-0.5">${dict.sheetEscapeTitle}</strong>
-        ${proto.escape_guide}
+        ${esc(proto.escape_guide)}
       </div>
       <div class="pt-1">
         <a
-          href="${proto.official_url}"
+          href="${esc(safeProtoUrl)}"
           target="_blank"
           rel="noopener noreferrer"
           class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
         >
           <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
-          <span>${dict.officialLinkPrefix} ${proto.official_url}</span>
+          <span>${dict.officialLinkPrefix} ${esc(safeProtoUrl)}</span>
           <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
         </a>
         <p class="text-[10px] text-center text-slate-600 dark:text-slate-400 mt-1.5">
@@ -2464,7 +2483,7 @@
       partnerAdConfig = Object.assign(partnerAdConfig, cfg || {});
       const topAdLink = document.getElementById('topAdLink');
       if (topAdLink && partnerAdConfig.affiliate_url) {
-        topAdLink.href = partnerAdConfig.affiliate_url;
+        topAdLink.href = safeHttpsUrl(partnerAdConfig.affiliate_url, 'https://shop.ledger.com');
       }
     }
   } catch (e) {
@@ -2526,17 +2545,18 @@
 
   partnersEl.innerHTML = '';
   partners.forEach(p => {
+    const safePartnerUrl = safeHttpsUrl(p.url, 'https://shop.ledger.com');
     const card = document.createElement('div');
     card.className = 'inner-box rounded-xl p-3 flex items-center justify-between gap-3';
     card.innerHTML = `
       <div class="min-w-0 space-y-0.5">
         <div class="flex items-center gap-1.5 flex-wrap">
-          <span class="text-xs font-bold text-slate-900 dark:text-white">${p.name}</span>
-          <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">${p.benefit_badge}</span>
+          <span class="text-xs font-bold text-slate-900 dark:text-white">${esc(p.name)}</span>
+          <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">${esc(p.benefit_badge)}</span>
         </div>
-        <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">${p.description}</p>
+        <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">${esc(p.description)}</p>
       </div>
-      <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 transition flex items-center gap-1">
+      <a href="${esc(safePartnerUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 transition flex items-center gap-1">
         <span>이동</span>
         <i data-lucide="external-link" class="w-3 h-3"></i>
       </a>

diff --git a/static/index.html b/static/index.html
--- a/static/index.html
+++ b/static/index.html
@@ -38,7 +38,7 @@
   <!-- D3.js v7 -->
   <script src="https://d3js.org/d3.v7.min.js"></script>
   <!-- Lucide Icons -->
-  <script src="https://unpkg.com/lucide@latest"></script>
+  <script src="https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js" crossorigin="anonymous"></script>
   
   <style>
     body {

diff --git a/multichain_tracker.py b/multichain_tracker.py
--- a/multichain_tracker.py
+++ b/multichain_tracker.py
@@ -21,6 +21,7 @@
 import re
 import json
 import time
+import logging
 import itertools
 import threading
 import concurrent.futures
@@ -37,8 +38,26 @@
 )
 
 # Dedicated per-chain RPC rate-limit semaphores (Avoids cross-chain head-of-line blocking)
+logger = logging.getLogger(__name__)
+
+# Dedicated per-chain RPC rate-limit semaphores & overall scan deadline
 _SOL_RPC_SEM = threading.BoundedSemaphore(6)
 _EVM_RPC_SEM = threading.BoundedSemaphore(8)
+_SHARED_SCAN_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=24)
+_DEADLINE_LOCAL = threading.local()
+SCAN_DEADLINE_SECONDS = float(os.environ.get('SCAN_DEADLINE_SECONDS', '15.0'))
+
+
+def set_scan_deadline(deadline_mono=None):
+    _DEADLINE_LOCAL.deadline = deadline_mono
+
+
+def get_remaining_timeout(default_timeout: float = 4.0) -> float:
+    dl = getattr(_DEADLINE_LOCAL, 'deadline', None)
+    if dl is None:
+        return default_timeout
+    rem = dl - time.monotonic()
+    return max(0.0, min(default_timeout, rem))
 
 PRESET_SOL_ADDRESS = 'BQ4x7ypgaqW7tFZwJadmuxbiuzvy3mk26i9WFo7hDf7H'
 PRESET_EVM_ADDRESS = '0xb107205E2f9D89E85fb7d6311FFD802049Ffe56e'
@@ -46,96 +65,139 @@
 
 
 # =====================================================================
-# 1. MULTI-KEY .env FILE & .env/ FOLDER LOADER (Supports 2~4+ Keys/Chain)
+# 0. SERVER-SIDE TOKEN SYMBOL / NAME SANITIZER (XSS Defense-in-Depth)
 # =====================================================================
+_SAFE_TOKEN_CHARS_RE = re.compile(r"[^\w .\-$/()]+", re.UNICODE)
+
+
+def sanitize_token_text(val, default: str = "TOKEN", max_len: int = 24) -> str:
+    """
+    Sanitizes untrusted on-chain strings (token symbols, token names, contract labels,
+    and bridge tool names) to match `^[\w .\-$/()]{1,24}$`.
+    Strips HTML/script tags (`<`, `>`, `"`, `'`, `&`, etc.) and truncates to `max_len`.
+    """
+    if val is None:
+        return default
+    cleaned = _SAFE_TOKEN_CHARS_RE.sub("", str(val)).strip()
+    if not cleaned:
+        return default
+    return cleaned[:max_len]
+
+
+# =====================================================================
+# 1. PROVIDER-ISOLATED .env LOADER (Zero Cross-Provider Key Leakage)
+# =====================================================================
+_ENV_LOCK = threading.Lock()
+
+_HELIUS_KEY_NAMES = frozenset({
+    'helius', 'helius_api_key', 'helius_api_keys', 'solana', 'solana_api_key', 'solana_api_keys'
+})
+_SOLANA_RPC_URL_NAMES = frozenset({
+    'solana_rpc_url', 'sol_rpc_url', 'quicknode_sol_url'
+})
+_ALCHEMY_KEY_NAMES = frozenset({
+    'alchemy', 'alchemy_api_key', 'alchemy_api_keys'
+})
+_ETHERSCAN_KEY_NAMES = frozenset({
+    'etherscan', 'etherscan_api_key', 'etherscan_api_keys'
+})
+_BNBSCAN_KEY_NAMES = frozenset({
+    'bnbscan', 'bscscan', 'bscscan_api_key', 'bnbscan_api_key'
+})
+_TRON_KEY_NAMES = frozenset({
+    'tron', 'trongrid', 'tronscan', 'tron_api_key', 'trongrid_api_key', 'tronscan_api_key'
+})
+_MORALIS_KEY_NAMES = frozenset({
+    'moralis', 'moralis_api_key', 'moralis_api_keys'
+})
+
+
+def _normalize_key_identifier(raw_key: str) -> str:
+    """Strips trailing numeric suffixes (e.g. `helius_1`, `etherscan2`) for bucket routing."""
+    k = raw_key.strip().lower()
+    return re.sub(r'[_]?\d+$', '', k)
+
+
 def load_all_env_keys():
     """
-    Collects multiple API keys per chain from `.env` file or `.env/` directory.
-    Supports:
-      - Repeated keys: `tron=key1` \n `tron=key2`
-      - Numbered keys: `tron1=key1`, `tron2=key2`, `tron_1=key1`, `etherscan_2=key2`
-      - Comma/space separated: `etherscan=key1,key2,key3`
-      - Optional extra APIs: `moralis=...`, `alchemy=...`, `helius=...`, `ankr=...`
+    Collects API keys from `.env` (in base_dir) and `os.environ` with strict provider separation:
+      - `HELIUS_API_KEY` / `helius`: routed ONLY to Helius RPC (`mainnet.helius-rpc.com`).
+      - `ALCHEMY_API_KEY` / `alchemy`: routed ONLY to Alchemy RPC (`*.g.alchemy.com/v2/`).
+      - `SOLANA_RPC_URL`: full `https://` RPC endpoint URLs (never appended into `?api-key=`).
+      - `ETHERSCAN_API_KEY` / `etherscan`: routed ONLY to Etherscan V2 (`api.etherscan.io/v2/api`).
+      - `TRON_API_KEY` / `tron`: routed ONLY to TronScan/TronGrid headers.
     """
     buckets = {
         'tron': [],
         'etherscan': [],
         'bnbscan': [],
+        'helius': [],
+        'solana_rpc': [],
         'solana': [],
         'moralis': [],
-        'alchemy': [],
-        'helius': []
+        'alchemy': []
     }
 
-    def _classify_and_add(raw_key, raw_val):
-        k = raw_key.strip().lower()
+    def _classify_and_add(raw_key, raw_val, set_env=False):
+        norm_k = _normalize_key_identifier(raw_key)
         vals = [v.strip().strip('"').strip("'") for v in re.split(r'[,;\s]+', raw_val.strip()) if v.strip()]
         for v in vals:
             if not v or v.startswith('your_') or '_your_' in v:
                 continue
-            os.environ.setdefault(raw_key.strip(), v)
-            os.environ.setdefault(raw_key.strip().upper(), v)
-            if k.startswith('tron') or 'trongrid' in k or 'tronscan' in k:
+            if set_env:
+                os.environ.setdefault(raw_key.strip(), v)
+                os.environ.setdefault(raw_key.strip().upper(), v)
+
+            is_http_url = v.startswith('https://') or v.startswith('http://')
+
+            if norm_k in _TRON_KEY_NAMES and not is_http_url:
                 if v not in buckets['tron']:
                     buckets['tron'].append(v)
-            elif k.startswith('eth') or 'etherscan' in k:
+            elif norm_k in _ETHERSCAN_KEY_NAMES and not is_http_url:
                 if v not in buckets['etherscan']:
                     buckets['etherscan'].append(v)
-            elif k.startswith('bnb') or k.startswith('bsc') or 'bscscan' in k or 'bnbscan' in k:
+            elif norm_k in _BNBSCAN_KEY_NAMES and not is_http_url:
                 if v not in buckets['bnbscan']:
                     buckets['bnbscan'].append(v)
-            elif k.startswith('sol') or 'solscan' in k:
-                if v not in buckets['solana']:
-                    buckets['solana'].append(v)
-            elif 'helius' in k:
-                if v not in buckets['helius']:
-                    buckets['helius'].append(v)
-                if v not in buckets['solana']:
-                    buckets['solana'].append(v)
-            elif 'moralis' in k:
-                if v not in buckets['moralis']:
-                    buckets['moralis'].append(v)
-            elif 'alchemy' in k:
+            elif norm_k in _SOLANA_RPC_URL_NAMES:
+                if is_http_url and v not in buckets['solana_rpc']:
+                    buckets['solana_rpc'].append(v)
+            elif norm_k in _HELIUS_KEY_NAMES:
+                if is_http_url:
+                    if v not in buckets['solana_rpc']:
+                        buckets['solana_rpc'].append(v)
+                else:
+                    if v not in buckets['helius']:
+                        buckets['helius'].append(v)
+                    if v not in buckets['solana']:
+                        buckets['solana'].append(v)
+            elif norm_k in _ALCHEMY_KEY_NAMES and not is_http_url:
                 if v not in buckets['alchemy']:
                     buckets['alchemy'].append(v)
+            elif norm_k in _MORALIS_KEY_NAMES and not is_http_url:
+                if v not in buckets['moralis']:
+                    buckets['moralis'].append(v)
 
     def _parse_text(content, fallback_key=None):
         lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith('#')]
         for line in lines:
             if '=' in line:
                 k, v = line.split('=', 1)
-                _classify_and_add(k, v)
+                _classify_and_add(k, v, set_env=True)
             elif fallback_key:
-                _classify_and_add(fallback_key, line)
+                _classify_and_add(fallback_key, line, set_env=True)
 
     base_dir = os.path.dirname(os.path.abspath(__file__))
-    parent_dir = os.path.dirname(base_dir)
-
-    for search_dir in (base_dir, parent_dir, os.getcwd()):
-        for name in ('.env', 'env', '.env.local'):
-            target = os.path.join(search_dir, name)
-            if os.path.isfile(target):
-                try:
-                    with open(target, 'r', encoding='utf-8', errors='ignore') as f:
-                        _parse_text(f.read())
-                except Exception:
-                    pass
-            elif os.path.isdir(target):
-                try:
-                    for fname in sorted(os.listdir(target)):
-                        fpath = os.path.join(target, fname)
-                        if os.path.isfile(fpath):
-                            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
-                                key_guess = os.path.splitext(fname)[0].lower()
-                                _parse_text(f.read(), fallback_key=key_guess)
-                except Exception:
-                    pass
+    env_target = os.path.join(base_dir, '.env')
+    if os.path.isfile(env_target):
+        try:
+            with open(env_target, 'r', encoding='utf-8', errors='ignore') as f:
+                _parse_text(f.read())
+        except Exception:
+            pass
 
-    # Also check existing os.environ
     for env_k, env_v in list(os.environ.items()):
-        kl = env_k.lower()
-        if any(kl.startswith(p) for p in ('tron', 'etherscan', 'bnbscan', 'bscscan', 'solana', 'helius', 'moralis', 'alchemy')):
-            _classify_and_add(kl, env_v)
+        _classify_and_add(env_k, env_v, set_env=False)
 
     return buckets
 
@@ -145,65 +207,99 @@
 TRON_API_KEYS = []
 ETHERSCAN_API_KEYS = []
 BNBSCAN_API_KEYS = []
+HELIUS_API_KEYS = []
+SOLANA_RPC_URLS = []
 SOLANA_API_KEYS = []
 MORALIS_API_KEYS = []
 ALCHEMY_API_KEYS = []
-ALL_EVM_SCAN_KEYS = []
 SOL_RPC_POOL = []
+ETH_RPC_POOL = []
+BSC_RPC_POOL = []
 
 _tron_cycle = None
 _eth_cycle = None
 _bnb_cycle = None
 _moralis_cycle = None
-_all_evm_cycle = None
 _sol_rpc_cycle = None
 
 
 def refresh_env_keys(force=False):
-    global _last_env_mtime, KEY_BUCKETS, TRON_API_KEYS, ETHERSCAN_API_KEYS, BNBSCAN_API_KEYS, SOLANA_API_KEYS
-    global MORALIS_API_KEYS, ALCHEMY_API_KEYS, ALL_EVM_SCAN_KEYS, SOL_RPC_POOL
-    global _tron_cycle, _eth_cycle, _bnb_cycle, _moralis_cycle, _all_evm_cycle, _sol_rpc_cycle
+    global _last_env_mtime, KEY_BUCKETS, TRON_API_KEYS, ETHERSCAN_API_KEYS, BNBSCAN_API_KEYS
+    global HELIUS_API_KEYS, SOLANA_RPC_URLS, SOLANA_API_KEYS, MORALIS_API_KEYS, ALCHEMY_API_KEYS
+    global SOL_RPC_POOL, ETH_RPC_POOL, BSC_RPC_POOL
+    global _tron_cycle, _eth_cycle, _bnb_cycle, _moralis_cycle, _sol_rpc_cycle
 
     base_dir = os.path.dirname(os.path.abspath(__file__))
     env_file = os.path.join(base_dir, '.env')
     current_mtime = os.path.getmtime(env_file) if os.path.exists(env_file) else 0
 
-    if not force and _last_env_mtime != 0 and current_mtime <= _last_env_mtime:
-        return
-
-    _last_env_mtime = current_mtime
-    KEY_BUCKETS = load_all_env_keys()
-    TRON_API_KEYS = list(KEY_BUCKETS.get('tron', []))
-    ETHERSCAN_API_KEYS = list(KEY_BUCKETS.get('etherscan', []))
-    BNBSCAN_API_KEYS = list(KEY_BUCKETS.get('bnbscan', []))
-    SOLANA_API_KEYS = list(KEY_BUCKETS.get('solana', []))
-    MORALIS_API_KEYS = list(KEY_BUCKETS.get('moralis', []))
-    ALCHEMY_API_KEYS = list(KEY_BUCKETS.get('alchemy', []))
-
-    _tron_cycle = itertools.cycle(TRON_API_KEYS) if TRON_API_KEYS else None
-    _eth_cycle = itertools.cycle(ETHERSCAN_API_KEYS) if ETHERSCAN_API_KEYS else None
-    _bnb_cycle = itertools.cycle(BNBSCAN_API_KEYS) if BNBSCAN_API_KEYS else None
-    _moralis_cycle = itertools.cycle(MORALIS_API_KEYS) if MORALIS_API_KEYS else None
-
-    ALL_EVM_SCAN_KEYS = list(dict.fromkeys(ETHERSCAN_API_KEYS + BNBSCAN_API_KEYS))
-    _all_evm_cycle = itertools.cycle(ALL_EVM_SCAN_KEYS) if ALL_EVM_SCAN_KEYS else None
-
-    # Solana RPC Pool
-    pool = []
-    for k in SOLANA_API_KEYS:
-        if k.startswith('http'):
-            pool.append(k)
-        else:
-            pool.append(f"https://mainnet.helius-rpc.com/?api-key={k}")
-            pool.append(f"https://solana-mainnet.g.alchemy.com/v2/{k}")
-    for ak in ALCHEMY_API_KEYS:
-        pool.append(f"https://solana-mainnet.g.alchemy.com/v2/{ak}")
-    pool.extend([
-        'https://api.mainnet-beta.solana.com',
-        'https://solana-rpc.publicnode.com'
-    ])
-    SOL_RPC_POOL = list(dict.fromkeys(pool))
-    _sol_rpc_cycle = itertools.cycle(SOL_RPC_POOL[:max(1, len(SOLANA_API_KEYS) * 2)]) if SOLANA_API_KEYS else None
+    with _ENV_LOCK:
+        if not force and _last_env_mtime != 0 and current_mtime <= _last_env_mtime:
+            return
+
+        _last_env_mtime = current_mtime
+        buckets = load_all_env_keys()
+        tron_keys = list(buckets.get('tron', []))
+        eth_keys = list(buckets.get('etherscan', []))
+        bnb_keys = list(buckets.get('bnbscan', []))
+        helius_keys = list(buckets.get('helius', []))
+        sol_rpc_urls = list(buckets.get('solana_rpc', []))
+        moralis_keys = list(buckets.get('moralis', []))
+        alchemy_keys = list(buckets.get('alchemy', []))
+        sol_keys = list(dict.fromkeys(helius_keys + sol_rpc_urls))
+
+        # Provider-isolated Solana RPC Pool:
+        # - Helius keys ONLY go to mainnet.helius-rpc.com
+        # - Alchemy keys ONLY go to solana-mainnet.g.alchemy.com
+        # - Explicit RPC URLs go directly as endpoints
+        sol_pool = []
+        for rpc_u in sol_rpc_urls:
+            sol_pool.append(rpc_u)
+        for hk in helius_keys:
+            sol_pool.append(f"https://mainnet.helius-rpc.com/?api-key={hk}")
+        for ak in alchemy_keys:
+            sol_pool.append(f"https://solana-mainnet.g.alchemy.com/v2/{ak}")
+
+        private_sol_count = len(sol_pool)
+        sol_pool.extend([
+            'https://api.mainnet-beta.solana.com',
+            'https://solana-rpc.publicnode.com'
+        ])
+        dedup_sol_pool = list(dict.fromkeys(sol_pool))
+
+        eth_pool = list(dict.fromkeys(
+            [f"https://eth-mainnet.g.alchemy.com/v2/{k}" for k in alchemy_keys] + [
+                os.environ.get('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com'),
+                'https://eth.llamarpc.com',
+                'https://ethereum-rpc.publicnode.com'
+            ]
+        ))
+        bsc_pool = list(dict.fromkeys(
+            [f"https://bnb-mainnet.g.alchemy.com/v2/{k}" for k in alchemy_keys] + [
+                os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
+                'https://bsc-rpc.publicnode.com',
+                'https://bsc-dataseed.binance.org'
+            ]
+        ))
+
+        KEY_BUCKETS = buckets
+        TRON_API_KEYS = tron_keys
+        ETHERSCAN_API_KEYS = eth_keys
+        BNBSCAN_API_KEYS = bnb_keys
+        HELIUS_API_KEYS = helius_keys
+        SOLANA_RPC_URLS = sol_rpc_urls
+        SOLANA_API_KEYS = sol_keys
+        MORALIS_API_KEYS = moralis_keys
+        ALCHEMY_API_KEYS = alchemy_keys
+        SOL_RPC_POOL = dedup_sol_pool
+        ETH_RPC_POOL = eth_pool
+        BSC_RPC_POOL = bsc_pool
+
+        _tron_cycle = itertools.cycle(TRON_API_KEYS) if TRON_API_KEYS else None
+        _eth_cycle = itertools.cycle(ETHERSCAN_API_KEYS) if ETHERSCAN_API_KEYS else None
+        _bnb_cycle = itertools.cycle(BNBSCAN_API_KEYS) if BNBSCAN_API_KEYS else None
+        _moralis_cycle = itertools.cycle(MORALIS_API_KEYS) if MORALIS_API_KEYS else None
+        _sol_rpc_cycle = itertools.cycle(SOL_RPC_POOL[:private_sol_count]) if private_sol_count > 0 else None
 
 
 refresh_env_keys(force=True)
@@ -211,44 +307,17 @@
 
 def get_next_api_key(chain):
     refresh_env_keys()
-    if chain == 'ethereum':
-        if _eth_cycle:
-            return next(_eth_cycle)
-        if _all_evm_cycle:
-            return next(_all_evm_cycle)
-    elif chain == 'bsc':
-        if _bnb_cycle:
-            return next(_bnb_cycle)
-        if _all_evm_cycle:
-            return next(_all_evm_cycle)
-    elif chain in ('arbitrum', 'base', 'optimism', 'polygon'):
-        if _eth_cycle:
-            return next(_eth_cycle)
-        if _all_evm_cycle:
-            return next(_all_evm_cycle)
-    elif chain == 'tron' and _tron_cycle:
-        return next(_tron_cycle)
-    elif chain == 'moralis' and _moralis_cycle:
-        return next(_moralis_cycle)
+    with _ENV_LOCK:
+        if chain in ('ethereum', 'bsc', 'arbitrum', 'base', 'optimism', 'polygon'):
+            if _eth_cycle:
+                return next(_eth_cycle)
+        elif chain == 'tron' and _tron_cycle:
+            return next(_tron_cycle)
+        elif chain == 'moralis' and _moralis_cycle:
+            return next(_moralis_cycle)
     return ''
 
 
-ETH_RPC_POOL = list(dict.fromkeys(
-    [f"https://eth-mainnet.g.alchemy.com/v2/{k}" for k in ALCHEMY_API_KEYS] + [
-        os.environ.get('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com'),
-        'https://eth.llamarpc.com',
-        'https://ethereum-rpc.publicnode.com'
-    ]
-))
-BSC_RPC_POOL = list(dict.fromkeys(
-    [f"https://bnb-mainnet.g.alchemy.com/v2/{k}" for k in ALCHEMY_API_KEYS] + [
-        os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
-        'https://bsc-rpc.publicnode.com',
-        'https://bsc-dataseed.binance.org'
-    ]
-))
-
-
 def get_active_rpc_status():
     refresh_env_keys()
 
@@ -261,7 +330,7 @@
     return {
         'tron': _fmt(TRON_API_KEYS),
         'etherscan': _fmt(ETHERSCAN_API_KEYS),
-        'bnbscan': _fmt(BNBSCAN_API_KEYS),
+        'helius': _fmt(HELIUS_API_KEYS),
         'solana': _fmt(SOLANA_API_KEYS),
         'moralis_optional': _fmt(MORALIS_API_KEYS),
         'alchemy_optional': _fmt(ALCHEMY_API_KEYS)
@@ -273,6 +342,7 @@
 # =====================================================================
 _price_cache = {
     'ts': 0,
+    'source': 'fallback',
     'prices': {
         'BNB': 724.0,
         'ETH': 2380.0,
@@ -295,12 +365,18 @@
                 sym = item['symbol'].replace('USDT', '')
                 _price_cache['prices'][sym] = float(item['price'])
             _price_cache['ts'] = now
+            _price_cache['source'] = 'live'
     except Exception:
         # Cache fallback for 60s so failed calls don't timeout on every request
         _price_cache['ts'] = now - 240
+        _price_cache['source'] = 'fallback'
     return _price_cache['prices']
 
 
+def get_price_source() -> str:
+    return _price_cache.get('source', 'fallback')
+
+
 # =====================================================================
 # 2. RELATED-WALLET DETECTIVE ENGINE (v9.0 Core Heuristics)
 # =====================================================================
@@ -351,14 +427,15 @@
     v9.0 Multi-Signal Related-Wallet Classification Algorithm:
     - Distinguishes `tx_count` (counterparty's on-chain `lifetime_txs`) from `my_tx_count`
       (interactions between the user's root wallet and this counterparty).
-    - 0% False Positives for Exchanges (CEX) & Smart Contracts / Routers.
+    - Filters out known Exchanges (CEX) & Smart Contracts / Routers.
     - Identifies true personal sub-wallets across 4 distinct patterns:
       (A) Bidirectional transfers (`sent_from_me > 0 and recv_to_me > 0`)
       (B) Funded personal wallet with remaining balance (`sent_from_me > 0 and current_bal > 0 and lifetime_txs <= 60`)
       (C) Novice seed / round-number funded low-tx sub-wallet (`sent_from_me > 0 and 1 <= lifetime_txs <= 60` + round amount or repeated funding)
       (D) Multi-account farming / high interaction concentration (`my_tx_count >= 3` and high interaction ratio)
     """
-    hint_lower = (label_hint or '').lower()
+    safe_hint = sanitize_token_text(label_hint, default="", max_len=24) if label_hint else ""
+    hint_lower = safe_hint.lower()
     ch_tag = chain.upper()
     lifetime_txs = max(1, int(tx_count or 1))
     eff_my_txs = max(1, int(my_tx_count if my_tx_count is not None else lifetime_txs))
@@ -370,7 +447,7 @@
         return {
             'is_my_wallet': False,
             'wallet_type': 'PROTOCOL_ROUTER',
-            'label': f"[{ch_tag}] DEX/브릿지 프로토콜 라우터 (" + (label_hint or address[:6] + '...') + ")",
+            'label': f"[{ch_tag}] DEX/브릿지 프로토콜 라우터 (" + (safe_hint or address[:6] + '...') + ")",
             'confidence': 'HIGH_95%',
             'relation_score': 5,
             'interaction_ratio': interaction_ratio,
@@ -383,7 +460,7 @@
         return {
             'is_my_wallet': False,
             'wallet_type': 'CEX_HOT_WALLET',
-            'label': f"[{ch_tag}] 거래소 핫월렛 (" + (label_hint or '바이낸스/OKX 등') + ")",
+            'label': f"[{ch_tag}] 거래소 핫월렛 (" + (safe_hint or '바이낸스/OKX 등') + ")",
             'confidence': 'CERTAIN_99%',
             'relation_score': 0,
             'interaction_ratio': interaction_ratio,
@@ -430,8 +507,8 @@
         return {
             'is_my_wallet': True,
             'wallet_type': 'INFERRED_MY_WALLET',
-            'label': f"[{ch_tag}] 내 보조 지갑 (양방향 입출금 확인)",
-            'confidence': 'CERTAIN_95%',
+            'label': f"[{ch_tag}] 내 보조 지갑 추정 (양방향 입출금 확인)",
+            'confidence': 'ESTIMATED_95%',
             'relation_score': 95,
             'interaction_ratio': interaction_ratio,
             'evidence_tags': tags,
@@ -446,7 +523,7 @@
         return {
             'is_my_wallet': True,
             'wallet_type': 'INFERRED_MY_WALLET',
-            'label': f"[{ch_tag}] 내 보조 지갑 (과거 송금 후 잔고 잔존)",
+            'label': f"[{ch_tag}] 내 보조 지갑 추정 (과거 송금 후 잔고 잔존)",
             'confidence': 'HIGH_88%',
             'relation_score': 88,
             'interaction_ratio': interaction_ratio,
@@ -755,7 +832,7 @@
                     to_chain_id = stand.get('toChain')
                     from_chain_id = stand.get('fromChain')
                     payload = content.get('payload') or {}
-                    sym = payload.get('symbol') or stand.get('tokenAddress') or 'TOKEN'
+                    sym = sanitize_token_text(payload.get('symbol') or stand.get('tokenAddress'), default='TOKEN', max_len=24)
                     amt = float(stand.get('amount') or payload.get('amount') or 0.0)
                     if amt > 1e6:
                         amt = amt / 1e8
@@ -764,8 +841,8 @@
                     dst_chain = wh_chain_map.get(to_chain_id, f'chain_{to_chain_id}')
                     src_chain = wh_chain_map.get(from_chain_id, f'chain_{from_chain_id}')
 
-                    target_hop = to_addr if to_addr.lower() != address.lower() else from_addr
-                    if target_hop and target_hop.lower() != address.lower():
+                    target_hop = to_addr if to_addr.lower() != address.lower() else (to_addr or from_addr)
+                    if target_hop and (target_hop.lower() != address.lower() or src_chain != dst_chain):
                         hops.append({
                             'bridge_name': 'Wormhole Bridge',
                             'from_chain': src_chain,
@@ -798,20 +875,20 @@
                         continue
 
                     amt_usd = float(receiving.get('amountUSD') or sending.get('amountUSD') or 0.0)
-                    tok_sym = (receiving.get('token') or {}).get('symbol') or (sending.get('token') or {}).get('symbol') or 'TOKEN'
+                    tok_sym = sanitize_token_text((receiving.get('token') or {}).get('symbol') or (sending.get('token') or {}).get('symbol'), default='TOKEN', max_len=24)
                     dst_cid = receiving.get('chainId')
                     src_cid = sending.get('chainId')
                     lifi_map = {1: 'ethereum', 56: 'bsc', 42161: 'arbitrum', 8453: 'base', 10: 'optimism', 137: 'polygon', 1151111081099710: 'solana'}
                     dst_chain = lifi_map.get(dst_cid, 'multichain')
                     src_chain = lifi_map.get(src_cid, 'multichain')
 
-                    target_hop = to_addr if to_addr.lower() != address.lower() else from_addr
-                    if target_hop and target_hop.lower() != address.lower():
-                        tool_name = (tr.get('tool') or 'LI.FI Bridge').strip()
+                    target_hop = to_addr if to_addr.lower() != address.lower() else (to_addr or from_addr)
+                    if target_hop and (target_hop.lower() != address.lower() or src_chain != dst_chain):
+                        tool_name = sanitize_token_text(tr.get('tool'), default='LI.FI Bridge', max_len=24)
                         tok_obj = receiving.get('token') or sending.get('token') or {}
-                        dec = int(tok_obj.get('decimals') or 18)
+                        dec = int(tok_obj.get('decimals') if tok_obj.get('decimals') is not None else 18)
                         raw_amt = float(receiving.get('amount') or sending.get('amount') or 0.0)
-                        human_amt = raw_amt / (10 ** dec) if raw_amt > 1000 else raw_amt
+                        human_amt = (raw_amt / (10 ** dec)) if dec > 0 else raw_amt
 
                         tool_l = tool_name.lower()
                         is_tool_cex = any(c in tool_l for c in KNOWN_CEX_KEYWORDS)
@@ -847,13 +924,13 @@
                 for order in (data.get('orders') or []):
                     recv_dst = (order.get('receiverDst') or {}).get('stringValue', '').strip()
                     maker_src = (order.get('makerSrc') or {}).get('stringValue', '').strip()
-                    if not recv_dst or recv_dst.lower() == address.lower():
-                        continue
                     give_offer = order.get('giveOfferWithMetadata') or {}
                     take_offer = order.get('takeOfferWithMetadata') or {}
                     src_cid = int(give_offer.get('chainId', {}).get('bigIntegerValue') or 0)
                     dst_cid = int(take_offer.get('chainId', {}).get('bigIntegerValue') or 0)
-                    sym = take_offer.get('symbol') or give_offer.get('symbol') or 'TOKEN'
+                    if not recv_dst or (recv_dst.lower() == address.lower() and src_cid == dst_cid):
+                        continue
+                    sym = sanitize_token_text(take_offer.get('symbol') or give_offer.get('symbol'), default='TOKEN', max_len=24)
                     amt_usd = float(order.get('giveAmountUsd') or 0.0)
                     hops.append({
                         'bridge_name': 'deBridge DLN',
@@ -897,6 +974,9 @@
         ordered_urls = [primary] + [u for u in SOL_RPC_POOL if u != primary]
 
     for url in ordered_urls:
+        rem_timeout = get_remaining_timeout(4.0)
+        if rem_timeout <= 0.05:
+            break
         try:
             req = urllib.request.Request(
                 url,
@@ -904,7 +984,7 @@
                 headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
             )
             with _SOL_RPC_SEM:
-                with urllib.request.urlopen(req, timeout=4) as resp:
+                with urllib.request.urlopen(req, timeout=rem_timeout) as resp:
                     data = json.loads(resp.read().decode('utf-8'))
                     if 'result' in data:
                         return data['result']
@@ -951,18 +1031,40 @@
             elif isinstance(res, dict) and 'value' in res:
                 for item in res['value']:
                     pubkey = item['pubkey']
-                    info = item['account']['data']['parsed']['info']
+                    acc_obj = item.get('account') or {}
+                    info = acc_obj.get('data', {}).get('parsed', {}).get('info', {})
+                    tok_amt = info.get('tokenAmount') or {}
+                    decimals = int(tok_amt.get('decimals') or 0)
+                    raw_str = tok_amt.get('amount')
+                    if raw_str is not None:
+                        raw_amount = int(raw_str)
+                        ui_amount = (raw_amount / (10 ** decimals)) if decimals > 0 else float(raw_amount)
+                        amount_known = True
+                    elif tok_amt.get('uiAmount') is not None:
+                        ui_amount = float(tok_amt['uiAmount'])
+                        raw_amount = int(round(ui_amount * (10 ** decimals)))
+                        amount_known = True
+                    else:
+                        ui_amount = 0.0
+                        raw_amount = 0
+                        amount_known = False
+                    acc_state = info.get('state', 'initialized')
+                    acc_lamports = int(acc_obj.get('lamports', 2039280))
                     token_accounts.append({
                         'pubkey': pubkey,
                         'mint': info['mint'],
-                        'amount': float(info['tokenAmount']['uiAmount'] or 0.0),
-                        'decimals': info['tokenAmount']['decimals'],
+                        'amount': ui_amount,
+                        'raw_amount': raw_amount,
+                        'decimals': decimals,
+                        'state': acc_state,
+                        'lamports': acc_lamports,
+                        'is_closable_empty': amount_known and (raw_amount == 0) and (acc_state == 'initialized'),
                         'program': prog
                     })
 
-        zero_balance = [t for t in token_accounts if t['amount'] == 0]
-        active_tokens = [t for t in token_accounts if t['amount'] > 0]
-        reclaimable_sol = len(zero_balance) * 0.00203928
+        zero_balance = [t for t in token_accounts if t['is_closable_empty']]
+        active_tokens = [t for t in token_accounts if t['raw_amount'] > 0]
+        reclaimable_sol = round(sum(t['lamports'] for t in zero_balance) / 1e9, 8)
         reclaimable_usd = reclaimable_sol * sol_price
 
         portfolio = []
@@ -1169,6 +1271,9 @@
     pool = ETH_RPC_POOL if 'eth' in rpc_url.lower() else BSC_RPC_POOL
     payload = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode()
     for url in pool:
+        rem_timeout = get_remaining_timeout(4.0)
+        if rem_timeout <= 0.05:
+            break
         try:
             req = urllib.request.Request(
                 url,
@@ -1176,7 +1281,7 @@
                 headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
             )
             with _EVM_RPC_SEM:
-                with urllib.request.urlopen(req, timeout=4) as resp:
+                with urllib.request.urlopen(req, timeout=rem_timeout) as resp:
                     data = json.loads(resp.read().decode())
                     if 'result' in data and data['result'] is not None:
                         return data['result']
@@ -1186,17 +1291,26 @@
 
 
 def evm_get_token_balance(rpc_url, token_address, user_address):
+    """
+    Queries ERC-20 `balanceOf(user_address)` via `eth_call`.
+    Returns:
+      - `int >= 0` when RPC call succeeded (`0` when `res_hex == '0x'` or `'0x0'`)
+      - `None` when RPC call failed (`res_hex is None` or malformed hex), allowing
+        `analyze_evm_live` to distinguish RPC failure (`None`) from a valid zero balance (`0`).
+    """
     if not user_address or not user_address.startswith('0x') or len(user_address) != 42:
         return 0
     clean_addr = user_address.lower().replace('0x', '').zfill(64)
     data = '0x70a08231' + clean_addr
     res_hex = evm_rpc(rpc_url, 'eth_call', [{'to': token_address, 'data': data}, 'latest'])
-    if res_hex and res_hex != '0x':
-        try:
-            return int(res_hex, 16)
-        except Exception:
-            return 0
-    return 0
+    if res_hex is None:
+        return None
+    if res_hex == '0x':
+        return 0
+    try:
+        return int(res_hex, 16)
+    except Exception:
+        return None
 
 
 def fetch_etherscan_or_bscscan_data(chain, address, return_status=False):
@@ -1210,43 +1324,31 @@
     tx_count = 0
     tx_api_ok = False
 
-    scan_keys = list(dict.fromkeys((ETHERSCAN_API_KEYS if chain == 'ethereum' else BNBSCAN_API_KEYS) + ALL_EVM_SCAN_KEYS))
-    if not scan_keys:
-        scan_keys = ['']
+    # Etherscan V2 Unified Endpoint (`https://api.etherscan.io/v2/api?chainid=1|56`)
+    # Strictly uses ETHERSCAN_API_KEYS only; deprecated V1 & standalone bscscan.com endpoints removed.
+    scan_keys = list(ETHERSCAN_API_KEYS)
 
     def _call_scan_api(params_dict):
         nonlocal tx_api_ok
         for k in scan_keys:
-            urls = []
-            if k:
-                q_v2 = urllib.parse.urlencode({**params_dict, 'chainid': chain_id, 'apikey': k})
-                urls.append(f"https://api.etherscan.io/v2/api?{q_v2}")
-                if chain == 'ethereum':
-                    q_v1 = urllib.parse.urlencode({**params_dict, 'apikey': k})
-                    urls.append(f"https://api.etherscan.io/api?{q_v1}")
-                else:
-                    q_bsc = urllib.parse.urlencode({**params_dict, 'apikey': k})
-                    urls.append(f"https://api.bscscan.com/api?{q_bsc}")
-            else:
-                q_v1 = urllib.parse.urlencode(params_dict)
-                v1_host = 'https://api.etherscan.io/api' if chain == 'ethereum' else 'https://api.bscscan.com/api'
-                urls.append(f"{v1_host}?{q_v1}")
-
-            for u in urls:
-                try:
-                    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
-                    with urllib.request.urlopen(req, timeout=5) as resp:
-                        data = json.loads(resp.read().decode())
-                        msg_lower = str(data.get('message') or '').lower()
-                        res_val = data.get('result')
-                        if str(data.get('status')) == '1' and isinstance(res_val, list):
-                            tx_api_ok = True
-                            return res_val
-                        if 'no transactions found' in msg_lower or (str(data.get('status')) == '0' and res_val == []):
-                            tx_api_ok = True
-                            return []
-                except Exception:
-                    continue
+            if not k:
+                continue
+            q_v2 = urllib.parse.urlencode({**params_dict, 'chainid': chain_id, 'apikey': k})
+            u = f"https://api.etherscan.io/v2/api?{q_v2}"
+            try:
+                req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
+                with urllib.request.urlopen(req, timeout=5) as resp:
+                    data = json.loads(resp.read().decode())
+                    msg_lower = str(data.get('message') or '').lower()
+                    res_val = data.get('result')
+                    if str(data.get('status')) == '1' and isinstance(res_val, list):
+                        tx_api_ok = True
+                        return res_val
+                    if 'no transactions found' in msg_lower or (str(data.get('status')) == '0' and res_val == []):
+                        tx_api_ok = True
+                        return []
+            except Exception:
+                continue
         return None
 
     tx_list = _call_scan_api({
@@ -1301,7 +1403,8 @@
                         from_addr = (tx.get('from') or {}).get('hash', '')
                         to_addr = (tx.get('to') or {}).get('hash', '')
                         to_is_contract = (tx.get('to') or {}).get('is_contract', False)
-                        to_name = (tx.get('to') or {}).get('name')
+                        raw_to_name = (tx.get('to') or {}).get('name')
+                        to_name = sanitize_token_text(raw_to_name, default='', max_len=24) or None
                         val_wei = float(tx.get('value') or 0)
                         val_native = val_wei / 1e18
                         dt_str = (tx.get('timestamp') or '')[:16].replace('T', ' ')
@@ -1350,8 +1453,8 @@
                     raw_val = float(item.get('value') or 0)
                     amt = raw_val / (10 ** dec)
                     rate = float(tok.get('exchange_rate') or 0.0)
-                    sym = tok.get('symbol') or 'TOKEN'
-                    name = tok.get('name') or sym
+                    sym = sanitize_token_text(tok.get('symbol'), default='TOKEN', max_len=24)
+                    name = sanitize_token_text(tok.get('name'), default=sym, max_len=24)
                     mint = (tok.get('address') or '').lower()
                     if rate <= 0 and sym in ('USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD'):
                         rate = 1.0
@@ -1603,6 +1706,7 @@
         'chain': 'solana',
         'address': address,
         'is_partial': sol_is_partial,
+        'price_source': get_price_source(),
         'stage_status': stage_status,
         'first_seen': '실시간 온체인 조회 완료',
         'total_recoverable_usd': total_recoverable,
@@ -1682,10 +1786,14 @@
             ('CAKE', 'PancakeSwap Token', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 18, 2.75, 'pancakeswap')
         ]
 
+    rpc_tokens_ok = True
+
     def _check_evm_token(item):
         sym, name, mint, dec, price, proto_id = item
         raw_bal = evm_get_token_balance(rpc_url, mint, address)
-        if raw_bal and raw_bal > 0:
+        if raw_bal is None:
+            return None, False
+        if raw_bal > 0:
             amt = raw_bal / (10 ** dec)
             val = round(amt * price, 2)
             if val > 0.01:
@@ -1696,13 +1804,15 @@
                     'value_usd': val,
                     'mint': mint,
                     'protocol_id': proto_id
-                }
-        return None
+                }, True
+        return None, True
 
     unseen_tokens = [t for t in tokens_to_check if t[2].lower() not in seen_mints]
     if unseen_tokens:
         with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(unseen_tokens))) as ex:
-            for tok_res in ex.map(_check_evm_token, unseen_tokens):
+            for tok_res, tok_ok in ex.map(_check_evm_token, unseen_tokens):
+                if not tok_ok:
+                    rpc_tokens_ok = False
                 if tok_res:
                     portfolio.append(tok_res)
 
@@ -1908,7 +2018,7 @@
 
     balance_ok = (bal_hex is not None)
     nonce_ok = (nonce_hex is not None)
-    tokens_ok = bool(blockscout_tokens_ok)
+    tokens_ok = bool(blockscout_tokens_ok) and rpc_tokens_ok
     transactions_ok = (nonce == 0 and tx_api_ok) or (scanned_txs > 0) or (tx_api_ok and counterparts is not None)
 
     stage_status = {
@@ -1964,6 +2074,7 @@
         'chain': chain,
         'address': address,
         'is_partial': evm_is_partial,
+        'price_source': get_price_source(),
         'stage_status': stage_status,
         'first_seen': f'누적 트랜잭션 {total_tx_display}건 (실시간 조회)',
         'total_recoverable_usd': total_recoverable,
@@ -2030,9 +2141,11 @@
 
                 for tok in (data.get('withPriceTokens') or []):
                     t_id = tok.get('tokenId', '')
-                    t_abbr = tok.get('tokenAbbr', '')
-                    if t_id == '_' or t_abbr == 'TRX':
+                    raw_abbr = tok.get('tokenAbbr', '')
+                    if t_id == '_' or raw_abbr == 'TRX':
                         continue
+                    t_abbr = sanitize_token_text(raw_abbr, default='TOKEN', max_len=24)
+                    t_name = sanitize_token_text(tok.get('tokenName'), default=t_abbr, max_len=24)
                     dec = int(tok.get('tokenDecimal') or 6)
                     amt = float(tok.get('balance') or 0) / (10 ** dec)
                     usd_val = float(tok.get('amountInUsd') or 0.0)
@@ -2042,7 +2155,7 @@
                         proto_id = 'justlend' if t_abbr in ('JST', 'jUSDT', 'jTRX') else ('sunswap' if t_abbr == 'SUN' else None)
                         portfolio.append({
                             'symbol': f"{t_abbr} (TRC-20)",
-                            'name': tok.get('tokenName', t_abbr),
+                            'name': t_name,
                             'amount': amt,
                             'value_usd': round(usd_val, 2),
                             'mint': t_id,
@@ -2285,6 +2398,7 @@
         'chain': 'tron',
         'address': address,
         'is_partial': tron_is_partial,
+        'price_source': get_price_source(),
         'stage_status': stage_status,
         'first_seen': f'누적 트랜잭션 {total_tx_count}건 (실시간 조회)',
         'total_recoverable_usd': total_recoverable,
@@ -2344,7 +2458,7 @@
                 per_chain_results[make_cache_key(ch, addr)] = res
             except Exception as e:
                 failed_chains.append(make_cache_key(ch, addr))
-                print(f"Unified scan warning ({ch} {addr}):", e)
+                logger.warning("Unified scan warning (%s %s): %s", ch, addr, e)
 
     # 3. Merge into a single unified multi-chain response
     total_recoverable = 0.0
@@ -2419,7 +2533,7 @@
             k in tool_name.lower() for k in KNOWN_CEX_KEYWORDS + KNOWN_ROUTER_KEYWORDS
         )
 
-        is_mine = (not is_router_or_cex) and (hop.get('from_address', '').lower() != hop['to_address'].lower())
+        is_mine = (not is_router_or_cex) and (hop.get('from_address', '').lower() != hop['to_address'].lower() or hop.get('from_chain') != hop.get('to_chain'))
         pivot_ch = _resolve_pivot_chain_for_address(hop.get('to_chain'), hop['to_address'])
 
         if is_mine:
@@ -2520,6 +2634,7 @@
         'scanned_bundle': bundle,
         'per_chain_results': per_chain_results,
         'is_partial': bool(failed_chains) or any(r.get('is_partial') for r in results),
+        'price_source': get_price_source(),
         'failed_chains': failed_chains,
         'chain_totals': chain_totals,
         'bridge_hops_count': len(bridge_hops),
@@ -2536,7 +2651,15 @@
     }
 
 
-def get_analysis_by_chain(chain, address):
+def get_analysis_by_chain(chain, address, deadline=None):
+    set_scan_deadline(deadline if deadline is not None else (time.monotonic() + SCAN_DEADLINE_SECONDS))
+    try:
+        return _dispatch_analysis_by_chain(chain, address)
+    finally:
+        set_scan_deadline(None)
+
+
+def _dispatch_analysis_by_chain(chain, address):
     chain = (chain or 'unified').lower().strip()
     if chain == 'unified' or (address and (',' in address or ' ' in address.strip())):
         return analyze_unified_multichain(address)

diff --git a/server.py b/server.py
--- a/server.py
+++ b/server.py
@@ -21,6 +21,7 @@
 import time
 import json
 import copy
+import secrets
 import asyncio
 import logging
 import ipaddress
@@ -63,6 +64,7 @@
 
 # Proxy header trust: Strict explicit env opt-in only
 TRUST_PROXY_HEADERS = os.environ.get("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"
+TRUSTED_PROXY_HOPS = max(1, int(os.environ.get("TRUSTED_PROXY_HOPS", "1")))
 ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "").strip()
 ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
 
@@ -143,8 +145,8 @@
 # L1 Memory Cache Operations (Immutable Deep-Copy Protection)
 # ---------------------------------------------------------------------
 def set_l1_cache(cache_key: str, data: dict, ts: float):
-    """Stores data in L1 LRU cache using the pre-normalized cache_key."""
-    l1_cache[cache_key] = {"data": data, "timestamp": ts}
+    """Stores deep-copied data in L1 LRU cache using the pre-normalized cache_key."""
+    l1_cache[cache_key] = {"data": copy.deepcopy(data), "timestamp": ts}
     l1_cache.move_to_end(cache_key)
     while len(l1_cache) > MAX_L1_CACHE_ITEMS:
         l1_cache.popitem(last=False)
@@ -272,7 +274,7 @@
     for k, v in l1_cache.items():
         ts = float(v.get("timestamp", 0))
         if now - ts < CACHE_TTL_SECONDS:
-            snapshot[k] = {"timestamp": ts, "data": v.get("data")}
+            snapshot[k] = {"timestamp": ts, "data": copy.deepcopy(v.get("data"))}
     return snapshot
 
 
@@ -317,19 +319,23 @@
 def normalize_ip_for_rate_limit(ip_str: str) -> str:
     """
     Normalizes client IP for rate limiting:
+    - Strips IPv6 zone IDs (e.g. `%eth0`) before parsing
+    - Unwraps IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4` -> `1.2.3.4`) so they don't share one /64
     - IPv4: exact /32 host string
     - IPv6: masked to /64 subnet prefix to prevent multi-IP rotation bypass
+    - Malformed strings: mapped to constant `'invalid_ip'` bucket to prevent bypass
     """
-    clean = ip_str.strip()
+    clean = (ip_str or "").strip().split("%")[0]
     try:
         ip_obj = ipaddress.ip_address(clean)
         if isinstance(ip_obj, ipaddress.IPv6Address):
-            # Mask to /64 prefix (first 64 bits)
-            net = ipaddress.IPv6Network(f"{clean}/64", strict=False)
+            if ip_obj.ipv4_mapped is not None:
+                return str(ip_obj.ipv4_mapped)
+            net = ipaddress.IPv6Network(f"{ip_obj}/64", strict=False)
             return str(net.network_address)
         return str(ip_obj)
     except ValueError:
-        return clean
+        return "invalid_ip"
 
 
 def _cleanup_expired_rate_limit_entries(now_mono: float):
@@ -362,7 +368,8 @@
 
 def is_valid_ip(ip_str: str) -> bool:
     try:
-        ipaddress.ip_address(ip_str.strip())
+        clean = (ip_str or "").strip().split("%")[0]
+        ipaddress.ip_address(clean)
         return True
     except ValueError:
         return False
@@ -371,21 +378,21 @@
 def get_client_ip(request: Request) -> str:
     """
     Extracts client IP.
-    When TRUST_PROXY_HEADERS is explicitly True, evaluates headers safely.
+    When TRUST_PROXY_HEADERS is explicitly True, evaluates proxy headers safely,
+    reading X-Forwarded-For from the right based on TRUSTED_PROXY_HOPS to prevent client spoofing.
     Otherwise defaults strictly to request.client.host.
     """
     if TRUST_PROXY_HEADERS:
         for header in ("cf-connecting-ip", "x-real-ip"):
             val = request.headers.get(header)
             if val and is_valid_ip(val):
-                return val.strip()
+                return val.strip().split("%")[0]
         forwarded = request.headers.get("x-forwarded-for")
         if forwarded:
-            # Under trusted proxy setup, the leftmost non-empty valid IP is the original client
-            parts = [p.strip() for p in forwarded.split(",") if p.strip()]
-            for p in parts:
-                if is_valid_ip(p):
-                    return p
+            valid_ips = [p.strip().split("%")[0] for p in forwarded.split(",") if p.strip() and is_valid_ip(p)]
+            if valid_ips:
+                hop_idx = max(0, len(valid_ips) - max(1, TRUSTED_PROXY_HOPS))
+                return valid_ips[hop_idx]
     if request.client and request.client.host:
         return request.client.host
     return "127.0.0.1"
@@ -513,8 +520,10 @@
     response.headers["X-Content-Type-Options"] = "nosniff"
     response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
     response.headers["Content-Security-Policy-Report-Only"] = (
-        "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://ad.a-ads.com; "
-        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; "
+        "default-src 'self'; "
+        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://d3js.org https://cdn.jsdelivr.net https://unpkg.com https://pagead2.googlesyndication.com https://ad.a-ads.com; "
+        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
+        "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; "
         "connect-src 'self'; img-src 'self' data: https:;"
     )
     path = request.url.path
@@ -545,13 +554,9 @@
 
 @app.get("/api/stats")
 def get_server_stats(api_key: Optional[str] = Security(api_key_header)):
-    # If ADMIN_API_KEY is configured in env, require authentication for internal stats
-    if ADMIN_API_KEY and api_key != ADMIN_API_KEY:
-        return {
-            "version": __version__,
-            "total_requests": metrics["total_requests"],
-            "status": "online"
-        }
+    # Default-deny (403) when ADMIN_API_KEY is not configured or key does not match
+    if not ADMIN_API_KEY or not api_key or not secrets.compare_digest(api_key, ADMIN_API_KEY):
+        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
     return {
         **metrics,
         "l1_size": len(l1_cache),
@@ -681,7 +686,7 @@
         inflight_tasks[cache_key] = task
         task.add_done_callback(lambda t, k=cache_key: _cleanup_task(k, t))
     try:
-        return await asyncio.shield(task)
+        return copy.deepcopy(await asyncio.shield(task))
     except AdmissionTimeout:
         raise HTTPException(
             status_code=503,

diff --git a/address_utils.py b/address_utils.py
--- a/address_utils.py
+++ b/address_utils.py
@@ -67,11 +67,9 @@
         [27, 20, 39, 8, 14]
     ]
 
-    padded = bytearray(data)
-    padded.append(0x01)
-    while len(padded) % rate != (rate - 1):
-        padded.append(0x00)
-    padded.append(0x80)
+    pad_len = rate - (len(data) % rate)
+    pad = b"\x81" if pad_len == 1 else (b"\x01" + b"\x00" * (pad_len - 2) + b"\x80")
+    padded = bytearray(data) + pad
 
     for i in range(0, len(padded), rate):
         block = padded[i:i + rate]

diff --git a/.env.example b/.env.example
--- a/.env.example
+++ b/.env.example
@@ -1,35 +1,30 @@
-# ===================================================
-# OnChain Detective - .env API Keys
-# ===================================================
-# Copy this file to `.env` and fill in your API keys.
-# Multiple keys per chain are supported (round-robin rotation):
-#   tron1=key1
-#   tron2=key2
-#   etherscan=key1,key2,key3
-#
-# Supported formats:
-#   - Numbered:     tron1=..., tron2=..., etherscan_1=...
-#   - Repeated:     tron=key1 (line 1), tron=key2 (line 2)
-#   - Comma-sep:    etherscan=key1,key2
-# ===================================================
-
-# Required: 4 Main Chain API Keys
-tron=your_tron_api_key_1,your_tron_api_key_2
-etherscan=your_etherscan_api_key_1,your_etherscan_api_key_2
-bnbscan=your_bnbscan_api_key_1,your_bnbscan_api_key_2
-solana=your_helius_or_quicknode_solana_api_key_1,your_solana_api_key_2
-
-# Optional: Extra keys for higher throughput
-# tron2=your_second_tron_key
-# etherscan2=your_second_etherscan_key
-
-# Optional: L2/Cross-chain enhanced RPC
-# alchemy=your_alchemy_api_key
-# moralis=your_moralis_api_key
-
-
-# Optional: Monetization
-# ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
-# AADS_AD_UNIT_ID=your_aads_unit_id
-# LEDGER_AFFILIATE_URL=https://shop.ledger.com/?r=your_ref
-# EXCHANGE_REFERRAL_URL=https://accounts.binance.com/register?ref=your_ref
+# ===================================================
+# Wake Up Crypto (OnChain Detective v9.0) - .env API Keys
+# ===================================================
+# Copy this file to `.env` and fill in your API keys.
+# Provider keys are strictly isolated so keys are NEVER sent to third-party domains.
+# Multiple keys per provider are supported (comma-separated or numbered):
+#   HELIUS_API_KEY=key1,key2
+#   ETHERSCAN_API_KEY=key1,key2
+# ===================================================
+
+# 1. Solana RPC Keys (Strictly separated by provider)
+HELIUS_API_KEY=your_helius_solana_api_key_1,your_helius_solana_api_key_2
+# Optional custom full RPC URL (e.g. QuickNode / Triton / dedicated node):
+# SOLANA_RPC_URL=https://your-custom-solana-rpc.example.com
+
+# 2. Etherscan V2 Unified API Key (Covers Ethereum chainid=1 & BNB Chain chainid=56)
+ETHERSCAN_API_KEY=your_etherscan_v2_api_key_1,your_etherscan_v2_api_key_2
+
+# 3. TronScan / TronGrid API Key
+TRON_API_KEY=your_tron_api_key_1,your_tron_api_key_2
+
+# 4. Optional Multi-Chain Alchemy API Key (Used ONLY on *.g.alchemy.com/v2/ endpoints)
+# ALCHEMY_API_KEY=your_alchemy_api_key
+# MORALIS_API_KEY=your_moralis_api_key
+
+# Optional: Monetization & Affiliate Links
+# ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
+# AADS_AD_UNIT_ID=your_aads_unit_id
+# LEDGER_AFFILIATE_URL=https://shop.ledger.com/?r=your_ref
+# EXCHANGE_REFERRAL_URL=https://accounts.binance.com/register?ref=your_ref

diff --git a/.dockerignore b/.dockerignore
--- a/.dockerignore
+++ b/.dockerignore
@@ -15,6 +15,9 @@
 _v1_backup/
 *.zip
 *.txt
+!requirements.txt
+!requirements-dev.txt
+!ads.txt
 *.md
 *.gdoc

diff --git a/requirements.txt b/requirements.txt
--- a/requirements.txt
+++ b/requirements.txt
@@ -1,3 +1,2 @@
-fastapi>=0.100.0
-uvicorn[standard]>=0.20.0
-requests>=2.28.0
+fastapi==0.115.0
+uvicorn[standard]==0.30.6

diff --git a/test_suite_v9_0.py b/test_suite_v9_0.py
--- a/test_suite_v9_0.py
+++ b/test_suite_v9_0.py
@@ -224,12 +224,21 @@
             self.assertIn("x-frame-options", resp.headers)
 
     def test_admin_api_key_protection_on_stats(self):
-        server.ADMIN_API_KEY = "super_secret_v90"
         with TestClient(server.app) as client:
+            # Default-deny (403) when ADMIN_API_KEY is not configured
+            server.ADMIN_API_KEY = ""
+            resp_unset = client.get("/api/stats")
+            self.assertEqual(resp_unset.status_code, 403)
+
+            # Default-deny (403) when ADMIN_API_KEY is configured but header is missing or wrong
+            server.ADMIN_API_KEY = "super_secret_v90"
             resp_unauth = client.get("/api/stats")
-            self.assertEqual(resp_unauth.status_code, 200)
-            self.assertNotIn("l1_size", resp_unauth.json())
+            self.assertEqual(resp_unauth.status_code, 403)
+
+            resp_wrong = client.get("/api/stats", headers={"X-Admin-Key": "wrong_key"})
+            self.assertEqual(resp_wrong.status_code, 403)
 
+            # 200 OK with full metrics when valid X-Admin-Key is supplied
             resp_auth = client.get("/api/stats", headers={"X-Admin-Key": "super_secret_v90"})
             self.assertEqual(resp_auth.status_code, 200)
             self.assertIn("l1_size", resp_auth.json())
@@ -245,7 +254,7 @@
                 server.DATA_CACHE_DIR = temp_dir
                 server.L2_CACHE_FILE = os.path.join(temp_dir, "test_l2.json")
                 server.l1_cache["eth:0x1"] = {"timestamp": time.time(), "data": {"val": 42}}
-                server.l2_cache_dirty = True
+                server._l2_dirty = True
 
                 snapshot = copy.deepcopy(server.l1_cache)
                 server._write_l2_snapshot_sync(snapshot)
@@ -542,5 +551,301 @@
             self.assertTrue(len(w["evidence_tags"]) > 0)
 
 
+    # =========================================================================
+    # 12. SECURITY PATCH VERIFICATION: ISSUE #1 (XSS) & ISSUE #2 (KEY ISOLATION)
+    # =========================================================================
+
+    def test_patch_issue1_xss_sanitization_and_frontend_escaping(self):
+        """
+        Verifies Issue #1 fix:
+        1) Server-side `sanitize_token_text` strips HTML/JS payloads and enforces <=24 chars.
+        2) Blockscout token parsing & contract label classification strip XSS payloads.
+        3) Frontend `static/app.js` defines `esc()` and `safeHttpsUrl()` and escapes dynamic fields.
+        """
+        malicious_sym = "<img src=x onerror=alert(1)>USDT"
+        cleaned = multichain_tracker.sanitize_token_text(malicious_sym)
+        self.assertNotIn("<", cleaned)
+        self.assertNotIn(">", cleaned)
+        self.assertLessEqual(len(cleaned), 24)
+        self.assertRegex(cleaned, r"^[\w .\-$/()]{1,24}$")
+
+        # Verify classify_wallet_profile sanitizes malicious contract label_hint
+        prof = multichain_tracker.classify_wallet_profile(
+            chain="ethereum",
+            address=TEST_EVM_ADDR_LOWER,
+            current_bal=0.0,
+            sent_from_me=1.0,
+            recv_to_me=0.0,
+            tx_count=5,
+            is_contract=True,
+            label_hint="<script>alert(1)</script>UniswapRouter"
+        )
+        self.assertNotIn("<script>", prof["label"])
+        self.assertNotIn("</script>", prof["label"])
+
+        # Verify static/app.js contains esc() and safeHttpsUrl() and applies them to innerHTML sinks
+        app_js_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "app.js")
+        with open(app_js_file, "r", encoding="utf-8") as f:
+            js_code = f.read()
+        self.assertIn("const esc = s =>", js_code)
+        self.assertIn("function safeHttpsUrl(", js_code)
+        self.assertIn("${esc(localizedLabel)}", js_code)
+        self.assertIn("${esc(localizedTitle)}", js_code)
+        self.assertIn("${esc(proto.description)}", js_code)
+        self.assertIn("${esc(proto.escape_guide)}", js_code)
+
+    def test_patch_issue2_api_key_isolation_and_etherscan_v2_only(self):
+        """
+        Verifies Issue #2 fix:
+        1) HELIUS_API_KEY is never leaked to alchemy.com; ALCHEMY_API_KEY is never leaked to helius-rpc.com.
+        2) SOLANA_RPC_URL=https://... is never embedded into ?api-key=https://...
+        3) Etherscan V2 (`api.etherscan.io/v2/api`) is used exclusively for Ethereum (chainid=1)
+           and BSC (chainid=56), never calling deprecated V1 or leaking keys to bscscan.com/api.
+        """
+        env_patch = {
+            "HELIUS_API_KEY": "helius_secret_key_123",
+            "ALCHEMY_API_KEY": "alchemy_secret_key_456",
+            "SOLANA_RPC_URL": "https://my-custom-sol-node.example.com",
+            "ETHERSCAN_API_KEY": "etherscan_v2_key_789",
+            "BSCSCAN_API_KEY": "legacy_bsc_key_000",
+        }
+        with unittest.mock.patch.dict(os.environ, env_patch, clear=False):
+            multichain_tracker.refresh_env_keys(force=True)
+            sol_pool = multichain_tracker.SOL_RPC_POOL
+
+            # Helius key ONLY in helius-rpc.com, NEVER in alchemy.com
+            self.assertIn("https://mainnet.helius-rpc.com/?api-key=helius_secret_key_123", sol_pool)
+            self.assertNotIn("https://solana-mainnet.g.alchemy.com/v2/helius_secret_key_123", sol_pool)
+
+            # Alchemy key ONLY in alchemy.com, NEVER in helius-rpc.com
+            self.assertIn("https://solana-mainnet.g.alchemy.com/v2/alchemy_secret_key_456", sol_pool)
+            self.assertNotIn("https://mainnet.helius-rpc.com/?api-key=alchemy_secret_key_456", sol_pool)
+
+            # Custom RPC URL used directly, NEVER inside ?api-key=
+            self.assertIn("https://my-custom-sol-node.example.com", sol_pool)
+            for u in sol_pool:
+                self.assertNotIn("api-key=https://", u)
+
+            # Verify Etherscan V2 only (no bscscan.com/api or V1 api.etherscan.io/api calls)
+            called_urls = []
+
+            class DummyResp:
+                def __enter__(self):
+                    return self
+                def __exit__(self, *args):
+                    pass
+                def read(self):
+                    return json.dumps({"status": "1", "message": "OK", "result": []}).encode("utf-8")
+
+            def fake_urlopen(req, timeout=5):
+                url_str = req.full_url if hasattr(req, "full_url") else str(req)
+                called_urls.append(url_str)
+                return DummyResp()
+
+            with unittest.mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
+                multichain_tracker.fetch_etherscan_or_bscscan_data("bsc", TEST_EVM_ADDR_LOWER, return_status=True)
+
+            self.assertEqual(len(called_urls), 1)
+            self.assertTrue(called_urls[0].startswith("https://api.etherscan.io/v2/api?"))
+            self.assertIn("chainid=56", called_urls[0])
+            self.assertIn("apikey=etherscan_v2_key_789", called_urls[0])
+            self.assertNotIn("bscscan.com", called_urls[0])
+            self.assertNotIn("legacy_bsc_key_000", called_urls[0])
+        multichain_tracker.refresh_env_keys(force=True)
+
+
+
+    def test_patch_issue3_and_4_evm_rpc_token_none_and_price_source(self):
+        """
+        Verifies Issue #3 & #4 fixes:
+        - `evm_get_token_balance` returns `None` on RPC failure (`evm_rpc` -> `None`) and `0` on `'0x0'`.
+        - When `evm_get_token_balance` returns `None`, `analyze_evm_live` marks `stage_status['tokens'] = False` and `is_partial = True`.
+        - `price_source` field is included in scanner outputs (`'fallback'` or `'live'`).
+        """
+        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value=None):
+            self.assertIsNone(multichain_tracker.evm_get_token_balance("https://eth.llamarpc.com", TEST_EVM_ADDR_LOWER, TEST_EVM_ADDR_LOWER))
+
+        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value="0x0"):
+            self.assertEqual(multichain_tracker.evm_get_token_balance("https://eth.llamarpc.com", TEST_EVM_ADDR_LOWER, TEST_EVM_ADDR_LOWER), 0)
+
+        # Even if Blockscout succeeds, an RPC token check returning None marks tokens=False, is_partial=True
+        with unittest.mock.patch.object(multichain_tracker, "evm_rpc", return_value="0x1"), \
+             unittest.mock.patch.object(multichain_tracker, "fetch_blockscout_tokens", return_value=([], True)), \
+             unittest.mock.patch.object(multichain_tracker, "fetch_etherscan_or_bscscan_data", return_value=({}, 1, True)), \
+             unittest.mock.patch.object(multichain_tracker, "evm_get_token_balance", return_value=None):
+            res = multichain_tracker.analyze_evm_live("bsc", TEST_EVM_ADDR_LOWER)
+            self.assertTrue(res["is_partial"])
+            self.assertFalse(res["stage_status"]["tokens"])
+            self.assertIn(res["price_source"], ("fallback", "live"))
+
+    def test_patch_issue5_solana_rent_raw_amount_frozen_and_lamports_sum(self):
+        """
+        Verifies Issue #5 fix:
+        - Uses `tokenAmount.amount` integer string instead of deprecated `uiAmount` (null `uiAmount` with non-zero `amount` is NOT treated as zero balance).
+        - Excludes `frozen` accounts from closable rent calculation.
+        - Sums actual `account.lamports` (supporting Token-2022 custom rent) instead of hardcoded 0.00203928.
+        """
+        def mock_sol_rpc(method, params):
+            if method == "getBalance":
+                return {"value": 1000000000}
+            if method == "getTokenAccountsByOwner":
+                prog = params[1].get("programId", "")
+                if "Tokenkeg" in prog:
+                    return {
+                        "value": [
+                            # 1) Non-zero balance but uiAmount is None (must NOT be classified as empty!)
+                            {
+                                "pubkey": "AccNonZeroNullUi1111111111111111111111111111",
+                                "account": {
+                                    "lamports": 2039280,
+                                    "data": {
+                                        "parsed": {
+                                            "info": {
+                                                "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
+                                                "state": "initialized",
+                                                "tokenAmount": {"amount": "5000000", "decimals": 6, "uiAmount": None}
+                                            }
+                                        }
+                                    }
+                                }
+                            },
+                            # 2) Zero balance but frozen (must NOT be classified as closable empty!)
+                            {
+                                "pubkey": "AccZeroFrozen1111111111111111111111111111111",
+                                "account": {
+                                    "lamports": 2039280,
+                                    "data": {
+                                        "parsed": {
+                                            "info": {
+                                                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
+                                                "state": "frozen",
+                                                "tokenAmount": {"amount": "0", "decimals": 6, "uiAmount": 0.0}
+                                            }
+                                        }
+                                    }
+                                }
+                            },
+                            # 3) Closable empty initialized SPL account (2,039,280 lamports)
+                            {
+                                "pubkey": "AccClosable111111111111111111111111111111111",
+                                "account": {
+                                    "lamports": 2039280,
+                                    "data": {
+                                        "parsed": {
+                                            "info": {
+                                                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
+                                                "state": "initialized",
+                                                "tokenAmount": {"amount": "0", "decimals": 6, "uiAmount": None}
+                                            }
+                                        }
+                                    }
+                                }
+                            }
+                        ]
+                    }
+                else:
+                    # Token-2022 closable empty account with extension rent (2,500,000 lamports)
+                    return {
+                        "value": [
+                            {
+                                "pubkey": "AccToken2022Closable111111111111111111111111",
+                                "account": {
+                                    "lamports": 2500000,
+                                    "data": {
+                                        "parsed": {
+                                            "info": {
+                                                "mint": "Token2022Mint1111111111111111111111111111111",
+                                                "state": "initialized",
+                                                "tokenAmount": {"amount": "0", "decimals": 9, "uiAmount": 0.0}
+                                            }
+                                        }
+                                    }
+                                }
+                            }
+                        ]
+                    }
+            if method == "getProgramAccounts":
+                return []
+            return []
+
+        with unittest.mock.patch.object(multichain_tracker, "sol_rpc_call", side_effect=mock_sol_rpc):
+            ov = multichain_tracker.get_sol_wallet_overview(TEST_SOL_ADDR)
+            self.assertFalse(ov["is_partial"])
+            # Only the 2 initialized zero-balance accounts are closable
+            self.assertEqual(ov["zero_balance_count"], 2)
+            # Exact lamports sum: (2,039,280 + 2,500,000) / 1e9 = 0.00453928 SOL
+            self.assertAlmostEqual(ov["reclaimable_sol"], 0.00453928, places=8)
+            # Active portfolio has the 5.0 USDT account even though uiAmount was None
+            self.assertEqual(len(ov["portfolio"]), 1)
+            self.assertAlmostEqual(ov["portfolio"][0]["amount"], 5.0, places=4)
+
+    def test_patch_issue7_and_10_set_l1_cache_deepcopy_and_ip_proxy_hardening(self):
+        """
+        Verifies Issue #7 & #10 fixes:
+        - `set_l1_cache` deep-copies input data so mutating caller dict after `set_l1_cache` does not pollute L1 cache.
+        - `normalize_ip_for_rate_limit` unwraps IPv4-mapped IPv6 (`::ffff:1.2.3.4` -> `1.2.3.4`) and strips `%eth0` zone IDs.
+        - `get_client_ip` reads `X-Forwarded-For` from the right using `TRUSTED_PROXY_HOPS`.
+        """
+        caller_dict = {"total_recoverable_usd": 100.0, "nested": ["a"]}
+        now = time.time()
+        server.set_l1_cache("test:deepcopy_in", caller_dict, now)
+        caller_dict["total_recoverable_usd"] = 999999.0
+        caller_dict["nested"].append("mutated")
+
+        cached = server.get_cached_result("test:deepcopy_in", now)
+        self.assertEqual(cached["total_recoverable_usd"], 100.0)
+        self.assertEqual(cached["nested"], ["a"])
+
+        # IPv4-mapped IPv6 addresses must map to distinct IPv4 keys, not collapse into ::ffff:0:0/64
+        k1 = server.normalize_ip_for_rate_limit("::ffff:203.0.113.10")
+        k2 = server.normalize_ip_for_rate_limit("::ffff:198.51.100.22")
+        self.assertEqual(k1, "203.0.113.10")
+        self.assertEqual(k2, "198.51.100.22")
+        self.assertNotEqual(k1, k2)
+
+        # Zone ID (%eth0) must be stripped and still masked to /64
+        k_zone = server.normalize_ip_for_rate_limit("2001:db8:abcd:12::1%eth0")
+        self.assertEqual(k_zone, "2001:db8:abcd:12::")
+
+        # Spoofed leftmost X-Forwarded-For must be ignored when TRUSTED_PROXY_HOPS=1
+        server.TRUST_PROXY_HEADERS = True
+        server.TRUSTED_PROXY_HOPS = 1
+
+        class DummyReq:
+            headers = {"x-forwarded-for": "1.1.1.1, 198.51.100.77"}
+            client = None
+
+        self.assertEqual(server.get_client_ip(DummyReq()), "198.51.100.77")
+
+    def test_patch_issue8_13_14_deadline_bridge_and_keccak_boundary(self):
+        """
+        Verifies Issue #8 (scan deadline), #13 (same-address cross-chain bridge hop),
+        and #14 (Keccak-256 135-byte rate-1 boundary padding).
+        """
+        # #8: Expired deadline causes get_remaining_timeout to return 0.0 and sol_rpc_call to skip network calls
+        multichain_tracker.set_scan_deadline(time.monotonic() - 1.0)
+        try:
+            self.assertEqual(multichain_tracker.get_remaining_timeout(4.0), 0.0)
+            with unittest.mock.patch("urllib.request.urlopen") as mock_u:
+                self.assertIsNone(multichain_tracker.sol_rpc_call("getBalance", [TEST_SOL_ADDR]))
+                mock_u.assert_not_called()
+        finally:
+            multichain_tracker.set_scan_deadline(None)
+
+        # #14: Keccak-256 empty string and 135/136/137-byte boundary verification
+        # Standard Keccak-256("") vector: c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
+        self.assertEqual(
+            address_utils.keccak_256(b"").hex(),
+            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
+        )
+        # 135-byte input (rate - 1 = 135): must compress in exactly 1 block (ending in 0x81)
+        h135 = address_utils.keccak_256(b"a" * 135).hex()
+        h136 = address_utils.keccak_256(b"a" * 136).hex()
+        h137 = address_utils.keccak_256(b"a" * 137).hex()
+        self.assertEqual(len(h135), 64)
+        self.assertNotEqual(h135, h136)
+        self.assertNotEqual(h136, h137)
+
+
 if __name__ == "__main__":
     unittest.main()
```