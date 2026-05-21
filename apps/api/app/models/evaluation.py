from sqlalchemy import String, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class Evaluation(Base, TimestampMixin):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rubric: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    result: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    feedback: Mapped[str] = mapped_column(Text, nullable=True, default="")
    risks: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="evaluations")
    agent_run = relationship("AgentRun", back_populates="evaluations")
