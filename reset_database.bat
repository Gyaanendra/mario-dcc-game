@echo off
if "%DATA_DIR%"=="" (
  echo Set DATA_DIR to a new, empty directory before preparing a new event.
  exit /b 1
)
if exist "%DATA_DIR%\mario_quest.db" (
  echo Refusing to replace an existing event database. Use a new DATA_DIR.
  exit /b 1
)
cd /d %~dp0server
call npm run seed
