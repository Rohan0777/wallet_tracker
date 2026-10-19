# Wake Up Crypto v9.0 → v9.1 최종 웹서빙 & 라즈베리파이 \+ Cloudflare Zero Trust 배포 패치

`crypto_discover` 전체 코드베이스에 대해 **웹서빙 최종 검수 개선사항 \+ 라즈베리파이(Docker) & Cloudflare Zero Trust(`cloudflared`) 연동 최적화**를 모두 반영한 버전입니다.

## 검증 상태 (완료)

- 적용 확인: `server.py`, `multichain_tracker.py`, `address_utils.py`, `static/app.js`, `static/index.html`, `setup_rpi.sh`, `.env.example`, `render.yaml`, `railway.json` 전체 반영 및 컴파일·문법 검증 통과 (`py_compile`, `node --check static/app.js`, `bash -n setup_rpi.sh`).  
- 웹서빙 & Cloudflare Zero Trust 확인:  
  - `PROXY_STRATEGY=cloudflare` 및 `PROXY_CLIENT_IP_HEADER=cf-connecting-ip`, `TRUSTED_PROXIES=127.0.0.1,::1,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16` 적용으로 라즈베리파이 Docker 브릿지(`172.16.0.0/12`) 뒤에서 `cloudflared`가 전달하는 실제 방문자 IP(`CF-Connecting-IP`)를 정확히 추출하고, 로컬 LAN 직접 접속 시에는 LAN 피어 IP로 안전하게 폴백.  
  - `/`, `/healthz`, `/ads.txt`에 `HEAD` 메서드 허용으로 Cloudflare Tunnel 헬스체크 및 외부 업타임 모니터(`UptimeRobot` 등) `200 OK` 응답 보장.  
  - `openapi_url=None` 설정으로 `/openapi.json` 스키마 노출 차단 및 `GET /` 루트 HTML에 `Cache-Control: no-cache, must-revalidate` 헤더 추가.  
  - `multichain_tracker.py` 내 모든 워커 스레드 풀(`_deadline_executor`)에 부모 스레드의 `_DEADLINE_LOCAL` 스캔 데드라인(15초) 자동 전파.  
  - 프론트엔드(`static/app.js`, `static/index.html`) 내 잔존 `'4.13 SOL'` 배지 문구 제거, 인라인 스폰서 광고 슬롯 2곳의 `partnerAdConfig.affiliate_url` 동적 연동, 단일 체인 탭에서 타 체인 주소 입력 시 자동 탭 전환(`detectInputChain`), Tailwind v3.4.17 호환 `backdrop-blur-sm` 클래스 교정 완료.  
- **테스트 통과: `test_suite_v9_1.py` 총 35개 회귀·보안·웹서빙 테스트 전원 통과 완료 (`Ran 35 tests - OK`).**

## 주요 변경 요약

| \# | 구분 | 파일 | 내용 |
| :---- | :---- | :---- | :---- |
| 1 | RPi \+ CF Tunnel | `setup_rpi.sh`, `.env.example`, `.env` | 라즈베리파이 \+ Cloudflare Zero Trust 기본 프록시 설정(`TRUST_PROXY_HEADERS=true`, `PROXY_STRATEGY=cloudflare`, `PROXY_CLIENT_IP_HEADER=cf-connecting-ip`, `TRUSTED_PROXIES` Docker 브릿지 허용) 및 SD카드 보호용 Docker 로그 로테이션(`10m` × 3\) 적용 |
| 2 | 웹서빙/보안 | `server.py` | `PROXY_STRATEGY="cloudflare"` 지원, `openapi_url=None`으로 `/openapi.json` 비공개화, `/`, `/healthz`, `/ads.txt`의 `HEAD` 요청 허용, `GET /` 및 `/healthz`에 명시적 `Cache-Control` 헤더 부여 |
| 3 | 스레드 데드라인 | `multichain_tracker.py` | `_deadline_executor()` 도입으로 내부 11개 `ThreadPoolExecutor` 자식 워커 스레드에 `_DEADLINE_LOCAL.deadline` 전파 |
| 4 | 프론트엔드 UX | `static/app.js`, `static/index.html` | 다국어 `badgeSolana`의 `'4.13 SOL'` 고정 문구를 실시간 스캔 문구로 교체, 인라인 광고 슬롯 2곳에 `partnerAdConfig.affiliate_url` 바인딩, `runSearch()` 내 주소 형식 기반 체인 자동 전환 추가, `backdrop-blur-sm` 적용 |
| 5 | 클라우드 설정 | `render.yaml`, `railway.json` | Uvicorn `--proxy-headers` 중복 제거(`server.py` 자체 `get_client_ip` 로직으로 일원화), 단일 워커(`--workers 1`) 유지 |

## 라즈베리파이 \+ Cloudflare Zero Trust 배포 절차

1. **라즈베리파이에서 컨테이너 빌드 및 실행**:  
     
   chmod \+x setup\_rpi.sh  
     
   ./setup\_rpi.sh  
     
2. **Cloudflare Zero Trust 대시보드 설정**:  
   - **Networks → Tunnels**에서 라즈베리파이 `cloudflared` 터널 선택 → **Public Hostname** 추가  
   - **Service Type**: `HTTP`  
   - **URL**: `localhost:8088` (동일 호스트에서 `cloudflared` 데몬 실행 시)  
3. **동작 확인**:  
     
   curl \-I http\://localhost:8088/healthz