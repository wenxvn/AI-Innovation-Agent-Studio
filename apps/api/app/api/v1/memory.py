from fastapi import APIRouter, Depends, HTTPException
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
