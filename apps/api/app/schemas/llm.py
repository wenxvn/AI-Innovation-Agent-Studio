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


class ProviderStatus(BaseModel):
    llm_provider: str
    llm_model: str
    llm_mode: str
    llm_configured: bool
    embedding_provider: str
    embedding_model: str
    embedding_mode: str
    embedding_configured: bool
