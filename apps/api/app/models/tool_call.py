from sqlalchemy import String, Text, Integer, Float, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class ToolCall(Base, TimestampMixin):
    __tablename__ = "tool_calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name: Mapped[str] = mapped_column(String(255), nullable=False)
    input_params: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    output_result: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    permission_level: Mapped[str] = mapped_column(String(50), nullable=False, default="low")
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True, default="")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="tool_calls")
    agent_run = relationship("AgentRun", back_populates="tool_calls")
