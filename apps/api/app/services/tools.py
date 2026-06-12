import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.output import Output
from app.models.tool_call import ToolCall
from app.services.documents import search_chunks
from app.services.memory import get_relevant_memories
from app.services.trace import create_tool_trace_event

logger = logging.getLogger(__name__)

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "tools", "registry.yaml")

EXECUTABLE_LOW_RISK_TOOLS = {"memory_search", "rag_search", "output_writer"}

BUILTIN_TOOLS = [
    {
        "name": "rag_search",
        "display_name": "RAG Search",
        "category": "retrieval",
        "description": "Search project document chunks.",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 10,
    },
    {
        "name": "memory_search",
        "display_name": "Memory Search",
        "category": "retrieval",
        "description": "Search project memory.",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 10,
    },
    {
        "name": "output_writer",
        "display_name": "Output Writer",
        "category": "generation",
        "description": "Persist an agent-generated output artifact.",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 30,
    },
    {
        "name": "social_trend_scan",
        "display_name": "Social Trend Scan",
        "category": "retrieval",
        "description": "Build a static social trend scan scaffold.",
        "risk_level": "medium",
        "requires_approval": False,
        "timeout_seconds": 30,
    },
    {
        "name": "file_writer",
        "display_name": "File Writer",
        "category": "file",
        "description": "Write to the local file system.",
        "risk_level": "high",
        "requires_approval": True,
        "timeout_seconds": 30,
    },
    {
        "name": "code_executor",
        "display_name": "Code Executor",
        "category": "execution",
        "description": "Execute code snippets.",
        "risk_level": "high",
        "requires_approval": True,
        "timeout_seconds": 60,
    },
]


@dataclass
class ToolExecutionResult:
    tool_call: ToolCall
    status: str
    output_result: dict
    error_message: str = ""
    requires_approval: bool = False
    executed: bool = False
    latency_ms: int = 0


class ToolOwnershipError(ValueError):
    pass


