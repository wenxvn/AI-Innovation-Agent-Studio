from app.services.agents import (
    INSPIRATION_RUN_MODE,
    build_plan,
    is_inspiration_discovery,
)


def test_inspiration_discovery_detection_from_keywords():
    assert is_inspiration_discovery(
        "我没有 idea，帮我从小红书、抖音和推特热点里找方向",
        "idea-generator",
    )


def test_inspiration_discovery_detection_requires_idea_skill_without_mode():
    assert not is_inspiration_discovery(
        "我想研究社交平台热点",
        "research-synthesizer",
    )


def test_inspiration_discovery_detection_from_explicit_mode():
    assert is_inspiration_discovery(
        "先帮我找方向",
        "idea-generator",
        INSPIRATION_RUN_MODE,
    )


def test_inspiration_discovery_plan():
    plan = build_plan("idea-generator", INSPIRATION_RUN_MODE)

    assert len(plan) == 4
    assert plan[0]["action"] == "提出主题澄清问题"
    assert plan[1]["action"] == "扫描社媒热点信号"


def test_inspiration_discovery_agent_run_records_social_scan(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Inspiration Project"})
    project_id = project_resp.json()["data"]["id"]

    run_resp = client.post(
        f"/api/v1/projects/{project_id}/agents/run",
        json={
            "user_input": "我没有 idea，帮我从小红书、抖音和推特热点里找方向",
            "selected_skill": "idea-generator",
            "agent_name": "Product Agent",
            "run_mode": INSPIRATION_RUN_MODE,
        },
    )

    assert run_resp.status_code == 201
    run_data = run_resp.json()["data"]
    assert run_data["selected_skill"] == "idea-generator"
    assert run_data["metadata_"]["run_mode"] == INSPIRATION_RUN_MODE
    assert "social_trend_scan" in run_data["context_pack"]
    assert run_data["context_pack"]["social_trend_scan"]["platforms"]

    calls_resp = client.get(f"/api/v1/tools/projects/{project_id}/calls")
    call_names = [item["tool_name"] for item in calls_resp.json()["data"]]
    assert "social_trend_scan" in call_names
