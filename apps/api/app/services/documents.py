import os
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.models.document import Document, DocumentChunk
from app.services.llm import get_embedding_provider
from app.services.providers.mock_provider import MockEmbeddingProvider
from app.core.config import get_settings
from typing import Optional

settings = get_settings()


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


def create_document(db: Session, project_id: str, filename: str, file_path: str, file_type: str, file_size: int) -> Document:
    doc = Document(
        project_id=project_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        status="uploaded",
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


def extract_text(file_path: str, file_type: str) -> str:
    if file_type in ("text/plain", "text/markdown", ".txt", ".md"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


async def _embed_and_index_async(db: Session, document_id: str) -> Document:
    doc = db.get(Document, document_id)
    if not doc:
        return doc

    doc.status = "parsing"
    db.commit()

    try:
        text_content = extract_text(doc.file_path, doc.file_type)
        if not text_content:
            doc.status = "failed"
            doc.summary = "Unsupported file type or empty content"
            db.commit()
            return doc

        doc.summary = text_content[:200] + "..." if len(text_content) > 200 else text_content
        chunks = chunk_text(text_content)

        emb_provider = get_embedding_provider()
        is_mock = isinstance(emb_provider, MockEmbeddingProvider)

        batch_size = 20
        for batch_start in range(0, len(chunks), batch_size):
            batch = chunks[batch_start : batch_start + batch_size]
            emb_result = await emb_provider.embed_texts(batch)

            if emb_result.error and not is_mock:
                fallback = MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
                emb_result = await fallback.embed_texts(batch)
                is_mock = True

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
        doc.embedding_provider = emb_result.provider if chunks else ""
        doc.embedding_model = emb_result.model if chunks else ""
        db.commit()
        db.refresh(doc)
    except Exception as e:
        doc.status = "failed"
        doc.summary = str(e)
        db.commit()

    return doc


def parse_and_index_document(db: Session, document_id: str) -> Document:
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
