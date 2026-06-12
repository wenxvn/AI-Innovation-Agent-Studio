from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ToolCallApprove(BaseModel):
    approved_by: str = "user"


class ToolCallReject(BaseModel):
    reason: str = ""


class ToolExecuteRequest(BaseModel):
    agent_run_id: str
    tool_name: str
    input_params: dict = Field(default_factory=dict)
    tool_call_id: Optional[str] = None


class ToolCallOut(BaseModel):
    id: str
    project_id: str
    agent_run_id: str
    tool_name: str
    input_params: dict
    output_result: dict
    status: str
    permission_level: str
    requires_approval: bool
    approved_by: str
    latency_ms: int
    error_message: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ToolExecutionOut(BaseModel):
    tool_call: ToolCallOut
    status: str
    output_result: dict = Field(default_factory=dict)
    error_message: str = ""
    requires_approval: bool = False
    executed: bool = False
    latency_ms: int = 0
