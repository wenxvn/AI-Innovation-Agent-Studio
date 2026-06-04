from sqlalchemy import String, Text, Float, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid


class Memory(Base, TimestampMixin):
    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    memory_type: Mapped[str] = mapped_column(String(50), nullable=False, default="project")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_stale: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    embedding: Mapped[list] = mapped_column(JSON, nullable=True, default=None)
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    embedding_status: Mapped[str] = mapped_column(String(50), nullable=True, default="pending")
    last_embedded_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="memories")
