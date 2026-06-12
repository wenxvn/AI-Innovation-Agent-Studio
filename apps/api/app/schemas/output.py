from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


class OutputCreate(BaseModel):
    output_type: str = "document"
    title: str = Field(..., min_length=1)
    content: str = ""
    content_type: str = "markdown"
    language: str = ""
    file_name: str = ""
    created_by_agent: str = ""
    status: str = "draft"
    metadata: dict[str, Any] = Field(default_factory=dict)


class OutputUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    output_type: Optional[str] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    file_name: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class OutputOut(BaseModel):
    id: str
    project_id: str
    agent_run_id: Optional[str]
    output_type: str
    title: str
    content: str
    content_type: str
    language: str
    file_name: str
    version: int
    created_by_agent: str
    status: str
    metadata_: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
