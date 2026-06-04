@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion

echo ============================================
echo   AI Innovation Agent Studio - Starting
echo ============================================
echo.

cd /d "%~dp0"

echo [1/7] Cleaning stale local services...
for %%p in (3000 8000) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
    echo   - Port %%p is occupied by PID %%a. Stopping it...
    taskkill /PID %%a /F >nul 2>nul
  )
)
echo   - Ports 3000/8000: ready

echo.
echo [2/7] Checking dependencies...

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js not found. Please install from https://nodejs.org/
  pause
  exit /b 1
)
echo   - Node.js: OK

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
  echo [INFO] Installing pnpm...
  npm install -g pnpm
  if %errorlevel% neq 0 (
    echo [ERROR] Failed to install pnpm.
    pause
    exit /b 1
  )
)
echo   - pnpm: OK

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Python not found. Please install Python 3.11+ from https://python.org/
  pause
  exit /b 1
)
echo   - Python: OK

echo.
echo [3/7] Preparing infrastructure...
set "USE_SQLITE=1"
where docker >nul 2>nul
if %errorlevel% equ 0 (
  docker info >nul 2>nul
  if !errorlevel! equ 0 (
    echo   - Docker is running. Starting PostgreSQL, Redis and MinIO...
    docker compose up -d postgres redis minio
    if !errorlevel! equ 0 (
      set "USE_SQLITE=0"
      echo   - Infrastructure: Docker services
    ) else (
      echo   - Docker compose failed. Falling back to local SQLite.
    )
  ) else (
    echo   - Docker is installed but not running. Falling back to local SQLite.
  )
) else (
  echo   - Docker not found. Falling back to local SQLite.
)

if "%USE_SQLITE%"=="1" (
  set "DATABASE_URL=sqlite:///./agent_studio.db"
  set "REDIS_URL=redis://localhost:6379/0"
  echo   - Database: apps\api\agent_studio.db
) else (
  set "DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/agent_studio"
  set "REDIS_URL=redis://localhost:6379/0"
  echo   - Database: PostgreSQL
)

echo.
echo [4/7] Installing frontend dependencies...
cd /d "%~dp0apps\web"
call pnpm install
if %errorlevel% neq 0 (
  echo [ERROR] Frontend dependency installation failed.
  pause
  exit /b 1
)

echo.
echo [5/7] Installing backend dependencies...
cd /d "%~dp0apps\api"
if not exist .venv (
  echo   - Creating Python virtual environment...
  python -m venv .venv
  if %errorlevel% neq 0 (
    echo [ERROR] Failed to create Python virtual environment.
    pause
    exit /b 1
  )
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo [ERROR] Backend dependency installation failed.
  pause
  exit /b 1
)

echo.
echo [6/7] Initializing database...
set "DATABASE_URL=%DATABASE_URL%"
set "REDIS_URL=%REDIS_URL%"
python -m app.db.init_db
if %errorlevel% neq 0 (
  echo [ERROR] Database initialization failed.
  pause
  exit /b 1
)
if "%USE_SQLITE%"=="0" (
  alembic upgrade head
  if !errorlevel! neq 0 (
    echo [WARN] Alembic migration failed. The API will still try to start with create_all fallback.
  )
)

echo.
echo [7/7] Starting services...
cd /d "%~dp0apps\api"
start "AI Studio API" cmd /k "chcp 65001 >nul && set DATABASE_URL=%DATABASE_URL%&& set REDIS_URL=%REDIS_URL%&& .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo   - Waiting for backend health...
set "API_READY=0"
for /l %%i in (1,1,20) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8000/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if !errorlevel! equ 0 (
    set "API_READY=1"
    goto api_ready
  )
  timeout /t 1 >nul
)
:api_ready
if "%API_READY%"=="1" (
  echo   - Backend: ready at http://localhost:8000
) else (
  echo   - Backend is still starting. Check the "AI Studio API" window if Dashboard cannot load.
)

cd /d "%~dp0apps\web"
start "AI Studio Web" cmd /k "chcp 65001 >nul && pnpm dev"

timeout /t 3 >nul
start http://localhost:3000/dashboard

echo.
echo ============================================
echo   Services started
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
if "%USE_SQLITE%"=="1" (
  echo   - Database:  SQLite fallback
) else (
  echo   - Database:  PostgreSQL via Docker
)
echo ============================================
echo.
pause
