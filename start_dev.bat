@echo off
setlocal
if "%HOST_PIN%"=="" (
  echo Set HOST_PIN to a unique secret of at least 12 characters before launching.
  exit /b 1
)
start "Mario Quest Backend" cmd /k "cd /d %~dp0server && npm run dev"
start "Mario Quest Frontend" cmd /k "cd /d %~dp0client && npm run dev"
echo Development views: http://localhost:5173/play , /host , /projector
