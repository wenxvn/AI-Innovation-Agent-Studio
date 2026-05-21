from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemoryUpdate
from typing import Optional


def list_memories(db: Session, project_id: str) -> list[Memory]:
    return list(
        db.scalars(
            select(Memory)
            .where(Memory.project_id == project_id)
            .order_by(Memory.updated_at.desc())
        ).all()
    )


def get_memory(db: Session, memory_id: str) -> Optional[Memory]:
    return db.get(Memory, memory_id)


def create_memory(db: Session, project_id: str, data: MemoryCreate) -> Memory:
    memory = Memory(
        project_id=project_id,
        memory_type=data.memory_type,
        content=data.content,
        confidence=data.confidence,
        is_active=data.is_active,
        is_stale=data.is_stale,
        metadata_=data.metadata,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


def update_memory(db: Session, memory_id: str, data: MemoryUpdate) -> Optional[Memory]:
    memory = db.get(Memory, memory_id)
    if not memory:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")
    for field, value in update_data.items():
        setattr(memory, field, value)
    db.commit()
    db.refresh(memory)
    return memory


def delete_memory(db: Session, memory_id: str) -> bool:
    memory = db.get(Memory, memory_id)
    if not memory:
        return False
    db.delete(memory)
    db.commit()
    return True


def get_relevant_memories(db: Session, project_id: str, query: str, top_k: int = 5) -> list[Memory]:
    query_lower = query.lower()
    all_memories = list(
        db.scalars(
            select(Memory)
            .where(Memory.project_id == project_id, Memory.is_active == True, Memory.is_stale == False)
        ).all()
    )

    scored = []
    for memory in all_memories:
        content_lower = memory.content.lower()
        score = sum(1 for word in query_lower.split() if word in content_lower)
        if score > 0:
            scored.append((score, memory))
        else:
            scored.append((0, memory))

    scored.sort(key=lambda x: (x[0], x[1].confidence), reverse=True)
    return [m for _, m in scored[:top_k]]
