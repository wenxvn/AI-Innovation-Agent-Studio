from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.services.documents import search_chunks
from app.schemas.common import DataResponse

router = APIRouter(prefix="/projects/{project_id}/rag", tags=["rag"])


class RagSearchRequest(BaseModel):
    query: str
    top_k: int = 8
    filters: Optional[dict] = None


class RagSearchResult(BaseModel):
    chunk_id: str
    document_id: str
    project_id: str
    chunk_index: int
    content: str
    token_count: int
    score: float
    embedding_provider: str
    embedding_model: str
    embedding_mode: str
    mode: str


@router.post("/search")
def rag_search(project_id: str, body: RagSearchRequest, db: Session = Depends(get_db)):
    results = search_chunks(db, project_id, body.query, body.top_k)
    return {
        "data": results,
        "total": len(results),
        "query": body.query,
        "mode": results[0]["mode"] if results else "unknown",
    }
