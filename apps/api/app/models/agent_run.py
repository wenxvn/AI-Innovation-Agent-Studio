from sqlalchemy import String, Text, Integer, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class AgentRun(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False, default="Orchestrator Agent")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="idle")
    user_input: Mapped[str] = mapped_column(Text, nullable=True, default="")
    selected_skill: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    plan: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    context_pack: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    generated_output: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    eval_result: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    token_usage: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    cost: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True, default="")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="agent_runs")
    tool_calls = relationship("ToolCall", back_populates="agent_run", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="agent_run", cascade="all, delete-orphan")
    outputs = relationship("Output", back_populates="agent_run", cascade="all, delete-orphan")
