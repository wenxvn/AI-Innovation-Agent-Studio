from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.db.session import get_db
from app.models.project import Project
from app.models.agent_run import AgentRun
from app.models.output import Output
from app.models.document import Document
from app.models.memory import Memory
from app.models.evaluation import Evaluation
from app.schemas.common import DataResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    project_count = db.scalar(select(func.count(Project.id))) or 0
    active_project_count = db.scalar(
        select(func.count(Project.id)).where(Project.status == "active")
    ) or 0
    agent_run_count = db.scalar(select(func.count(AgentRun.id))) or 0
    output_count = db.scalar(select(func.count(Output.id))) or 0
    document_count = db.scalar(select(func.count(Document.id))) or 0
    memory_count = db.scalar(select(func.count(Memory.id))) or 0
    eval_count = db.scalar(select(func.count(Evaluation.id))) or 0

    avg_score = db.scalar(
        select(func.avg(Evaluation.score)).where(Evaluation.score > 0)
    )

    recent_runs = list(
        db.scalars(
            select(AgentRun).order_by(AgentRun.created_at.desc()).limit(5)
        ).all()
    )

    recent_outputs = list(
        db.scalars(
            select(Output).order_by(Output.created_at.desc()).limit(5)
        ).all()
    )

    return DataResponse(data={
        "project_count": project_count,
        "active_project_count": active_project_count,
        "agent_run_count": agent_run_count,
        "output_count": output_count,
        "document_count": document_count,
        "memory_count": memory_count,
        "eval_count": eval_count,
        "avg_score": round(avg_score, 1) if avg_score else 0,
        "recent_agent_runs": [
            {
                "id": r.id,
                "agent_name": r.agent_name,
                "selected_skill": r.selected_skill,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_runs
        ],
        "recent_outputs": [
            {
                "id": o.id,
                "title": o.title,
                "output_type": o.output_type,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent_outputs
        ],
    })
