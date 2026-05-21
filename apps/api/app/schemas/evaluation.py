from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EvalRunRequest(BaseModel):
    agent_run_id: str
    mode: str = "auto"


class EvaluationOut(BaseModel):
    id: str
    project_id: str
    agent_run_id: str
    score: float
    rubric: dict
    result: str
    feedback: str
    risks: list
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
