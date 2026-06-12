from pydantic import BaseModel, Field
from typing import Optional


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class LLMResult(BaseModel):
    content: str = ""
    raw: dict = Field(default_factory=dict)
    provider: str = "unknown"
    model: str = "unknown"
    mode: str = "mock"
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: int = 0
    finish_reason: str = "stop"
    error: Optional[str] = None


class EmbeddingResult(BaseModel):
    vectors: list[list[float]] = Field(default_factory=list)
    dimension: int = 0
    provider: str = "unknown"
    model: str = "unknown"
    mode: str = "mock"
    latency_ms: int = 0
    error: Optional[str] = None


class ProviderReadiness(BaseModel):
    provider: str
    model: str
    active_provider: str
    active_model: str
    mode: str
    configured: bool
    required_env_vars: list[str] = Field(default_factory=list)
    missing_env_vars: list[str] = Field(default_factory=list)
    fallback_reason: Optional[str] = None
    supports_custom_base_url: bool = False
    base_url_custom: bool = False


class ProviderStatus(BaseModel):
    llm: ProviderReadiness
    embedding: ProviderReadiness
    llm_provider: str
    llm_model: str
    llm_mode: str
    llm_configured: bool
    embedding_provider: str
    embedding_model: str
    embedding_mode: str
    embedding_configured: bool
