@echo off
setlocal

echo ============================================================
echo   MARIO CAREER QUEST: STARTING PRODUCTION STANDALONE SERVER
echo ============================================================

if "%HOST_PIN%"=="" (
  set "HOST_PIN=DCC2026_SECRET_PIN"
  echo [Notice] Using default HOST_PIN: DCC2026_SECRET_PIN
) else (
  echo [Notice] Using custom HOST_PIN from environment.
)

echo [1/3] Building client production bundle...
cd /d %~dp0client
call npm run build
if errorlevel 1 (
  echo [Error] Client build failed.
  pause
  exit /b 1
)

echo [2/3] Building server TypeScript...
cd /d %~dp0server
call npm run build
if errorlevel 1 (
  echo [Error] Server build failed.
  pause
  exit /b 1
)

echo [3/3] Launching production server on port 3001...
start "Mario Quest Production Server (Port 3001)" cmd /k "cd /d %~dp0server && set HOST_PIN=%HOST_PIN%&& npm start"

echo.
echo Production server is running:
echo   - Player View:    http://localhost:3001/play
echo   - Host Dashboard: http://localhost:3001/host    (PIN: %HOST_PIN%)
echo   - Projector View: http://localhost:3001/projector
echo.
pause
