from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.agent_run import AgentRun
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.workflow_engine import build_workflow_status
from typing import Optional


def list_projects(db: Session, skip: int = 0, limit: int = 20) -> tuple[list[Project], int]:
    total = db.scalar(select(func.count()).select_from(Project))
    projects = db.scalars(
        select(Project).order_by(Project.updated_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(projects), total or 0


def get_project(db: Session, project_id: str) -> Optional[Project]:
    return db.get(Project, project_id)


def _workflow_run_dict(run: AgentRun) -> dict:
    return {
        "id": run.id,
        "project_id": run.project_id,
        "agent_name": run.agent_name,
        "selected_skill": run.selected_skill or "",
        "status": run.status,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
        "latency_ms": run.latency_ms or 0,
        "error_message": run.error_message or "",
        "generated_output": run.generated_output or {},
        "metadata_": run.metadata_ or {},
    }


def list_workflow_run_dicts(db: Session, project_id: str) -> list[dict]:
    runs = list(
        db.scalars(
            select(AgentRun)
            .where(AgentRun.project_id == project_id)
            .order_by(AgentRun.updated_at.desc(), AgentRun.created_at.desc())
        ).all()
    )
    return [_workflow_run_dict(run) for run in runs]


def build_project_workflow_status(db: Session, project_id: str) -> Optional[dict]:
    project = db.get(Project, project_id)
    if not project:
        return None
    return build_workflow_status(project_id, list_workflow_run_dicts(db, project_id))


def sync_project_workflow_state(
    db: Session,
    project_id: str,
    workflow_status: dict | None = None,
) -> Optional[Project]:
    project = db.get(Project, project_id)
    if not project:
        return None

    status = workflow_status or build_workflow_status(
        project_id,
        list_workflow_run_dicts(db, project_id),
    )

    # Keep an untouched project at its user-created default until a run exists.
    if status.get("recent_run"):
        project.current_stage = status["current_stage"]
        project.progress = status["progress"]
    else:
        project.progress = 0

    db.commit()
    db.refresh(project)
    return project


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
