from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class OutputCreate(BaseModel):
    output_type: str = "document"
    title: str = Field(..., min_length=1)
    content: str = ""
    created_by_agent: str = ""


class OutputUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    output_type: Optional[str] = None
    status: Optional[str] = None


class OutputOut(BaseModel):
    id: str
    project_id: str
    agent_run_id: Optional[str]
    output_type: str
    title: str
    content: str
    version: int
    created_by_agent: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
