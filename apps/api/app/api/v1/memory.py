from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.memory import MemoryCreate, MemoryUpdate, MemoryOut
from app.schemas.common import DataResponse, ListResponse
from app.services import memory as svc

router = APIRouter(prefix="/projects/{project_id}/memory", tags=["memory"])


@router.get("", response_model=ListResponse[MemoryOut])
def list_memories(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_memories(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.get("/search")
def search_memories(
    project_id: str,
    q: str = Query(..., description="搜索关键词"),
    mode: str = Query("semantic", description="搜索模式: semantic 或 keyword"),
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    if mode == "semantic":
        results = svc.semantic_search_memories(db, project_id, q, top_k)
        return {
            "data": [
                {
                    "id": r["memory"].id,
                    "project_id": r["memory"].project_id,
                    "memory_type": r["memory"].memory_type,
                    "content": r["memory"].content,
                    "confidence": r["memory"].confidence,
                    "is_active": r["memory"].is_active,
                    "is_stale": r["memory"].is_stale,
                    "score": r["score"],
                    "match_type": r["match_type"],
                    "embedding_status": r["memory"].embedding_status,
                    "created_at": r["memory"].created_at.isoformat() if r["memory"].created_at else "",
                    "updated_at": r["memory"].updated_at.isoformat() if r["memory"].updated_at else "",
                }
                for r in results
            ],
            "total": len(results),
            "query": q,
            "mode": mode,
        }
    else:
        memories = svc.get_relevant_memories(db, project_id, q, top_k)
        return {
            "data": [
                {
                    "id": m.id,
                    "project_id": m.project_id,
                    "memory_type": m.memory_type,
                    "content": m.content,
                    "confidence": m.confidence,
                    "is_active": m.is_active,
                    "is_stale": m.is_stale,
                    "score": 1.0,
                    "match_type": "keyword",
                    "embedding_status": m.embedding_status if hasattr(m, 'embedding_status') else "pending",
                    "created_at": m.created_at.isoformat() if m.created_at else "",
                    "updated_at": m.updated_at.isoformat() if m.updated_at else "",
                }
                for m in memories
            ],
            "total": len(memories),
            "query": q,
            "mode": mode,
        }


@router.post("", response_model=DataResponse[MemoryOut], status_code=201)
def create_memory(project_id: str, body: MemoryCreate, db: Session = Depends(get_db)):
    memory = svc.create_memory(db, project_id, body)
    return DataResponse(data=memory)


@router.patch("/{memory_id}", response_model=DataResponse[MemoryOut])
def update_memory(project_id: str, memory_id: str, body: MemoryUpdate, db: Session = Depends(get_db)):
    memory = svc.update_memory(db, memory_id, body)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return DataResponse(data=memory)


@router.delete("/{memory_id}")
def delete_memory(project_id: str, memory_id: str, db: Session = Depends(get_db)):
    ok = svc.delete_memory(db, memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "deleted"}
