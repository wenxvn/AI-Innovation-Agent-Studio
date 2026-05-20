@echo off
setlocal

echo ============================================
echo Stopping AI Innovation Agent Studio
echo ============================================

cd /d "%~dp0"

echo.
echo Stopping infrastructure services...
docker compose down

echo.
echo Done! All services stopped.
pause
