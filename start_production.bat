@echo off
setlocal
if "%HOST_PIN%"=="" (
  echo Set HOST_PIN to a unique secret of at least 12 characters before launching.
  exit /b 1
)
cd /d %~dp0client
call npm run build
if errorlevel 1 exit /b 1
cd /d %~dp0server
call npm run build
if errorlevel 1 exit /b 1
start "Mario Quest Production Server" cmd /k "cd /d %~dp0server && npm start"
echo Production views: http://localhost:3001/play , /host , /projector
