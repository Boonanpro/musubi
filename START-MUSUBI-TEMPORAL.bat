@echo off
echo ============================================
echo 🚀 Starting Musubi with Temporal
echo ============================================
echo.
echo [1/3] Starting Temporal Server...
start "Temporal Server" cmd /k "cd /d D:\musubi && docker-compose -f docker-compose.temporal.yml up"
timeout /t 10 /nobreak >nul
echo.
echo [2/3] Starting Temporal Worker...
start "Temporal Worker" cmd /k "cd /d D:\musubi && npm run worker"
timeout /t 5 /nobreak >nul
echo.
echo [3/3] Starting Musubi API Server...
start "Musubi API" cmd /k "cd /d D:\musubi && npm run api"
timeout /t 3 /nobreak >nul
echo.
echo [4/4] Starting Musubi GUI...
start "Musubi GUI" cmd /k "cd /d D:\musubi\musubi-gui && npm run dev"
echo.
echo ============================================
echo ✅ All services started!
echo ============================================
echo.
echo 🌐 Temporal UI:  http://localhost:8080
echo 🌐 Musubi API:   http://localhost:3002
echo 🌐 Musubi GUI:   http://localhost:3001
echo.
echo Press any key to open Temporal UI...
pause >nul
start http://localhost:8080


