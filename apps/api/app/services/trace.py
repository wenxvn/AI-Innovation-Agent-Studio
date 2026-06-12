from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.trace_event import TraceEvent
from typing import Optional


def create_trace_event(
    db: Session,
    project_id: str,
    run_id: str,
    event_type: str,
    title: str = "",
    message: str = "",
    status: str = "info",
    input_data: dict | None = None,
    output_data: dict | None = None,
    error_data: dict | None = None,
    metadata: dict | None = None,
    latency_ms: int = 0,
) -> TraceEvent:
    now = datetime.now(timezone.utc)
    event = TraceEvent(
        project_id=project_id,
        run_id=run_id,
        event_type=event_type,
        title=title,
        message=message,
        status=status,
        started_at=now,
        ended_at=now if latency_ms > 0 else None,
        latency_ms=latency_ms,
        input_data=input_data or {},
        output_data=output_data or {},
        error_data=error_data or {},
        metadata_=metadata or {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def create_tool_trace_event(
    db: Session,
    project_id: str,
    run_id: str,
    tool_call,
    event_type: str,
    title: str = "",
    message: str = "",
    status: str = "info",
    input_data: dict | None = None,
    output_data: dict | None = None,
    error_data: dict | None = None,
    metadata: dict | None = None,
    latency_ms: int = 0,
) -> TraceEvent:
    tool_metadata = {
        "tool_call_id": tool_call.id,
        "tool_name": tool_call.tool_name,
        "tool_status": tool_call.status,
        "risk_level": tool_call.permission_level,
        "requires_approval": tool_call.requires_approval,
    }
    if metadata:
        tool_metadata.update(metadata)

    return create_trace_event(
        db,
        project_id,
        run_id,
        event_type=event_type,
        title=title or f"Tool {tool_call.tool_name}",
        message=message,
        status=status,
        input_data=input_data,
        output_data=output_data,
        error_data=error_data,
        metadata=tool_metadata,
        latency_ms=latency_ms,
    )


def list_run_trace_events(db: Session, run_id: str) -> list[TraceEvent]:
    return list(
        db.scalars(
            select(TraceEvent)
            .where(TraceEvent.run_id == run_id)
            .order_by(TraceEvent.created_at.asc())
        ).all()
    )


def list_project_trace_events(
    db: Session,
    project_id: str,
    limit: int = 100,
) -> list[TraceEvent]:
    return list(
        db.scalars(
            select(TraceEvent)
            .where(TraceEvent.project_id == project_id)
            .order_by(TraceEvent.created_at.desc())
            .limit(limit)
        ).all()
    )
