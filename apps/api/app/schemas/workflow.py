from pydantic import BaseModel, Field
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


class WorkflowRunSummary(BaseModel):
    id: str
    stage_id: str = ""
    agent_name: str = ""
    selected_skill: str = ""
    intent: str = ""
    output_type: str = ""
    status: str = ""
    latency_ms: int = 0
    output_summary: str = ""
    error_message: str = ""
    created_at: str = ""
    updated_at: str = ""


class WorkflowStatus(BaseModel):
    project_id: str
    nodes: list[WorkflowNodeState]
    current_stage: str
    status: str
    progress: int = 0
    recent_run: Optional[WorkflowRunSummary] = None
    failed_nodes: list[WorkflowNodeState] = Field(default_factory=list)
    next_stage: Optional[str] = None
    next_suggestion: str = ""


class WorkflowRunRequest(BaseModel):
    stage_id: Optional[str] = None
    continue_from: Optional[str] = None
