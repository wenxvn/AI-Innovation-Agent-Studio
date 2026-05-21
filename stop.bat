@echo off
setlocal

echo ============================================
echo Stopping AI Innovation Agent Studio
echo ============================================

cd /d "%~dp0"

echo.
echo [1/3] Stopping frontend (port 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo    Killing PID %%a
    taskkill /PID %%a /F >nul 2>nul
)
echo    Done.

echo.
echo [2/3] Stopping backend (port 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo    Killing PID %%a
    taskkill /PID %%a /F >nul 2>nul
)
echo    Done.

echo.
echo [3/3] Stopping infrastructure services...
docker compose down
echo    Done.

echo.
echo ============================================
echo All services stopped successfully!
echo ============================================
pause
