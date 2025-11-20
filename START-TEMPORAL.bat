@echo off
echo ============================================
echo 🚀 Starting Temporal Server + UI
echo ============================================
echo.
echo Temporal Server: http://localhost:7233
echo Temporal UI:     http://localhost:8080
echo.
docker-compose -f docker-compose.temporal.yml up -d
echo.
echo ✅ Temporal is running!
echo.
pause


