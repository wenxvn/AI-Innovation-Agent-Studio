from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional, Literal
from datetime import datetime

EvaluationStatus = Literal["pending", "pass", "fail", "needs_revision", "accepted"]


class EvalRunRequest(BaseModel):
    agent_run_id: str
    mode: str = "auto"


class EvaluationUpdate(BaseModel):
    status: Optional[EvaluationStatus] = None
    review_note: Optional[str] = Field(default=None, max_length=5000)


class EvaluationOut(BaseModel):
    id: str
    project_id: str
    agent_run_id: str
    score: float
    rubric: dict[str, Any]
    result: str
    feedback: str
    risks: list[str]
    status: EvaluationStatus
    review_note: str
    metadata_: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    @field_validator("rubric", "metadata_", mode="before")
    @classmethod
    def default_dict(cls, value):
        return value or {}

    @field_validator("risks", mode="before")
    @classmethod
    def default_list(cls, value):
        return value or []

    @field_validator("review_note", mode="before")
    @classmethod
    def default_text(cls, value):
        return value or ""

    @field_validator("status", mode="before")
    @classmethod
    def default_status(cls, value):
        return value or "pending"

    model_config = {"from_attributes": True}
