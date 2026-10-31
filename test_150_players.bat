@echo off
title Mario Career Quest - 150 Player Stress Test
echo ========================================================
echo  MARIO CAREER QUEST: 150-PLAYER LOAD AND BENCHMARK TEST
echo ========================================================
echo.

:: Check if server is running on port 3001
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Server is not currently running on port 3001.
    echo Starting Mario Quest Server automatically in a new window...
    start "Mario Quest Server (Port 3001)" cmd /k "cd /d %~dp0server && npm start"
    echo Waiting for server to initialize...
    ping -n 5 127.0.0.1 >nul
)

echo Running stress simulation with 150 concurrent WebSocket bots...
echo.
cd /d %~dp0server
call npx tsx src/loadTest.ts
echo.
echo Benchmark complete.
pause
