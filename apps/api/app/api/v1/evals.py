from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.evaluation import EvaluationOut, EvalRunRequest
from app.schemas.common import DataResponse, ListResponse
from app.services import evals as svc

router = APIRouter(prefix="/projects/{project_id}/evals", tags=["evals"])


@router.get("", response_model=ListResponse[EvaluationOut])
def list_evaluations(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_evaluations(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/run", response_model=DataResponse[EvaluationOut])
def run_evaluation(project_id: str, body: EvalRunRequest, db: Session = Depends(get_db)):
    eval_obj = svc.run_evaluation(db, project_id, body.agent_run_id, body.mode)
    if not eval_obj:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return DataResponse(data=eval_obj)


@router.get("/{eval_id}", response_model=DataResponse[EvaluationOut])
def get_evaluation(project_id: str, eval_id: str, db: Session = Depends(get_db)):
    eval_obj = svc.get_evaluation(db, eval_id)
    if not eval_obj or eval_obj.project_id != project_id:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return DataResponse(data=eval_obj)
