import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.api.v1.router import router as v1_router
from app.db.init_db import init_db
from app.db.session import engine

settings = get_settings()
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Innovation Agent Studio API v0.3.0")
    init_db()
    logger.info("Database initialized")
    yield
    engine.dispose()
    logger.info("Shutting down AI Innovation Agent Studio API")


app = FastAPI(
    title="AI Innovation Agent Studio API",
    description="智创工坊后端 API",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = request.url.path

    if path == "/health" or path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    logger.info("Request started: %s %s", method, path)

    try:
        response = await call_next(request)
    except Exception as e:
        logger.error("Request failed: %s %s - %s", method, path, str(e))
        raise

    duration_ms = int((time.time() - start_time) * 1000)
    logger.info(
        "Request completed: %s %s - %d (%dms)",
        method, path, response.status_code, duration_ms,
    )

    return response


app.include_router(v1_router)


@app.get("/")
async def root():
    return {"message": "AI Innovation Agent Studio API", "version": "0.3.0"}


@app.get("/health")
async def health():
    db_ok = False
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db_ok = True
        db.close()
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "version": "0.3.0",
    }
