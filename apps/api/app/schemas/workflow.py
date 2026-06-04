from pydantic import BaseModel
from typing import Optional


class WorkflowNodeState(BaseModel):
    stage_id: str
    label: str
    agent: str
    skill: str
    order: int
    status: str = "pending"
    run_id: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    latency_ms: int = 0
    error_message: str = ""
    output_summary: str = ""


class WorkflowStatus(BaseModel):
    project_id: str
    nodes: list[WorkflowNodeState]
    current_stage: str
    status: str


class WorkflowRunRequest(BaseModel):
    stage_id: Optional[str] = None
    continue_from: Optional[str] = None
