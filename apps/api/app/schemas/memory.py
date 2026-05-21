from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MemoryCreate(BaseModel):
    memory_type: str = Field(default="project", pattern="^(user|project|semantic|experience)$")
    content: str = Field(..., min_length=1)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    is_active: bool = True
    is_stale: bool = False
    metadata: dict = {}


class MemoryUpdate(BaseModel):
    memory_type: Optional[str] = None
    content: Optional[str] = None
    confidence: Optional[float] = None
    is_active: Optional[bool] = None
    is_stale: Optional[bool] = None
    metadata: Optional[dict] = None


class MemoryOut(BaseModel):
    id: str
    project_id: str
    memory_type: str
    content: str
    confidence: float
    is_active: bool
    is_stale: bool
    metadata_: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
