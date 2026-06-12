from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.workflow import WorkflowStatus
from app.schemas.common import DataResponse
from app.services import projects as project_service

router = APIRouter(prefix="/projects/{project_id}/workflow", tags=["workflow"])


@router.get("", response_model=DataResponse[WorkflowStatus])
def get_workflow_status(project_id: str, db: Session = Depends(get_db)):
    workflow_status = project_service.build_project_workflow_status(db, project_id)
    if workflow_status is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project_service.sync_project_workflow_state(db, project_id, workflow_status)
    return DataResponse(data=WorkflowStatus(**workflow_status))
