import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemoryUpdate
from app.services.llm import get_embedding_provider
from app.services.providers.mock_provider import MockEmbeddingProvider
from typing import Optional

logger = logging.getLogger(__name__)


def list_memories(db: Session, project_id: str) -> list[Memory]:
    return list(
        db.scalars(
            select(Memory)
            .where(Memory.project_id == project_id)
            .order_by(Memory.updated_at.desc())
        ).all()
    )


def get_memory(db: Session, memory_id: str) -> Optional[Memory]:
    return db.get(Memory, memory_id)


async def _generate_embedding(content: str) -> tuple[list[float] | None, str, str]:
    try:
        provider = get_embedding_provider()
        result = await provider.embed_texts([content])
        if result.vectors and len(result.vectors) > 0:
            return result.vectors[0], result.model, result.mode
        return None, "", "error"
    except Exception as e:
        logger.error("Memory embedding generation failed: %s", e)
        return None, "", "error"


def create_memory(db: Session, project_id: str, data: MemoryCreate) -> Memory:
    memory = Memory(
        project_id=project_id,
        memory_type=data.memory_type,
        content=data.content,
        confidence=data.confidence,
        is_active=data.is_active,
        is_stale=data.is_stale,
        embedding_status="pending",
        metadata_=data.metadata,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    def _embed():
        vec, model, mode = asyncio.run(_generate_embedding(data.content))
        if vec is not None:
            memory.embedding = vec
            memory.embedding_model = model
            memory.embedding_status = mode
            memory.last_embedded_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(memory)

    try:
        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                pool.submit(_embed)
        else:
            _embed()
    except Exception as e:
        logger.warning("Memory embedding skipped: %s", e)

    return memory


def update_memory(db: Session, memory_id: str, data: MemoryUpdate) -> Optional[Memory]:
    memory = db.get(Memory, memory_id)
    if not memory:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")
    content_changed = "content" in update_data and update_data["content"] != memory.content
    for field, value in update_data.items():
        setattr(memory, field, value)
    db.commit()
    db.refresh(memory)

    if content_changed:
        try:
            def _reembed():
                vec, model, mode = asyncio.run(_generate_embedding(memory.content))
                if vec is not None:
                    memory.embedding = vec
                    memory.embedding_model = model
                    memory.embedding_status = mode
                    memory.last_embedded_at = datetime.now(timezone.utc)
                    db.commit()
                    db.refresh(memory)

            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                pool.submit(_reembed)
        except Exception as e:
            logger.warning("Memory re-embedding skipped: %s", e)

    return memory


def delete_memory(db: Session, memory_id: str) -> bool:
    memory = db.get(Memory, memory_id)
    if not memory:
        return False
    db.delete(memory)
    db.commit()
    return True


def _keyword_search(db: Session, project_id: str, query: str, top_k: int = 5) -> list[Memory]:
    query_lower = query.lower()
    all_memories = list(
        db.scalars(
            select(Memory)
            .where(Memory.project_id == project_id, Memory.is_active == True, Memory.is_stale == False)
        ).all()
    )
    scored = []
    for memory in all_memories:
        content_lower = memory.content.lower()
        score = sum(1 for word in query_lower.split() if word in content_lower)
        scored.append((score, memory))
    scored.sort(key=lambda x: (x[0], x[1].confidence), reverse=True)
    return [m for _, m in scored[:top_k]]


async def _semantic_search_async(db: Session, project_id: str, query: str, top_k: int = 5) -> list[dict]:
    try:
        provider = get_embedding_provider()
        is_mock = isinstance(provider, MockEmbeddingProvider)

        query_result = await provider.embed_texts([query])
        if not query_result.vectors:
            return []

        query_vector = query_result.vectors[0]
        all_memories = list(
            db.scalars(
                select(Memory)
                .where(Memory.project_id == project_id, Memory.is_active == True, Memory.is_stale == False)
            ).all()
        )

        scored = []
        for memory in all_memories:
            if memory.embedding is not None and len(memory.embedding) > 0:
                dot = sum(a * b for a, b in zip(query_vector, memory.embedding))
                norm_q = sum(a * a for a in query_vector) ** 0.5
                norm_m = sum(a * a for a in memory.embedding) ** 0.5
                similarity = float(dot / (norm_q * norm_m)) if norm_q > 0 and norm_m > 0 else 0.0
                scored.append({
                    "memory": memory,
                    "score": round(similarity, 4),
                    "match_type": "semantic" if not is_mock else "semantic_mock",
                })
            else:
                content_lower = memory.content.lower()
                kw_score = sum(1 for word in query.lower().split() if word in content_lower) * 0.1
                scored.append({
                    "memory": memory,
                    "score": round(kw_score, 4),
                    "match_type": "keyword_fallback",
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    except Exception as e:
        logger.error("Semantic memory search failed: %s", e)
        return []


def semantic_search_memories(db: Session, project_id: str, query: str, top_k: int = 5) -> list[dict]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _semantic_search_async(db, project_id, query, top_k))
            return future.result(timeout=30)
    else:
        return asyncio.run(_semantic_search_async(db, project_id, query, top_k))


def get_relevant_memories(db: Session, project_id: str, query: str, top_k: int = 5) -> list[Memory]:
    try:
        semantic_results = semantic_search_memories(db, project_id, query, top_k)
        if semantic_results:
            return [r["memory"] for r in semantic_results]
    except Exception as e:
        logger.warning("Semantic search failed, falling back to keyword: %s", e)

    return _keyword_search(db, project_id, query, top_k)
