import asyncio
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document, DocumentChunk
from app.services.llm import get_embedding_provider
from app.services.providers.mock_provider import MockEmbeddingProvider

settings = get_settings()


class DocumentParsingError(Exception):
    """Raised when uploaded content cannot be parsed into readable text."""


def list_documents(db: Session, project_id: str) -> list[Document]:
    return list(
        db.scalars(
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(Document.created_at.desc())
        ).all()
    )


def get_document(db: Session, document_id: str) -> Optional[Document]:
    return db.get(Document, document_id)


def create_document(
    db: Session,
    project_id: str,
    filename: str,
    file_path: str,
    file_type: str,
    file_size: int,
    metadata: Optional[dict] = None,
) -> Document:
    doc = Document(
        project_id=project_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        status="uploaded",
        metadata_=metadata or {},
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, document_id: str) -> bool:
    doc = db.get(Document, document_id)
    if not doc:
        return False
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return True


def _read_utf8_text(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError as exc:
        raise DocumentParsingError(
            "Could not read this text file as UTF-8. Save it as UTF-8 text and upload again."
        ) from exc
    except OSError as exc:
        raise DocumentParsingError("Could not read the uploaded file from storage.") from exc


def _read_pdf_text(file_path: str) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise DocumentParsingError(
            "PDF parsing is not available. Install the PDF parser dependency and try again."
        ) from exc

    try:
        reader = PdfReader(file_path)
        if getattr(reader, "is_encrypted", False):
            raise DocumentParsingError(
                "Encrypted PDFs are not supported. Remove the password and upload again."
            )
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except DocumentParsingError:
        raise
    except Exception as exc:
        raise DocumentParsingError(
            "Could not parse this PDF. It may be damaged, scanned without text, or unsupported."
        ) from exc


def extract_text(file_path: str, file_type: str) -> str:
    normalized_type = file_type.lower()
    if normalized_type in ("text/plain", "text/markdown", ".txt", ".md"):
        text_content = _read_utf8_text(file_path)
    elif normalized_type in ("application/pdf", ".pdf"):
        text_content = _read_pdf_text(file_path)
    else:
        raise DocumentParsingError(
            f"Unsupported document type '{file_type}'. Upload TXT, Markdown, or PDF files."
        )

    if not text_content.strip():
        raise DocumentParsingError("No readable text was found in the uploaded document.")
    return text_content


def chunk_text(text_content: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    chunks = []
    start = 0
    while start < len(text_content):
        end = start + chunk_size
        chunk = text_content[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


def _error_metadata(message: str, stage: str, exc: Exception | None = None) -> dict:
    return {
        "stage": stage,
        "message": message,
        "type": exc.__class__.__name__ if exc else "",
        "at": datetime.now(timezone.utc).isoformat(),
    }


def _clear_document_errors(doc: Document) -> None:
    metadata = dict(doc.metadata_ or {})
    for key in ("error_message", "parse_error", "index_error", "last_error"):
        metadata.pop(key, None)
    doc.metadata_ = metadata


def _mark_document_failed(
    db: Session,
    doc: Document,
    message: str,
    stage: str,
    exc: Exception | None = None,
) -> Document:
    error_detail = _error_metadata(message, stage, exc)
    metadata = dict(doc.metadata_ or {})
    metadata["error_message"] = message
    metadata["last_error"] = error_detail
    metadata[f"{stage}_error"] = error_detail
    doc.metadata_ = metadata
    doc.status = "failed"
    doc.embedding_status = "failed"
    doc.chunk_count = 0
    doc.summary = ""
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def _prepare_document_for_indexing(db: Session, doc: Document) -> None:
    doc.status = "parsing"
    doc.embedding_status = "pending"
    doc.chunk_count = 0
    doc.summary = ""
    _clear_document_errors(doc)
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.id))
    db.add(doc)
    db.commit()


async def _embed_and_index_async(db: Session, document_id: str) -> Optional[Document]:
    doc = db.get(Document, document_id)
    if not doc:
        return doc

    _prepare_document_for_indexing(db, doc)

    try:
        text_content = extract_text(doc.file_path, doc.file_type)
        doc.summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
        chunks = chunk_text(text_content)

        if not chunks:
            raise DocumentParsingError("No indexable text chunks were found in the uploaded document.")

        emb_provider = get_embedding_provider()
        is_mock = isinstance(emb_provider, MockEmbeddingProvider)

        batch_size = 20
        last_embedding_result = None
        for batch_start in range(0, len(chunks), batch_size):
            batch = chunks[batch_start : batch_start + batch_size]
            emb_result = await emb_provider.embed_texts(batch)

            if emb_result.error and not is_mock:
                fallback = MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
                emb_result = await fallback.embed_texts(batch)
                is_mock = True

            if emb_result.error:
                raise RuntimeError(f"Embedding failed: {emb_result.error}")

            last_embedding_result = emb_result
            for i, chunk_content in enumerate(batch):
                idx = batch_start + i
                vector = emb_result.vectors[i] if i < len(emb_result.vectors) else None
                chunk = DocumentChunk(
                    document_id=doc.id,
                    project_id=doc.project_id,
                    chunk_index=idx,
                    content=chunk_content,
                    token_count=len(chunk_content.split()),
                    embedding=vector,
                    embedding_provider=emb_result.provider,
                    embedding_model=emb_result.model,
                    embedding_mode=emb_result.mode,
                )
                db.add(chunk)

        doc.chunk_count = len(chunks)
        doc.status = "indexed"
        doc.embedding_status = "mock" if is_mock else "real"
        doc.embedding_provider = last_embedding_result.provider if last_embedding_result else ""
        doc.embedding_model = last_embedding_result.model if last_embedding_result else ""
        _clear_document_errors(doc)
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except DocumentParsingError as exc:
        db.rollback()
        doc = db.get(Document, document_id)
        if doc:
            return _mark_document_failed(db, doc, str(exc), "parse", exc)
    except Exception as exc:
        db.rollback()
        doc = db.get(Document, document_id)
        if doc:
            return _mark_document_failed(
                db,
                doc,
                "Document indexing failed. Please try reindexing or upload the file again.",
                "index",
                exc,
            )

    return doc


def parse_and_index_document(db: Session, document_id: str) -> Optional[Document]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _embed_and_index_async(db, document_id))
            return future.result(timeout=120)
    else:
        return asyncio.run(_embed_and_index_async(db, document_id))


