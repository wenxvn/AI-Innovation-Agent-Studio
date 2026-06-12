from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.models.agent_run import AgentRun
from app.models.output import Output
from app.models.project import Project
from app.models.tool_call import ToolCall
from app.models.trace_event import TraceEvent
from app.services import tools as tool_service


@pytest.fixture
def agent_run(db, test_project):
    run = AgentRun(
        project_id=test_project.id,
        agent_name="Test Agent",
        status="running",
        user_input="Build a test plan",
        selected_skill="qa-debugger",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def create_project(db, name="Other Project"):
    project = Project(
        name=name,
        description="Project for ownership tests",
        goal="Verify project isolation",
        status="active",
        current_stage="ideation",
        tech_stack=["Python"],
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def create_agent_run(db, project_id, agent_name="Test Agent"):
    run = AgentRun(
        project_id=project_id,
        agent_name=agent_name,
        status="running",
        user_input="Build a test plan",
        selected_skill="qa-debugger",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def create_tool_call(db, project_id, agent_run_id, tool_name="memory_search", status="pending"):
    call = ToolCall(
        project_id=project_id,
        agent_run_id=agent_run_id,
        tool_name=tool_name,
        status=status,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def trace_event_types(db, agent_run):
    return [
        event.event_type
        for event in db.scalars(
            select(TraceEvent)
            .where(TraceEvent.run_id == agent_run.id)
            .order_by(TraceEvent.created_at.asc())
        ).all()
    ]


def test_memory_search_executes_and_records_tool_call_and_trace(db, test_project, agent_run, monkeypatch):
    memory = SimpleNamespace(
        id="memory-1",
        memory_type="project",
        content="Users need faster experiment review.",
        confidence=0.91,
    )
    monkeypatch.setattr(
        tool_service,
        "get_relevant_memories",
        lambda db, project_id, query, top_k: [memory],
    )

    result = tool_service.execute_tool(
        db,
        project_id=test_project.id,
        agent_run_id=agent_run.id,
        tool_name="memory_search",
        input_params={"query": "experiment review", "top_k": 3},
    )

    assert result.executed is True
    assert result.status == "completed"
    assert result.output_result["hit_count"] == 1
    assert result.tool_call.status == "completed"
    assert result.tool_call.input_params["query"] == "experiment review"
    assert result.tool_call.output_result["memory_ids"] == ["memory-1"]
    assert result.tool_call.latency_ms >= 0
    assert "tool_call_started" in trace_event_types(db, agent_run)
    assert "tool_call_completed" in trace_event_types(db, agent_run)


def test_rag_search_executes_with_registered_low_risk_tool(db, test_project, agent_run, monkeypatch):
    monkeypatch.setattr(
        tool_service,
        "search_chunks",
        lambda db, project_id, query, top_k: [
            {
                "chunk_id": "chunk-1",
                "document_id": "document-1",
                "project_id": project_id,
                "chunk_index": 0,
                "content": "Evidence about agent workflows.",
                "token_count": 4,
                "score": 0.88,
                "embedding_provider": "test",
                "embedding_model": "test",
                "embedding_mode": "mock",
                "mode": "mock",
            }
        ],
    )

    result = tool_service.execute_tool(
        db,
        project_id=test_project.id,
        agent_run_id=agent_run.id,
        tool_name="rag_search",
        input_params={"query": "agent workflows", "top_k": 5},
    )

    assert result.status == "completed"
    assert result.output_result["hit_count"] == 1
    assert result.output_result["chunk_ids"] == ["chunk-1"]
    assert result.tool_call.permission_level == "low"


def test_output_writer_persists_output_and_records_trace(db, test_project, agent_run):
    result = tool_service.execute_tool(
        db,
        project_id=test_project.id,
        agent_run_id=agent_run.id,
        tool_name="output_writer",
        input_params={
            "output_type": "test_report",
            "title": "QA Notes",
            "content": "All critical checks pass.",
            "created_by_agent": "QA Agent",
            "status": "completed",
            "metadata": {"mode": "test"},
        },
    )

    output = db.get(Output, result.output_result["output_id"])

    assert result.status == "completed"
    assert output is not None
    assert output.agent_run_id == agent_run.id
    assert output.title == "QA Notes"
    assert output.status == "completed"
    assert result.tool_call.output_result["output_id"] == output.id
    assert "tool_call_completed" in trace_event_types(db, agent_run)


def test_high_risk_tool_enters_approval_state_without_execution(db, test_project, agent_run):
    result = tool_service.execute_tool(
        db,
        project_id=test_project.id,
        agent_run_id=agent_run.id,
        tool_name="file_writer",
        input_params={"path": "unsafe.txt", "content": "do not write"},
    )

    assert result.executed is False
    assert result.requires_approval is True
    assert result.status == "waiting_approval"
    assert result.output_result == {}
    assert result.tool_call.requires_approval is True
    assert result.tool_call.permission_level == "high"
    assert db.scalars(select(Output)).all() == []
    assert "tool_approval_required" in trace_event_types(db, agent_run)


def test_tool_failure_updates_status_error_and_trace(db, test_project, agent_run, monkeypatch):
    def fail_search(db, project_id, query, top_k):
        raise RuntimeError("memory backend unavailable")

    monkeypatch.setattr(tool_service, "get_relevant_memories", fail_search)

    result = tool_service.execute_tool(
        db,
        project_id=test_project.id,
        agent_run_id=agent_run.id,
        tool_name="memory_search",
        input_params={"query": "anything"},
    )

    stored_call = db.get(ToolCall, result.tool_call.id)
    failure_event = db.scalars(
        select(TraceEvent).where(
            TraceEvent.run_id == agent_run.id,
            TraceEvent.event_type == "tool_call_failed",
        )
    ).one()

    assert result.executed is False
    assert result.status == "failed"
    assert "memory backend unavailable" in result.error_message
    assert stored_call.status == "failed"
    assert "memory backend unavailable" in stored_call.error_message
    assert failure_event.status == "error"
    assert failure_event.error_data["message"] == "memory backend unavailable"


def test_execute_route_rejects_agent_run_from_another_project(client, db, test_project):
    other_project = create_project(db)
    other_run = create_agent_run(db, other_project.id)

    response = client.post(
        f"/api/v1/tools/projects/{test_project.id}/execute",
        json={
            "agent_run_id": other_run.id,
            "tool_name": "memory_search",
            "input_params": {"query": "anything"},
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Agent run not found"
    assert db.scalars(select(ToolCall).where(ToolCall.project_id == test_project.id)).all() == []


def test_execute_route_rejects_tool_call_from_another_project(client, db, test_project, agent_run):
    other_project = create_project(db)
    other_run = create_agent_run(db, other_project.id)
    other_call = create_tool_call(db, other_project.id, other_run.id)

    response = client.post(
        f"/api/v1/tools/projects/{test_project.id}/execute",
        json={
            "agent_run_id": agent_run.id,
            "tool_call_id": other_call.id,
            "tool_name": "memory_search",
            "input_params": {"query": "anything"},
        },
    )

    db.refresh(other_call)

    assert response.status_code == 404
    assert response.json()["detail"] == "Tool call not found"
    assert other_call.status == "pending"
    assert db.scalars(select(ToolCall).where(ToolCall.project_id == test_project.id)).all() == []


def test_execute_route_rejects_tool_call_from_another_agent_run(client, db, test_project, agent_run):
    other_run = create_agent_run(db, test_project.id, agent_name="Other Agent")
    other_call = create_tool_call(db, test_project.id, other_run.id)

    response = client.post(
        f"/api/v1/tools/projects/{test_project.id}/execute",
        json={
            "agent_run_id": agent_run.id,
            "tool_call_id": other_call.id,
            "tool_name": "memory_search",
            "input_params": {"query": "anything"},
        },
    )

    db.refresh(other_call)

    assert response.status_code == 404
    assert response.json()["detail"] == "Tool call not found"
    assert other_call.status == "pending"


def test_approve_and_reject_routes_reject_tool_calls_from_another_project(client, db, test_project):
    other_project = create_project(db)
    other_run = create_agent_run(db, other_project.id)
    approve_call = create_tool_call(db, other_project.id, other_run.id)
    reject_call = create_tool_call(db, other_project.id, other_run.id)

    approve_response = client.post(
        f"/api/v1/tools/projects/{test_project.id}/calls/{approve_call.id}/approve",
        json={"approved_by": "user"},
    )
    reject_response = client.post(
        f"/api/v1/tools/projects/{test_project.id}/calls/{reject_call.id}/reject",
        json={"reason": "nope"},
    )

    db.refresh(approve_call)
    db.refresh(reject_call)

    assert approve_response.status_code == 404
    assert reject_response.status_code == 404
    assert approve_call.status == "pending"
    assert reject_call.status == "pending"


def test_list_tool_calls_excludes_calls_with_foreign_project_or_run(client, db, test_project, agent_run):
    other_project = create_project(db)
    other_run = create_agent_run(db, other_project.id)
    own_call = create_tool_call(db, test_project.id, agent_run.id, status="completed")
    foreign_call = create_tool_call(db, other_project.id, other_run.id, status="completed")
    mismatched_run_call = create_tool_call(db, test_project.id, other_run.id, status="completed")

    response = client.get(f"/api/v1/tools/projects/{test_project.id}/calls")
    payload = response.json()
    ids = {item["id"] for item in payload["data"]}

    assert response.status_code == 200
    assert own_call.id in ids
    assert foreign_call.id not in ids
    assert mismatched_run_call.id not in ids
