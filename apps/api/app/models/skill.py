from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin, generate_uuid


class Skill(Base, TimestampMixin):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="0.1.0")
    category: Mapped[str] = mapped_column(String(100), nullable=True, default="general")
    trigger: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    inputs: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    outputs: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    tools: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    required_tools: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    permissions: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=True, default="low")
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    author: Mapped[str] = mapped_column(String(255), nullable=True, default="System")
    source: Mapped[str] = mapped_column(String(50), nullable=True, default="yaml")
    config_path: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)
