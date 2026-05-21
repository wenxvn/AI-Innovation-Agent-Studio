from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.agent_run import AgentRunCreate, AgentRunOut
from app.schemas.common import DataResponse, ListResponse
from app.services import agents as svc

router = APIRouter(prefix="/projects/{project_id}/agents", tags=["agents"])


@router.post("/run", response_model=DataResponse[AgentRunOut], status_code=201)
def create_run(project_id: str, body: AgentRunCreate, db: Session = Depends(get_db)):
    run = svc.create_agent_run(db, project_id, body)
    return DataResponse(data=run)


@router.get("/runs", response_model=ListResponse[AgentRunOut])
def list_runs(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_agent_runs(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.get("/runs/{run_id}", response_model=DataResponse[AgentRunOut])
def get_run(project_id: str, run_id: str, db: Session = Depends(get_db)):
    run = svc.get_agent_run(db, run_id)
    if not run or run.project_id != project_id:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return DataResponse(data=run)


@router.post("/runs/{run_id}/approve", response_model=DataResponse[AgentRunOut])
def approve_run(project_id: str, run_id: str, db: Session = Depends(get_db)):
    run = svc.approve_agent_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return DataResponse(data=run)


@router.post("/runs/{run_id}/reject", response_model=DataResponse[AgentRunOut])
def reject_run(project_id: str, run_id: str, db: Session = Depends(get_db)):
    run = svc.reject_agent_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return DataResponse(data=run)
