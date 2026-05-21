from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentOut(BaseModel):
    id: str
    project_id: str
    filename: str
    file_type: str
    file_size: int
    status: str
    summary: str
    chunk_count: int
    embedding_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    token_count: int
    metadata_: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ReindexRequest(BaseModel):
    force: bool = False
