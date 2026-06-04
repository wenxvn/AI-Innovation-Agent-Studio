import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db
from app.models.agent_run import AgentRun
from app.schemas.workflow import WorkflowStatus, WorkflowNodeState, WorkflowRunRequest
from app.schemas.common import DataResponse
from app.services.workflow_engine import (
    build_default_workflow,
    update_workflow_from_runs,
    get_current_stage,
    serialize_workflow_nodes,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects/{project_id}/workflow", tags=["workflow"])


@router.get("", response_model=DataResponse[WorkflowStatus])
def get_workflow_status(project_id: str, db: Session = Depends(get_db)):
    runs = list(
        db.scalars(
            select(AgentRun)
            .where(AgentRun.project_id == project_id)
            .order_by(AgentRun.created_at.desc())
        ).all()
    )

    run_dicts = [
        {
            "id": r.id,
            "selected_skill": r.selected_skill or "",
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "updated_at": r.updated_at.isoformat() if r.updated_at else "",
            "latency_ms": r.latency_ms or 0,
            "error_message": r.error_message or "",
            "generated_output": r.generated_output or {},
        }
        for r in runs
    ]

    nodes = build_default_workflow()
    nodes = update_workflow_from_runs(nodes, run_dicts)
    current_stage = get_current_stage(nodes)

    has_any_run = any(n.status != "pending" for n in nodes)
    overall_status = "running" if any(n.status == "running" for n in nodes) else ("completed" if has_any_run else "idle")

    return DataResponse(data=WorkflowStatus(
        project_id=project_id,
        nodes=[WorkflowNodeState(**n) for n in serialize_workflow_nodes(nodes)],
        current_stage=current_stage,
        status=overall_status,
    ))
