@echo off
title Mario Career Quest - Database Reset & Seed
echo ========================================================
echo  RE-SEEDING DATABASE (37 Event Questions + Tiebreakers)
echo ========================================================
echo.
cd /d %~dp0server
call npm run seed
call npx tsx -e "import('./src/db.js').then(m => { m.dbManager.resetGame(); m.dbManager['db'].exec('DELETE FROM players;'); console.log('Database cleanly reset with 0 players.'); })"
echo.
echo Database is fresh and ready for the event!
pause

