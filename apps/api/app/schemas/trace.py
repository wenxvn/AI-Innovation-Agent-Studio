from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TraceEventOut(BaseModel):
    id: str
    project_id: str
    run_id: str
    event_type: str
    title: str
    message: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    latency_ms: int = 0
    input_data: dict = {}
    output_data: dict = {}
    error_data: dict = {}
    metadata_: dict = {}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
