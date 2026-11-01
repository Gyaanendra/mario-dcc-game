@echo off
setlocal

echo ============================================================
echo   MARIO CAREER QUEST: STARTING LOCAL DEV ENVIRONMENT
echo ============================================================

if "%HOST_PIN%"=="" (
  set "HOST_PIN=DCC2026_SECRET_PIN"
  echo [Notice] Using default HOST_PIN: DCC2026_SECRET_PIN
) else (
  echo [Notice] Using custom HOST_PIN from environment.
)

start "Mario Quest Backend (Port 3001)" cmd /k "cd /d %~dp0server && set HOST_PIN=%HOST_PIN%&& npm run dev"
start "Mario Quest Frontend (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Dev servers are booting up:
echo   - Player View:    http://localhost:5173/play
echo   - Host Dashboard: http://localhost:5173/host    (PIN: %HOST_PIN%)
echo   - Projector View: http://localhost:5173/projector
echo.
