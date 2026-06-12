from app.core.config import get_settings
from app.schemas.llm import ProviderReadiness, ProviderStatus
from app.services.providers.mock_provider import MockLLMProvider, MockEmbeddingProvider
from app.services.providers.openai_provider import OpenAILLMProvider, OpenAIEmbeddingProvider
from app.services.providers.deepseek_provider import DeepSeekLLMProvider
from app.services.providers.anthropic_provider import AnthropicLLMProvider

LLM_REQUIRED_ENV_VARS = {
    "openai": ["OPENAI_API_KEY"],
    "deepseek": ["DEEPSEEK_API_KEY"],
    "anthropic": ["ANTHROPIC_API_KEY"],
}

EMBEDDING_REQUIRED_ENV_VARS = {
    "openai": ["OPENAI_API_KEY"],
    "deepseek": ["DEEPSEEK_API_KEY"],
}

LLM_CUSTOM_BASE_URL_PROVIDERS = {"openai", "deepseek", "anthropic"}
EMBEDDING_CUSTOM_BASE_URL_PROVIDERS = {"openai", "deepseek"}


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _missing_env_vars(settings, env_vars: list[str]) -> list[str]:
    return [name for name in env_vars if not _clean(getattr(settings, name, ""))]


def _llm_model(settings, provider: str) -> str:
    if provider == "mock":
        return "mock-idea2mvp-v1"
    if provider == "deepseek":
        return _clean(settings.LLM_MODEL) or "deepseek-chat"
    if provider == "anthropic":
        return _clean(settings.LLM_MODEL) or "claude-sonnet-4-20250514"
    return _clean(settings.LLM_MODEL) or "gpt-4.1"


def _embedding_model(settings, provider: str) -> str:
    if provider == "mock":
        return "mock-embedding-v1"
    return _clean(settings.EMBEDDING_MODEL) or "text-embedding-3-small"


def _build_llm_status(settings) -> ProviderReadiness:
    provider = (_clean(settings.LLM_PROVIDER) or "mock").lower()
    model = _llm_model(settings, provider)
    required_env_vars = LLM_REQUIRED_ENV_VARS.get(provider, [])
    missing_env_vars = _missing_env_vars(settings, required_env_vars)
    supports_custom_base_url = provider in LLM_CUSTOM_BASE_URL_PROVIDERS
    base_url_custom = supports_custom_base_url and bool(_clean(settings.LLM_BASE_URL))

    if provider == "mock":
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-idea2mvp-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason="LLM_PROVIDER is set to mock; real LLM calls are disabled.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    if provider not in LLM_REQUIRED_ENV_VARS:
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-idea2mvp-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason=f"Unsupported LLM provider '{provider}'; using mock fallback.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    if missing_env_vars:
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-idea2mvp-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason=f"Missing {', '.join(missing_env_vars)}; using mock LLM fallback.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    return ProviderReadiness(
        provider=provider,
        model=model,
        active_provider=provider,
        active_model=model,
        mode="real",
        configured=True,
        required_env_vars=required_env_vars,
        missing_env_vars=[],
        fallback_reason=None,
        supports_custom_base_url=supports_custom_base_url,
        base_url_custom=base_url_custom,
    )


def _build_embedding_status(settings) -> ProviderReadiness:
    provider = (_clean(settings.EMBEDDING_PROVIDER) or "mock").lower()
    model = _embedding_model(settings, provider)
    required_env_vars = EMBEDDING_REQUIRED_ENV_VARS.get(provider, [])
    missing_env_vars = _missing_env_vars(settings, required_env_vars)
    supports_custom_base_url = provider in EMBEDDING_CUSTOM_BASE_URL_PROVIDERS
    base_url_custom = supports_custom_base_url and bool(_clean(settings.EMBEDDING_BASE_URL))

    if provider == "mock":
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-embedding-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason="EMBEDDING_PROVIDER is set to mock; real embedding calls are disabled.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    if provider not in EMBEDDING_REQUIRED_ENV_VARS:
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-embedding-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason=f"Unsupported embedding provider '{provider}'; using mock fallback.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    if missing_env_vars:
        return ProviderReadiness(
            provider=provider,
            model=model,
            active_provider="mock",
            active_model="mock-embedding-v1",
            mode="mock",
            configured=False,
            required_env_vars=required_env_vars,
            missing_env_vars=missing_env_vars,
            fallback_reason=f"Missing {', '.join(missing_env_vars)}; using mock embedding fallback.",
            supports_custom_base_url=supports_custom_base_url,
            base_url_custom=base_url_custom,
        )

    return ProviderReadiness(
        provider=provider,
        model=model,
        active_provider=provider,
        active_model=model,
        mode="real",
        configured=True,
        required_env_vars=required_env_vars,
        missing_env_vars=[],
        fallback_reason=None,
        supports_custom_base_url=supports_custom_base_url,
        base_url_custom=base_url_custom,
    )


def get_llm_provider():
    settings = get_settings()
    provider = (_clean(settings.LLM_PROVIDER) or "mock").lower()
    api_key = ""

    if provider == "openai":
        api_key = _clean(settings.OPENAI_API_KEY)
        if not api_key:
            return MockLLMProvider()
        return OpenAILLMProvider(
            api_key=api_key,
            model=_llm_model(settings, provider),
            base_url=_clean(settings.LLM_BASE_URL) or None,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    elif provider == "deepseek":
        api_key = _clean(settings.DEEPSEEK_API_KEY)
        if not api_key:
            return MockLLMProvider()
        return DeepSeekLLMProvider(
            api_key=api_key,
            model=_llm_model(settings, provider),
            base_url=_clean(settings.LLM_BASE_URL) or "https://api.deepseek.com/v1",
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    elif provider == "anthropic":
        api_key = _clean(settings.ANTHROPIC_API_KEY)
        if not api_key:
            return MockLLMProvider()
        return AnthropicLLMProvider(
            api_key=api_key,
            model=_llm_model(settings, provider),
            base_url=_clean(settings.LLM_BASE_URL) or "https://api.anthropic.com/v1",
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    else:
        return MockLLMProvider()


def get_embedding_provider():
    settings = get_settings()
    provider = (_clean(settings.EMBEDDING_PROVIDER) or "mock").lower()

    if provider in ("openai", "deepseek"):
        api_key = _clean(settings.OPENAI_API_KEY if provider == "openai" else settings.DEEPSEEK_API_KEY)
        if not api_key:
            return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
        base_url = _clean(settings.EMBEDDING_BASE_URL) or (None if provider == "openai" else "https://api.deepseek.com/v1")
        return OpenAIEmbeddingProvider(
            api_key=api_key,
            model=_embedding_model(settings, provider),
            base_url=base_url,
            dimension=settings.EMBEDDING_DIMENSION,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
    else:
        return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)


def get_provider_status() -> ProviderStatus:
    settings = get_settings()
    llm = _build_llm_status(settings)
    embedding = _build_embedding_status(settings)

    return ProviderStatus(
        llm=llm,
        embedding=embedding,
        llm_provider=llm.provider,
        llm_model=llm.model,
        llm_mode=llm.mode,
        llm_configured=llm.configured,
        embedding_provider=embedding.provider,
        embedding_model=embedding.model,
        embedding_mode=embedding.mode,
        embedding_configured=embedding.configured,
    )
