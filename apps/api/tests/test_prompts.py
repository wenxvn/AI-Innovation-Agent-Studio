from app.schemas.prompt import PromptTemplateUpdate
from app.services import prompts as prompt_service


def test_sync_default_prompt_templates_seeds_active_defaults(db):
    templates = prompt_service.sync_default_prompt_templates(db)

    names = {template.name for template in templates}
    assert {
        prompt_service.SYSTEM_PROMPT_NAME,
        prompt_service.AGENT_RUN_PROMPT_NAME,
        prompt_service.EVAL_JUDGE_PROMPT_NAME,
    }.issubset(names)

    agent_template = prompt_service.get_prompt_template(db, prompt_service.AGENT_RUN_PROMPT_NAME)
    assert agent_template is not None
    assert agent_template.is_active is True
    assert agent_template.source == "default"
    assert "user_input" in agent_template.variables
    assert agent_template.metadata_["constant_name"] == "AGENT_RUN_PROMPT"


def test_user_update_creates_version_and_sync_does_not_override_active_user_version(db, monkeypatch):
    prompt_service.sync_default_prompt_templates(db)

    updated = prompt_service.update_prompt_template(
        db,
        prompt_service.AGENT_RUN_PROMPT_NAME,
        PromptTemplateUpdate(
            title="Custom agent prompt",
            content="Custom prompt for {user_input}",
            metadata={"edited_by": "test"},
        ),
    )

    assert updated is not None
    assert updated.version == 2
    assert updated.is_active is True
    assert updated.source == "api"
    assert updated.metadata_["edited_by"] == "test"

    monkeypatch.setattr(
        prompt_service,
        "_default_prompt_items",
        lambda: [
            {
                "name": prompt_service.AGENT_RUN_PROMPT_NAME,
                "constant_name": "AGENT_RUN_PROMPT",
                "title": "Default changed",
                "description": "Changed on disk",
                "category": "agent",
                "content": "New default disk prompt {user_input}",
            }
        ],
    )

    prompt_service.sync_default_prompt_templates(db)
    active = prompt_service.get_prompt_template(db, prompt_service.AGENT_RUN_PROMPT_NAME)
    versions = prompt_service.list_prompt_versions(db, prompt_service.AGENT_RUN_PROMPT_NAME)

    assert active is not None
    assert active.version == 2
    assert active.content == "Custom prompt for {user_input}"
    assert any(version.source == "default" and not version.is_active for version in versions)


def test_prompt_api_supports_reload_update_versions_activate_and_create(client):
    reload_response = client.post("/api/v1/prompts/reload")
    assert reload_response.status_code == 200
    assert reload_response.json()["total"] >= 3

    name = prompt_service.SYSTEM_PROMPT_NAME
    get_response = client.get(f"/api/v1/prompts/{name}")
    assert get_response.status_code == 200
    original = get_response.json()["data"]
    assert original["is_active"] is True
    assert original["metadata"]["constant_name"] == "SYSTEM_PROMPT"

    update_response = client.patch(
        f"/api/v1/prompts/{name}",
        json={
            "title": "Custom system prompt",
            "content": "You are a custom system prompt.",
            "metadata": {"reviewed_by": "qa"},
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()["data"]
    assert updated["version"] == original["version"] + 1
    assert updated["is_active"] is True
    assert updated["metadata"]["reviewed_by"] == "qa"

    versions_response = client.get(f"/api/v1/prompts/{name}/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()["data"]
    assert len(versions) == 2
    assert versions[0]["version"] == updated["version"]

    activate_response = client.post(f"/api/v1/prompts/{name}/versions/{original['version']}/activate")
    assert activate_response.status_code == 200
    assert activate_response.json()["data"]["version"] == original["version"]

    create_response = client.post(
        "/api/v1/prompts",
        json={
            "name": "custom.idea_prompt",
            "title": "Idea prompt",
            "description": "A custom prompt",
            "category": "custom",
            "content": "Generate ideas for {topic}",
            "metadata": {"owner": "product"},
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()["data"]
    assert created["version"] == 1
    assert created["variables"] == ["topic"]