def _load_registry_from_yaml() -> list[dict]:
    try:
        abs_path = os.path.abspath(REGISTRY_PATH)
        if not os.path.isfile(abs_path):
            logger.warning("Tool registry YAML not found at %s, using builtin tools", abs_path)
            return []

        with open(abs_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        tools = data.get("tools", [])
        return [
            {
                "name": t.get("name", ""),
                "display_name": t.get("display_name", t.get("name", "")),
                "category": t.get("category", "general"),
                "description": t.get("description", ""),
                "risk_level": t.get("risk_level", "low"),
                "requires_approval": t.get("requires_approval", False),
                "timeout_seconds": t.get("timeout_seconds", 30),
                "input_schema": t.get("input_schema", {}),
            }
            for t in tools
            if t.get("name")
        ]
    except Exception as e:
        logger.error("Failed to load tool registry YAML: %s", e)
        return []


def list_tools() -> list[dict]:
    yaml_tools = _load_registry_from_yaml()
    if yaml_tools:
        return yaml_tools
    return BUILTIN_TOOLS


def get_tool_definition(tool_name: str) -> Optional[dict]:
    return next((tool for tool in list_tools() if tool.get("name") == tool_name), None)


def _get_project_agent_run(db: Session, project_id: str, agent_run_id: str) -> Optional[AgentRun]:
    run = db.get(AgentRun, agent_run_id)
    if not run or run.project_id != project_id:
        return None
    return run


def _get_project_tool_call(
    db: Session,
    project_id: str,
    call_id: str,
    agent_run_id: str | None = None,
) -> Optional[ToolCall]:
    query = (
        select(ToolCall)
        .join(AgentRun, ToolCall.agent_run_id == AgentRun.id)
        .where(
            ToolCall.id == call_id,
            ToolCall.project_id == project_id,
            AgentRun.project_id == project_id,
        )
    )
    if agent_run_id is not None:
        query = query.where(
            ToolCall.agent_run_id == agent_run_id,
            AgentRun.id == agent_run_id,
        )
    return db.scalars(query).one_or_none()


def list_tool_calls(db: Session, project_id: str) -> list[ToolCall]:
    return list(
        db.scalars(
            select(ToolCall)
            .join(AgentRun, ToolCall.agent_run_id == AgentRun.id)
            .where(ToolCall.project_id == project_id, AgentRun.project_id == project_id)
            .order_by(ToolCall.created_at.desc())
        ).all()
    )


def approve_tool_call(db: Session, project_id: str, call_id: str, approved_by: str = "user") -> Optional[ToolCall]:
    call = _get_project_tool_call(db, project_id, call_id)
    if not call:
        return None
    call.status = "approved"
    call.approved_by = approved_by
    db.commit()
    db.refresh(call)
    return call


def reject_tool_call(db: Session, project_id: str, call_id: str, reason: str = "") -> Optional[ToolCall]:
    call = _get_project_tool_call(db, project_id, call_id)
    if not call:
        return None
    call.status = "rejected"
    call.error_message = reason
    db.commit()
    db.refresh(call)
    return call


def execute_tool(
    db: Session,
    project_id: str,
    agent_run_id: str,
    tool_name: str,
    input_params: dict[str, Any] | None = None,
    tool_call_id: str | None = None,
) -> ToolExecutionResult:
    start_time = time.time()
    input_params = input_params or {}
    tool = get_tool_definition(tool_name)
    risk_level = (tool or {}).get("risk_level", "unknown")
    requires_approval = bool((tool or {}).get("requires_approval", False)) or risk_level == "high"

    if _get_project_agent_run(db, project_id, agent_run_id) is None:
        raise ToolOwnershipError("Agent run not found")

    call = _get_project_tool_call(db, project_id, tool_call_id, agent_run_id) if tool_call_id else None
    if tool_call_id and call is None:
        raise ToolOwnershipError("Tool call not found")

    if call is None:
        call = ToolCall(
            project_id=project_id,
            agent_run_id=agent_run_id,
            tool_name=tool_name,
        )
        db.add(call)

    call.input_params = input_params
    call.output_result = {}
    call.status = "running"
    call.permission_level = risk_level
    call.requires_approval = requires_approval
    call.error_message = ""
    call.latency_ms = 0
    db.commit()
    db.refresh(call)

    create_tool_trace_event(
        db,
        project_id,
        agent_run_id,
        call,
        event_type="tool_call_started",
        title=f"Tool started: {tool_name}",
        message=f"Running {tool_name}",
        status="info",
        input_data=input_params,
    )

    if tool is None:
        return _finish_tool_failure(
            db,
            project_id,
            agent_run_id,
            call,
            input_params,
            "Tool is not registered",
            start_time,
        )

    if requires_approval:
        latency_ms = int((time.time() - start_time) * 1000)
        call.status = "waiting_approval"
        call.latency_ms = latency_ms
        db.commit()
        db.refresh(call)
        create_tool_trace_event(
            db,
            project_id,
            agent_run_id,
            call,
            event_type="tool_approval_required",
            title=f"Tool approval required: {tool_name}",
            message=f"{tool_name} requires approval and was not executed.",
            status="warning",
            input_data=input_params,
            latency_ms=latency_ms,
        )
        return ToolExecutionResult(
            tool_call=call,
            status=call.status,
            output_result={},
            requires_approval=True,
            executed=False,
            latency_ms=latency_ms,
        )

    if tool_name not in EXECUTABLE_LOW_RISK_TOOLS:
        return _finish_tool_failure(
            db,
            project_id,
            agent_run_id,
            call,
            input_params,
            f"Tool execution is not enabled for {tool_name}",
            start_time,
        )

    try:
        output_result = _execute_low_risk_tool(db, project_id, agent_run_id, tool_name, input_params)
        latency_ms = int((time.time() - start_time) * 1000)
        call.output_result = output_result
        call.status = "completed"
        call.latency_ms = latency_ms
        db.commit()
        db.refresh(call)

        create_tool_trace_event(
            db,
            project_id,
            agent_run_id,
            call,
            event_type="tool_call_completed",
            title=f"Tool completed: {tool_name}",
            message=f"{tool_name} completed in {latency_ms}ms.",
            status="success",
            input_data=input_params,
            output_data=_summarize_tool_output(tool_name, output_result),
            latency_ms=latency_ms,
        )

        logger.info("Tool executed: %s, status=%s, latency=%dms", tool_name, call.status, latency_ms)
        return ToolExecutionResult(
            tool_call=call,
            status=call.status,
            output_result=output_result,
            requires_approval=False,
            executed=True,
            latency_ms=latency_ms,
        )
    except Exception as e:
        db.rollback()
        call = db.get(ToolCall, call.id)
        return _finish_tool_failure(
            db,
            project_id,
            agent_run_id,
            call,
            input_params,
            str(e),
            start_time,
        )


def _finish_tool_failure(
    db: Session,
    project_id: str,
    agent_run_id: str,
    call: ToolCall,
    input_params: dict,
    error_message: str,
    start_time: float,
) -> ToolExecutionResult:
    latency_ms = int((time.time() - start_time) * 1000)
    call.status = "failed"
    call.output_result = {}
    call.error_message = error_message
    call.latency_ms = latency_ms
    db.commit()
    db.refresh(call)

    create_tool_trace_event(
        db,
        project_id,
        agent_run_id,
        call,
        event_type="tool_call_failed",
        title=f"Tool failed: {call.tool_name}",
        message=error_message,
        status="error",
        input_data=input_params,
        error_data={"message": error_message},
        latency_ms=latency_ms,
    )
    logger.warning("Tool execution failed: %s, error=%s", call.tool_name, error_message)
    return ToolExecutionResult(
        tool_call=call,
        status=call.status,
        output_result={},
        error_message=error_message,
        requires_approval=call.requires_approval,
        executed=False,
        latency_ms=latency_ms,
    )


def _execute_low_risk_tool(
    db: Session,
    project_id: str,
    agent_run_id: str,
    tool_name: str,
    input_params: dict[str, Any],
) -> dict:
    if tool_name == "memory_search":
        return _execute_memory_search(db, project_id, input_params)
    if tool_name == "rag_search":
        return _execute_rag_search(db, project_id, input_params)
    if tool_name == "output_writer":
        return _execute_output_writer(db, project_id, agent_run_id, input_params)
    raise ValueError(f"Unsupported low-risk tool: {tool_name}")


def _execute_memory_search(db: Session, project_id: str, input_params: dict[str, Any]) -> dict:
    query = str(input_params.get("query", ""))
    top_k = int(input_params.get("top_k", 5))
    memories = get_relevant_memories(db, project_id, query, top_k=top_k)
    return {
        "hit_count": len(memories),
        "memories": [
            {
                "id": memory.id,
                "memory_type": memory.memory_type,
                "content": memory.content,
                "confidence": memory.confidence,
            }
            for memory in memories
        ],
        "memory_ids": [memory.id for memory in memories],
    }


def _execute_rag_search(db: Session, project_id: str, input_params: dict[str, Any]) -> dict:
    query = str(input_params.get("query", ""))
    top_k = int(input_params.get("top_k", 5))
    chunks = search_chunks(db, project_id, query, top_k=top_k)
    return {
        "hit_count": len(chunks),
        "chunks": chunks,
        "chunk_ids": [chunk.get("chunk_id") for chunk in chunks],
        "mode": chunks[0].get("mode", "unknown") if chunks else "unknown",
    }


def _execute_output_writer(
    db: Session,
    project_id: str,
    agent_run_id: str,
    input_params: dict[str, Any],
) -> dict:
    output = Output(
        project_id=project_id,
        agent_run_id=agent_run_id,
        output_type=input_params.get("output_type", "document"),
        title=input_params.get("title") or "Untitled",
        content=input_params.get("content", ""),
        content_type=input_params.get("content_type", "markdown"),
        language=input_params.get("language", ""),
        file_name=input_params.get("file_name", ""),
        version=1,
        created_by_agent=input_params.get("created_by_agent", ""),
        status=input_params.get("status", "completed"),
        metadata_=input_params.get("metadata", {}),
    )
    db.add(output)
    db.flush()
    return {
        "output_id": output.id,
        "title": output.title,
        "type": output.output_type,
        "status": output.status,
    }


def _summarize_tool_output(tool_name: str, output_result: dict) -> dict:
    if tool_name in {"memory_search", "rag_search"}:
        return {
            "hit_count": output_result.get("hit_count", 0),
            "ids": output_result.get("memory_ids") or output_result.get("chunk_ids") or [],
            "mode": output_result.get("mode", ""),
        }
    if tool_name == "output_writer":
        return {
            "output_id": output_result.get("output_id", ""),
            "title": output_result.get("title", ""),
            "type": output_result.get("type", ""),
            "status": output_result.get("status", ""),
        }
    return output_result
