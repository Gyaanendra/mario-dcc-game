@echo off
title Mario Career Quest - Launcher (Dev Mode)
echo ========================================================
echo  MARIO CAREER QUEST: Mask On. Level Up.
echo  Dean Career Cloud (DCC) - Bennett University
echo ========================================================
echo.
echo Starting Backend Server (Port 3001) and Frontend Vite Server (Port 5173)...
echo.

:: 1. Launch Backend Server in a new window
start "Mario Quest Backend (Port 3001)" cmd /k "title Mario Quest Backend && cd /d %~dp0server && npm run dev"

:: 2. Launch Frontend Vite Dev Server in a new window
start "Mario Quest Frontend (Port 5173)" cmd /k "title Mario Quest Frontend && cd /d %~dp0client && npm run dev"

echo Waiting for servers to initialize...
ping -n 5 127.0.0.1 >nul

echo.
echo Opening browser tabs...
start http://localhost:5173/projector
start http://localhost:5173/host
start http://localhost:5173/

echo.
echo ========================================================
echo  ALL SERVERS ARE RUNNING!
echo  - Projector Screen: http://localhost:5173/projector
echo  - Host Control:     http://localhost:5173/host (PIN: DCC2026)
echo  - Player Phone:     http://localhost:5173/
echo ========================================================
echo.
echo Press any key to close this launcher window (servers will keep running in their own windows).
pause >nul
