@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   MARIO CAREER QUEST: 150-PLAYER STRESS TEST
echo ========================================================

if "%HOST_PIN%"=="" (
  set "HOST_PIN=DCC2026_SECRET_PIN"
  echo [Config] Using default test HOST_PIN: DCC2026_SECRET_PIN
)

if "%PORT%"=="" (
  set "PORT=3002"
)
if "%TEST_HTTP_URL%"=="" (
  set "TEST_HTTP_URL=http://localhost:%PORT%"
)
if "%TEST_WS_URL%"=="" (
  set "TEST_WS_URL=ws://localhost:%PORT%/ws"
)
set "TEST_MODE=1"
set "DATA_DIR=%TEMP%\mario_load_test_%RANDOM%"

cd /d %~dp0server

if not exist "dist\index.js" (
  echo [Build] Compiling server TypeScript...
  call npm run build
)

echo [1/4] Preparing isolated test database in: %DATA_DIR%
call npx tsx src/seed.ts
if errorlevel 1 (
  echo [Error] Failed to seed isolated test database.
  pause
  exit /b 1
)

echo [2/4] Starting isolated test server on port %PORT%...
start "Mario Load Test Server" /b node dist/index.js
ping 127.0.0.1 -n 4 >nul

echo [3/4] Launching 150 concurrent simulated players...
call npx tsx src/loadTest.ts
set TEST_STATUS=%ERRORLEVEL%

echo [4/4] Cleaning up test server and temp directory...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
rd /s /q "%DATA_DIR%" >nul 2>&1

echo.
if %TEST_STATUS% equ 0 (
  echo ========================================================
  echo   SUCCESS: 150-PLAYER LOAD BENCHMARK PASSED!
  echo ========================================================
) else (
  echo ========================================================
  echo   FAILED: Load test did not pass.
  echo ========================================================
)
echo.
pause