def get_chunks(db: Session, document_id: str) -> list[DocumentChunk]:
    return list(
        db.scalars(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        ).all()
    )


async def _search_chunks_async(db: Session, project_id: str, query: str, top_k: int = 5) -> list[dict]:
    emb_provider = get_embedding_provider()
    is_mock = isinstance(emb_provider, MockEmbeddingProvider)

    query_result = await emb_provider.embed_texts([query])
    if not query_result.vectors:
        return []

    query_vector = query_result.vectors[0]

    try:
        sql = text("""
            SELECT id, document_id, project_id, chunk_index, content, token_count,
                   embedding <=> :query_vec AS distance,
                   embedding_provider, embedding_model, embedding_mode
            FROM document_chunks
            WHERE project_id = :project_id AND embedding IS NOT NULL
            ORDER BY embedding <=> :query_vec
            LIMIT :top_k
        """)

        vec_str = "[" + ",".join(str(v) for v in query_vector) + "]"
        result = db.execute(sql, {
            "project_id": project_id,
            "query_vec": vec_str,
            "top_k": top_k,
        })

        rows = result.fetchall()
        return [
            {
                "chunk_id": row[0],
                "document_id": row[1],
                "project_id": row[2],
                "chunk_index": row[3],
                "content": row[4],
                "token_count": row[5],
                "score": round(1.0 - row[6], 4) if row[6] is not None else 0.0,
                "embedding_provider": row[7] or "",
                "embedding_model": row[8] or "",
                "embedding_mode": row[9] or "",
                "mode": "real" if not is_mock else "mock",
            }
            for row in rows
        ]
    except Exception:
        all_chunks = list(
            db.scalars(
                select(DocumentChunk)
                .where(DocumentChunk.project_id == project_id)
            ).all()
        )

        import numpy as np
        query_vec = np.array(query_vector)

        scored = []
        for chunk in all_chunks:
            if chunk.embedding is not None:
                chunk_vec = np.array(chunk.embedding)
                dot = np.dot(query_vec, chunk_vec)
                norm = np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
                similarity = float(dot / norm) if norm > 0 else 0.0
                scored.append((similarity, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "project_id": chunk.project_id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "token_count": chunk.token_count,
                "score": round(score, 4),
                "embedding_provider": chunk.embedding_provider or "",
                "embedding_model": chunk.embedding_model or "",
                "embedding_mode": chunk.embedding_mode or "",
                "mode": "real" if not is_mock else "mock",
            }
            for score, chunk in scored[:top_k]
        ]


def search_chunks(db: Session, project_id: str, query: str, top_k: int = 5) -> list:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _search_chunks_async(db, project_id, query, top_k))
            return future.result(timeout=30)
    else:
        return asyncio.run(_search_chunks_async(db, project_id, query, top_k))


def search_chunks_for_agent(db: Session, project_id: str, query: str, top_k: int = 5) -> list:
    results = search_chunks(db, project_id, query, top_k)

    class ChunkProxy:
        def __init__(self, data: dict):
            self.id = data["chunk_id"]
            self.document_id = data["document_id"]
            self.chunk_index = data["chunk_index"]
            self.content = data["content"]

    return [ChunkProxy(r) for r in results]
