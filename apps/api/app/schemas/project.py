from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    goal: str = ""
    tech_stack: list[str] = []
    status: str = "active"
    current_stage: str = "ideation"


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    goal: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    status: Optional[str] = None
    current_stage: Optional[str] = None
    progress: Optional[int] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    goal: str
    tech_stack: list[str]
    status: str
    current_stage: str
    progress: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
