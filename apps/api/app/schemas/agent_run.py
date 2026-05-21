from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AgentRunCreate(BaseModel):
    user_input: str = Field(..., min_length=1)
    agent_name: str = "Orchestrator Agent"
    selected_skill: Optional[str] = None


class AgentRunOut(BaseModel):
    id: str
    project_id: str
    agent_name: str
    status: str
    user_input: str
    selected_skill: str
    plan: list
    context_pack: dict
    generated_output: dict
    eval_result: dict
    token_usage: dict
    latency_ms: int
    cost: float
    error_message: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
