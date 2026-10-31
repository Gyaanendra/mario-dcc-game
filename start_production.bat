@echo off
title Mario Career Quest - Production Server (Single Port 3001)
echo ========================================================
echo  MARIO CAREER QUEST: Mask On. Level Up.
echo  Dean Career Cloud (DCC) - Bennett University
echo ========================================================
echo.
echo [1/2] Building frontend static bundle...
cd /d %~dp0client
call npm run build

echo.
echo [2/2] Launching Fastify + SQLite unified production server on port 3001...
cd /d %~dp0server
start "Mario Quest Production Server (Port 3001)" cmd /k "title Mario Quest Unified Server && cd /d %~dp0server && npm start"

echo Waiting for server to boot...
ping -n 4 127.0.0.1 >nul

echo Opening views in your browser...
start http://localhost:3001/projector
start http://localhost:3001/host
start http://localhost:3001/

echo.
echo ========================================================
echo  PRODUCTION SERVER RUNNING (Only 80MB RAM required!)
echo  - Projector Screen: http://localhost:3001/projector
echo  - Host Control:     http://localhost:3001/host (PIN: DCC2026)
echo  - Player Phone:     http://localhost:3001/
echo  - Health Endpoint:  http://localhost:3001/health
echo ========================================================
echo.
pause
