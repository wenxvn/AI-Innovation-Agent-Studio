from sqlalchemy import String, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    goal: Mapped[str] = mapped_column(Text, nullable=True, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    current_stage: Mapped[str] = mapped_column(String(100), nullable=False, default="ideation")
    tech_stack: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="project", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="project", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="project", cascade="all, delete-orphan")
    outputs = relationship("Output", back_populates="project", cascade="all, delete-orphan")
    tool_calls = relationship("ToolCall", back_populates="project", cascade="all, delete-orphan")
    trace_events = relationship("TraceEvent", foreign_keys="TraceEvent.project_id", cascade="all, delete-orphan")
