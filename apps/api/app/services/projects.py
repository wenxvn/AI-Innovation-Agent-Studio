from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from typing import Optional


def list_projects(db: Session, skip: int = 0, limit: int = 20) -> tuple[list[Project], int]:
    total = db.scalar(select(Project).count())
    projects = db.scalars(
        select(Project).order_by(Project.updated_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(projects), total or 0


def get_project(db: Session, project_id: str) -> Optional[Project]:
    return db.get(Project, project_id)


def create_project(db: Session, data: ProjectCreate) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        goal=data.goal,
        tech_stack=data.tech_stack,
        status=data.status,
        current_stage=data.current_stage,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: str, data: ProjectUpdate) -> Optional[Project]:
    project = db.get(Project, project_id)
    if not project:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: str) -> bool:
    project = db.get(Project, project_id)
    if not project:
        return False
    db.delete(project)
    db.commit()
    return True
