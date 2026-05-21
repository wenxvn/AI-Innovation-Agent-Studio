from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/agent_studio"
    REDIS_URL: str = "redis://localhost:6379/0"

    S3_ENDPOINT: str = "http://localhost:9000"
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

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
