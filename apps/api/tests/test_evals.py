from sqlalchemy import func, select

from app.models.agent_run import AgentRun
from app.models.evaluation import Evaluation


def _create_project(client, name: str = "Eval Test") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def _create_agent_run(db, project_id: str, content: str = "") -> AgentRun:
    run = AgentRun(
        project_id=project_id,
        agent_name="QA Agent",
        status="completed",
        user_input="Review this product requirements document.",
        selected_skill="qa-debugger",
        generated_output={
            "title": "Quality Review",
            "type": "review",
            "content": content
            or "# Quality Review\n\n## Summary\n\n- Clear goal\n- Needs stronger evidence\n- Add acceptance criteria",
        },
        context_pack={
            "retrieved_evidence": [
                {"source_id": "doc-1", "excerpt": "Evidence about acceptance criteria"}
            ]
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def test_run_evaluation_creates_quality_review(client, db):
    project_id = _create_project(client)
    run = _create_agent_run(db, project_id)

    response = client.post(
        f"/api/v1/projects/{project_id}/evals/run",
        json={"agent_run_id": run.id, "mode": "auto"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["project_id"] == project_id
    assert data["agent_run_id"] == run.id
    assert data["score"] > 0
    assert data["result"] in {"pass", "fail"}
    assert data["status"] == "pending"
    assert data["review_note"] == ""
    assert data["metadata_"]["dimensions"]
    assert "correctness" in data["rubric"]


def test_run_evaluation_reuses_existing_review(client, db):
    project_id = _create_project(client, "Eval Reuse Test")
    run = _create_agent_run(db, project_id)

    first = client.post(
        f"/api/v1/projects/{project_id}/evals/run",
        json={"agent_run_id": run.id},
    )
    second = client.post(
        f"/api/v1/projects/{project_id}/evals/run",
        json={"agent_run_id": run.id},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["data"]["id"] == first.json()["data"]["id"]

    count = db.scalar(
        select(func.count(Evaluation.id)).where(Evaluation.agent_run_id == run.id)
    )
    assert count == 1


def test_update_evaluation_review_status_preserves_auto_score(client, db):
    project_id = _create_project(client, "Eval Manual Review Test")
    run = _create_agent_run(db, project_id)
    created = client.post(
        f"/api/v1/projects/{project_id}/evals/run",
        json={"agent_run_id": run.id},
    ).json()["data"]

    response = client.patch(
        f"/api/v1/projects/{project_id}/evals/{created['id']}",
        json={
            "status": "needs_revision",
            "review_note": "Clarify the risk section before accepting this artifact.",
        },
    )

    assert response.status_code == 200
    updated = response.json()["data"]
    assert updated["status"] == "needs_revision"
    assert updated["review_note"] == "Clarify the risk section before accepting this artifact."
    assert updated["score"] == created["score"]
    assert updated["rubric"] == created["rubric"]
    assert updated["result"] == created["result"]
    assert updated["feedback"] == created["feedback"]
