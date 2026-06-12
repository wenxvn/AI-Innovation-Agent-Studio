import json
import re
from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_CORS_ORIGINS = ",".join(
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)


def parse_cors_origins(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        raw_value = value.strip()
        if not raw_value:
            return []

        if raw_value.startswith("["):
            try:
                parsed = json.loads(raw_value)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                values = parsed
            else:
                values = re.split(r"[\s,]+", raw_value)
        else:
            values = re.split(r"[\s,]+", raw_value)
    elif isinstance(value, (list, tuple, set)):
        values = list(value)
    else:
        values = [value]

    origins: list[str] = []
    seen: set[str] = set()
    for item in values:
        origin = str(item).strip().strip('"').strip("'")
        if not origin or origin in seen:
            continue
        origins.append(origin)
        seen.add(origin)
    return origins


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = DEFAULT_CORS_ORIGINS

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/agent_studio"
    REDIS_URL: str = "redis://localhost:6379/0"

    STORAGE_BACKEND: str = "local"
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "agent-studio"

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_BASE_URL: str = ""
    EMBEDDING_DIMENSION: int = 1536
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4.1"
    LLM_BASE_URL: str = ""
    LLM_TIMEOUT_SECONDS: int = 60
    LLM_MAX_RETRIES: int = 2
    AGENT_RUN_MODE: str = "sync"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_UPLOAD_EXTENSIONS: str = ".txt,.md,.pdf"

    SKILL_REGISTRY_PATH: str = "skills"
    TOOL_REGISTRY_PATH: str = "apps/api/app/tools/registry.yaml"

    @property
    def cors_origins(self) -> list[str]:
        return parse_cors_origins(self.CORS_ORIGINS)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
