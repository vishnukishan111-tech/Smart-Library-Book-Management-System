Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Starting Smart Library Book Management System     " -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "Launching Backend API (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; node src/server.js"

Write-Host "Launching Frontend Next.js UI (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "System initialized!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
