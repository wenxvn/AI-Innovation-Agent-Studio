from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SkillUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    description: Optional[str] = None


class SkillOut(BaseModel):
    id: str
    name: str
    display_name: Optional[str] = ""
    description: str
    version: str
    category: Optional[str] = "general"
    trigger: list
    inputs: list
    outputs: list
    tools: list
    required_tools: Optional[list] = []
    permissions: dict
    risk_level: Optional[str] = "low"
    requires_approval: bool
    is_enabled: bool
    author: str
    source: Optional[str] = "yaml"
    config_path: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
