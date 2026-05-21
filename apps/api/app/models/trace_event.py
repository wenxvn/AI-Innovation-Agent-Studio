from sqlalchemy import String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid
from datetime import datetime


class TraceEvent(Base, TimestampMixin):
    __tablename__ = "trace_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    message: Mapped[str] = mapped_column(Text, nullable=True, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="info")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[int] = mapped_column(nullable=True, default=0)
    input_data: Mapped[dict] = mapped_column("input", JSON, nullable=True, default=dict)
    output_data: Mapped[dict] = mapped_column("output", JSON, nullable=True, default=dict)
    error_data: Mapped[dict] = mapped_column("error", JSON, nullable=True, default=dict)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    agent_run = relationship("AgentRun", foreign_keys=[run_id])
