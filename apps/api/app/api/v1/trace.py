from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.trace import TraceEventOut
from app.schemas.common import ListResponse
from app.services import trace as svc

router = APIRouter(prefix="/projects/{project_id}", tags=["trace"])


@router.get("/agents/runs/{run_id}/trace", response_model=ListResponse[TraceEventOut])
def get_run_trace(project_id: str, run_id: str, db: Session = Depends(get_db)):
    items = svc.list_run_trace_events(db, run_id)
    return ListResponse(data=items, total=len(items))


@router.get("/trace/events", response_model=ListResponse[TraceEventOut])
def get_project_trace(project_id: str, limit: int = 100, db: Session = Depends(get_db)):
    items = svc.list_project_trace_events(db, project_id, limit)
    return ListResponse(data=items, total=len(items))
