from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SkillUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    description: Optional[str] = None


class SkillOut(BaseModel):
    id: str
    name: str
    description: str
    version: str
    trigger: list
    inputs: list
    outputs: list
    tools: list
    permissions: dict
    requires_approval: bool
    is_enabled: bool
    author: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
