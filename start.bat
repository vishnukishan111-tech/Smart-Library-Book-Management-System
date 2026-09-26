@echo off
title Smart Library Book Management System
echo ====================================================
echo Starting Smart Library Book Management System
echo ====================================================
echo 1. Launching Backend Express API on port 5000...
start cmd /k "cd /d %~dp0backend && npm run dev"

echo 2. Launching Frontend Next.js Web App on port 3000...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo ====================================================
echo System launched!
echo - Web App: http://localhost:3000
echo - API Docs: http://localhost:5000/api/health
echo ====================================================
pause
