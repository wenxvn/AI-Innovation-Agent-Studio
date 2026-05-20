@echo off
setlocal

echo ============================================
echo Starting AI Innovation Agent Studio
echo ============================================

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js 18+ from https://nodejs.org/
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
  echo [INFO] pnpm is not installed. Installing pnpm...
  npm install -g pnpm
)

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [WARNING] Python is not installed. Backend will not start.
  echo Please install Python 3.11+ from https://python.org/
  set SKIP_BACKEND=1
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
  echo [WARNING] Docker is not installed. Infrastructure services will not start.
  echo Please install Docker Desktop from https://docker.com/
  set SKIP_DOCKER=1
)

if not defined SKIP_DOCKER (
  docker info >nul 2>nul
  if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running. Infrastructure services will not start.
    echo Please start Docker Desktop first.
    set SKIP_DOCKER=1
  )
)

if not defined SKIP_DOCKER (
  echo.
  echo [1/5] Starting infrastructure services...
  docker compose up -d postgres redis minio
  echo [INFO] Waiting for services to be ready...
  timeout /t 5 >nul
)

echo.
echo [2/5] Installing frontend dependencies...
cd apps\web
if not exist node_modules (
  call pnpm install
) else (
  echo [INFO] Frontend dependencies already installed.
)

echo.
echo [3/5] Starting frontend...
start "AI Agent Studio Web" cmd /k "cd /d %~dp0apps\web && pnpm dev"

if not defined SKIP_BACKEND (
  echo.
  echo [4/5] Installing backend dependencies...
  cd /d "%~dp0apps\api"
  if not exist .venv (
    python -m venv .venv
  )
  call .venv\Scripts\activate
  pip install -r requirements.txt -q

  echo.
  echo [5/5] Starting backend...
  start "AI Agent Studio API" cmd /k "cd /d %~dp0apps\api && .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
) else (
  echo.
  echo [4/5] Skipping backend (Python not available)
  echo [5/5] Skipping backend (Python not available)
)

echo.
echo ============================================
echo AI Innovation Agent Studio is starting...
echo.
echo Frontend:  http://localhost:3000
if not defined SKIP_BACKEND (
  echo Backend:   http://localhost:8000
  echo API Docs:  http://localhost:8000/docs
)
echo.
echo Press any key to open the browser...
pause >nul
start http://localhost:3000
