from app.models.agent_run import AgentRun
from app.services.projects import build_project_workflow_status, sync_project_workflow_state


def test_agent_run_completion_updates_project_and_workflow(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Workflow Project"})
    project_id = project_resp.json()["data"]["id"]

    run_resp = client.post(
        f"/api/v1/projects/{project_id}/agents/run",
        json={
            "user_input": "请为这个 AI 项目撰写 PRD",
            "selected_skill": "prd-writer",
            "agent_name": "Product Agent",
        },
    )

    assert run_resp.status_code == 201
    run_data = run_resp.json()["data"]
    assert run_data["status"] == "completed"
    assert run_data["selected_skill"] == "prd-writer"

    project_data = client.get(f"/api/v1/projects/{project_id}").json()["data"]
    assert project_data["current_stage"] == "product"
    assert project_data["progress"] == 50

    workflow_data = client.get(f"/api/v1/projects/{project_id}/workflow").json()["data"]
    product_node = next(node for node in workflow_data["nodes"] if node["stage_id"] == "product")
    assert product_node["status"] == "success"
    assert product_node["run_id"] == run_data["id"]
    assert product_node["latency_ms"] >= 0
    assert product_node["output_summary"]
    assert workflow_data["recent_run"]["id"] == run_data["id"]
    assert workflow_data["next_stage"] == "architecture"


def test_failed_run_marks_node_failed_without_advancing_progress(db, test_project):
    failed_run = AgentRun(
        project_id=test_project.id,
        agent_name="Architecture Agent",
        selected_skill="architecture-designer",
        status="failed",
        user_input="设计系统架构",
        error_message="Provider timeout",
        generated_output={},
        metadata_={
            "intent": "architecture_design",
            "workflow_stage": "architecture",
            "output_type": "architecture",
        },
    )
    db.add(failed_run)
    db.commit()

    project = sync_project_workflow_state(db, test_project.id)
    assert project.current_stage == "architecture"
    assert project.progress == 0

    workflow_status = build_project_workflow_status(db, test_project.id)
    architecture_node = next(
        node for node in workflow_status["nodes"] if node["stage_id"] == "architecture"
    )
    assert architecture_node["status"] == "failed"
    assert architecture_node["error_message"] == "Provider timeout"
    assert workflow_status["status"] == "needs_attention"
    assert workflow_status["failed_nodes"][0]["stage_id"] == "architecture"


def test_sync_project_workflow_maps_different_skill_to_stage(db, test_project):
    coding_run = AgentRun(
        project_id=test_project.id,
        agent_name="Coding Agent",
        selected_skill="nextjs-generator",
        status="completed",
        user_input="生成前端页面",
        latency_ms=1200,
        generated_output={
            "title": "Next.js 页面实现",
            "type": "frontend_code",
            "content": "页面结构和组件代码",
        },
        metadata_={
            "intent": "frontend_code",
            "workflow_stage": "coding",
            "output_type": "frontend_code",
        },
    )
    db.add(coding_run)
    db.commit()

    project = sync_project_workflow_state(db, test_project.id)
    assert project.current_stage == "coding"
    assert project.progress == 75

    workflow_status = build_project_workflow_status(db, test_project.id)
    coding_node = next(node for node in workflow_status["nodes"] if node["stage_id"] == "coding")
    assert coding_node["status"] == "success"
    assert coding_node["run_id"] == coding_run.id
    assert coding_node["output_summary"] == "Next.js 页面实现 - 页面结构和组件代码"
