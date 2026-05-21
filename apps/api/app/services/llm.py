from app.core.config import get_settings
from app.schemas.llm import LLMResult, EmbeddingResult, ProviderStatus
from app.services.providers.mock_provider import MockLLMProvider, MockEmbeddingProvider
from app.services.providers.openai_provider import OpenAILLMProvider, OpenAIEmbeddingProvider
from app.services.providers.deepseek_provider import DeepSeekLLMProvider
from app.services.providers.anthropic_provider import AnthropicLLMProvider

settings = get_settings()


def get_llm_provider():
    provider = (settings.LLM_PROVIDER or "mock").lower()
    api_key = ""

    if provider == "openai":
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return MockLLMProvider()
        return OpenAILLMProvider(
            api_key=api_key,
            model=settings.LLM_MODEL,
            base_url=settings.LLM_BASE_URL or None,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    elif provider == "deepseek":
        api_key = settings.DEEPSEEK_API_KEY
        if not api_key:
            return MockLLMProvider()
        return DeepSeekLLMProvider(
            api_key=api_key,
            model=settings.LLM_MODEL or "deepseek-chat",
            base_url=settings.LLM_BASE_URL or "https://api.deepseek.com/v1",
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    elif provider == "anthropic":
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return MockLLMProvider()
        return AnthropicLLMProvider(
            api_key=api_key,
            model=settings.LLM_MODEL or "claude-sonnet-4-20250514",
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    else:
        return MockLLMProvider()


def get_embedding_provider():
    provider = (settings.EMBEDDING_PROVIDER or "mock").lower()

    if provider in ("openai", "deepseek"):
        api_key = settings.OPENAI_API_KEY if provider == "openai" else settings.DEEPSEEK_API_KEY
        if not api_key:
            return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
        base_url = settings.EMBEDDING_BASE_URL or (None if provider == "openai" else "https://api.deepseek.com/v1")
        return OpenAIEmbeddingProvider(
            api_key=api_key,
            model=settings.EMBEDDING_MODEL,
            base_url=base_url,
            dimension=settings.EMBEDDING_DIMENSION,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    else:
        return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)


def get_provider_status() -> ProviderStatus:
    llm = get_llm_provider()
    emb = get_embedding_provider()

    llm_mode = "mock" if isinstance(llm, MockLLMProvider) else "real"
    emb_mode = "mock" if isinstance(emb, MockEmbeddingProvider) else "real"

    return ProviderStatus(
        llm_provider=settings.LLM_PROVIDER or "mock",
        llm_model=settings.LLM_MODEL or "mock-idea2mvp-v1",
        llm_mode=llm_mode,
        llm_configured=llm_mode == "real",
        embedding_provider=settings.EMBEDDING_PROVIDER or "mock",
        embedding_model=settings.EMBEDDING_MODEL or "mock-embedding-v1",
        embedding_mode=emb_mode,
        embedding_configured=emb_mode == "real",
    )
