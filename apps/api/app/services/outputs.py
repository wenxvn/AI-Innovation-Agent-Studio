from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.output import Output
from app.schemas.output import OutputCreate, OutputUpdate
from typing import Optional


def list_outputs(db: Session, project_id: str) -> list[Output]:
    return list(
        db.scalars(
            select(Output)
            .where(Output.project_id == project_id)
            .order_by(Output.created_at.desc())
        ).all()
    )


def get_output(db: Session, output_id: str) -> Optional[Output]:
    return db.get(Output, output_id)


def create_output(db: Session, project_id: str, data: OutputCreate) -> Output:
    output = Output(
        project_id=project_id,
        output_type=data.output_type,
        title=data.title,
        content=data.content,
        created_by_agent=data.created_by_agent,
        version=1,
        status="draft",
    )
    db.add(output)
    db.commit()
    db.refresh(output)
    return output


def update_output(db: Session, output_id: str, data: OutputUpdate) -> Optional[Output]:
    output = db.get(Output, output_id)
    if not output:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "content" in update_data and update_data["content"] != output.content:
        output.version += 1
    for field, value in update_data.items():
        setattr(output, field, value)
    db.commit()
    db.refresh(output)
    return output


def delete_output(db: Session, output_id: str) -> bool:
    output = db.get(Output, output_id)
    if not output:
        return False
    db.delete(output)
    db.commit()
    return True
