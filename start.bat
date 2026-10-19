@echo off
cd /d "%~dp0"
title Crypto Discover Server
chcp 65001 > nul
echo ========================================================
echo   🕵️ 크립토 초보 자산 복구 & 내 지갑 판별기 (Mobile Web)
echo ========================================================
echo.
echo [1/2] 로컬 서버 구동 중 (http://localhost:8088)...
start "" http://localhost:8088
python server.py
pause

