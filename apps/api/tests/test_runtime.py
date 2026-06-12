from app.core.config import Settings, parse_cors_origins
from app.services import llm as llm_service
from app.services.providers.mock_provider import MockEmbeddingProvider, MockLLMProvider
from app.services.providers.openai_provider import OpenAIEmbeddingProvider, OpenAILLMProvider


def make_settings(**overrides) -> Settings:
    values = {
        "LLM_PROVIDER": "openai",
        "LLM_MODEL": "gpt-4.1",
        "LLM_BASE_URL": "",
        "EMBEDDING_PROVIDER": "openai",
        "EMBEDDING_MODEL": "text-embedding-3-small",
        "EMBEDDING_BASE_URL": "",
        "OPENAI_API_KEY": "",
        "DEEPSEEK_API_KEY": "",
        "ANTHROPIC_API_KEY": "",
        "EMBEDDING_DIMENSION": 1536,
    }
    values.update(overrides)
    return Settings(**values)


def use_settings(monkeypatch, settings: Settings) -> None:
    monkeypatch.setattr(llm_service, "get_settings", lambda: settings)


def test_cors_origins_parse_common_local_formats():
    assert parse_cors_origins("http://localhost:3000,http://localhost:3001 http://127.0.0.1:5173") == [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
    ]
    assert parse_cors_origins('["http://localhost:3000", "http://localhost:3002"]') == [
        "http://localhost:3000",
        "http://localhost:3002",
    ]
    assert Settings(CORS_ORIGINS="http://localhost:3000, http://localhost:3000").cors_origins == [
        "http://localhost:3000",
    ]


def test_provider_status_uses_mock_fallback_without_required_key(monkeypatch):
    use_settings(monkeypatch, make_settings())

    status = llm_service.get_provider_status()

    assert status.llm.mode == "mock"
    assert status.llm.configured is False
    assert status.llm.provider == "openai"
    assert status.llm.active_provider == "mock"
    assert status.llm.active_model == "mock-idea2mvp-v1"
    assert status.llm.required_env_vars == ["OPENAI_API_KEY"]
    assert status.llm.missing_env_vars == ["OPENAI_API_KEY"]
    assert "OPENAI_API_KEY" in status.llm.fallback_reason

    assert status.embedding.mode == "mock"
    assert status.embedding.configured is False
    assert status.embedding.active_provider == "mock"
    assert status.embedding.missing_env_vars == ["OPENAI_API_KEY"]

    assert isinstance(llm_service.get_llm_provider(), MockLLMProvider)
    assert isinstance(llm_service.get_embedding_provider(), MockEmbeddingProvider)


def test_provider_status_is_configured_with_required_key(monkeypatch):
    custom_base_url = "http://localhost:11434/v1"
    use_settings(
        monkeypatch,
        make_settings(
            OPENAI_API_KEY="test-openai-key",
            LLM_BASE_URL=custom_base_url,
            EMBEDDING_BASE_URL=custom_base_url,
        ),
    )

    status = llm_service.get_provider_status()

    assert status.llm.mode == "real"
    assert status.llm.configured is True
    assert status.llm.active_provider == "openai"
    assert status.llm.active_model == "gpt-4.1"
    assert status.llm.missing_env_vars == []
    assert status.llm.fallback_reason is None
    assert status.llm.base_url_custom is True

    assert status.embedding.mode == "real"
    assert status.embedding.configured is True
    assert status.embedding.active_provider == "openai"
    assert status.embedding.missing_env_vars == []
    assert status.embedding.base_url_custom is True

    llm_provider = llm_service.get_llm_provider()
    embedding_provider = llm_service.get_embedding_provider()
    assert isinstance(llm_provider, OpenAILLMProvider)
    assert llm_provider.base_url == custom_base_url
    assert isinstance(embedding_provider, OpenAIEmbeddingProvider)
    assert embedding_provider.base_url == custom_base_url


def test_runtime_status_api_returns_readiness_details(client, monkeypatch):
    use_settings(monkeypatch, make_settings())

    response = client.get("/api/v1/runtime/status")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["status"] in {"ok", "degraded"}
    assert payload["api"]["status"] == "online"
    assert payload["api"]["version"]
    assert payload["database"]["status"] in {"connected", "disconnected"}
    assert isinstance(payload["database"]["ok"], bool)
    assert payload["redis"]["status"] in {"connected", "disconnected"}
    assert "url" in payload["redis"]
    assert payload["storage"]["status"] in {"available", "unavailable"}
    assert payload["storage"]["backend"]
    assert "origins" in payload["cors"]
    assert payload["provider"]["llm"]["mode"] == "mock"
    assert payload["llm"]["mode"] == "mock"
    assert payload["llm"]["configured"] is False
    assert payload["llm"]["active_provider"] == "mock"
    assert payload["llm"]["required_env_vars"] == ["OPENAI_API_KEY"]
    assert payload["llm"]["missing_env_vars"] == ["OPENAI_API_KEY"]
    assert payload["llm"]["base_url_custom"] is False
    assert payload["embedding"]["missing_env_vars"] == ["OPENAI_API_KEY"]
