from sqlalchemy import String, Text, Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base, TimestampMixin, generate_uuid
from app.core.config import get_settings

settings = get_settings()


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="uploaded")
    summary: Mapped[str] = mapped_column(Text, nullable=True, default="")
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    embedding_provider: Mapped[str] = mapped_column(String(50), nullable=True, default="")
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    project = relationship("Project", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding = mapped_column(Vector(settings.EMBEDDING_DIMENSION), nullable=True)
    embedding_provider: Mapped[str] = mapped_column(String(50), nullable=True, default="")
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    embedding_mode: Mapped[str] = mapped_column(String(20), nullable=True, default="")
    source_page: Mapped[int] = mapped_column(Integer, nullable=True)
    source_section: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True, default=dict)

    document = relationship("Document", back_populates="chunks")
