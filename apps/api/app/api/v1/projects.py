from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.schemas.common import DataResponse, ListResponse
from app.services import projects as svc

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ListResponse[ProjectOut])
def list_projects(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    items, total = svc.list_projects(db, skip=skip, limit=limit)
    return ListResponse(data=items, total=total)


@router.post("", response_model=DataResponse[ProjectOut], status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = svc.create_project(db, body)
    return DataResponse(data=project)


@router.get("/{project_id}", response_model=DataResponse[ProjectOut])
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = svc.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return DataResponse(data=project)


@router.patch("/{project_id}", response_model=DataResponse[ProjectOut])
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = svc.update_project(db, project_id, body)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return DataResponse(data=project)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    ok = svc.delete_project(db, project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "deleted"}
