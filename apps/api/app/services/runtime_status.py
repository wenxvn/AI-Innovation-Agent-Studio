from urllib.parse import urlsplit

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.llm import get_provider_status
from app.services.storage import get_storage_service


def _status(ok: bool, online: str, offline: str, message: str) -> dict:
    return {
        "ok": ok,
        "status": online if ok else offline,
        "message": message,
    }


def _url_hint(url: str) -> str:
    if not url:
        return "not configured"

    parsed = urlsplit(url)
    if not parsed.scheme:
        return "configured"
    if parsed.scheme.startswith("sqlite"):
        return parsed.scheme

    host = parsed.hostname or "localhost"
    port = f":{parsed.port}" if parsed.port else ""
    path = parsed.path or ""
    return f"{parsed.scheme}://{host}{port}{path}"


def check_database() -> dict:
    settings = get_settings()
    db = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        return {
            **_status(True, "connected", "disconnected", "Database responded to SELECT 1."),
            "url": _url_hint(settings.DATABASE_URL),
        }
    except Exception:
        return {
            **_status(False, "connected", "disconnected", "Database connection failed."),
            "url": _url_hint(settings.DATABASE_URL),
        }
    finally:
        if db is not None:
            db.close()


def check_redis() -> dict:
    settings = get_settings()
    try:
        import redis

        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        try:
            client.ping()
        finally:
            client.close()
        return {
            **_status(True, "connected", "disconnected", "Redis responded to PING."),
            "url": _url_hint(settings.REDIS_URL),
        }
    except Exception:
        return {
            **_status(False, "connected", "disconnected", "Redis is optional for sync local development or is not reachable."),
            "url": _url_hint(settings.REDIS_URL),
        }


def check_storage() -> dict:
    settings = get_settings()
    try:
        info = get_storage_service().get_storage_info()
        available = bool(info.get("available", True))
        return {
            **_status(available, "available", "unavailable", "Storage backend is available." if available else "Storage backend is unavailable."),
            "backend": info.get("backend", settings.STORAGE_BACKEND),
            "upload_dir": info.get("upload_dir", settings.UPLOAD_DIR),
        }
    except Exception:
        return {
            **_status(False, "available", "unavailable", "Storage service could not be initialized."),
            "backend": settings.STORAGE_BACKEND,
            "upload_dir": settings.UPLOAD_DIR,
        }


def build_runtime_diagnostics(api_version: str) -> dict:
    settings = get_settings()
    database = check_database()
    redis = check_redis()
    storage = check_storage()
    provider_status = get_provider_status()
    status = "ok" if database["ok"] and storage["ok"] else "degraded"

    return {
        "status": status,
        "api": {
            "ok": True,
            "status": "online",
            "version": api_version,
            "environment": settings.APP_ENV,
            "host": settings.API_HOST,
            "port": settings.API_PORT,
            "message": "API process is responding.",
        },
        "database": database,
        "redis": redis,
        "storage": storage,
        "provider": provider_status.model_dump(),
        "llm": provider_status.llm.model_dump(),
        "embedding": provider_status.embedding.model_dump(),
        "cors": {
            "origins": settings.cors_origins,
            "allow_credentials": True,
        },
    }
