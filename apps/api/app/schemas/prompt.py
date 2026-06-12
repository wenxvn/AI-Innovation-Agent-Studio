from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class PromptTemplateCreate(BaseModel):
    name: str
    title: str
    content: str
    description: str = ""
    category: str = "general"
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class PromptTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    activate: bool = True


class PromptActivateRequest(BaseModel):
    reason: str = ""


class PromptTemplateOut(BaseModel):
    id: str
    name: str
    title: str
    description: str
    content: str
    category: str
    variables: list[str]
    version: int
    is_active: bool
    source: str
    source_path: str
    content_checksum: str
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptVersionOut(BaseModel):
    id: str
    name: str
    title: str
    description: str
    category: str
    variables: list[str]
    version: int
    is_active: bool
    source: str
    source_path: str
    content_checksum: str
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptStatsOut(BaseModel):
    total: int
    active: int
    total_versions: int
    categories: dict[str, int]
    total_variables: int
