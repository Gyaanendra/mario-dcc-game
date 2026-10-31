@echo off
if "%HOST_PIN%"=="" (
  echo Set HOST_PIN to the isolated test server secret.
  exit /b 1
)
if "%TEST_HTTP_URL%"=="" set TEST_HTTP_URL=http://localhost:3002
cd /d %~dp0server
call npm run test:load
