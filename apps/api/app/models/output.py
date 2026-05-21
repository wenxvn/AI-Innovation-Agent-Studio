from sqlalchemy import String, Text, Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class Output(Base, TimestampMixin):
    __tablename__ = "generated_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    output_type: Mapped[str] = mapped_column(String(100), nullable=False, default="document")
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Untitled")
    content: Mapped[str] = mapped_column(Text, nullable=True, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_agent: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="outputs")
    agent_run = relationship("AgentRun", back_populates="outputs")
