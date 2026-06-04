from pydantic import BaseModel
from typing import Optional


class IntentResult(BaseModel):
    intent: str
    selected_skill: str
    workflow_stage: str
    output_type: str
    confidence: float
    reason: str
