import pytest
from app.services.memory import _keyword_search, _semantic_search_async


class TestKeywordSearch:
    def test_keyword_search_basic(self, db_session, test_project):
        from app.services.memory import create_memory
        from app.schemas.memory import MemoryCreate

        create_memory(db_session, test_project.id, MemoryCreate(
            memory_type="project",
            content="本项目使用 FastAPI 和 PostgreSQL 构建后端服务",
        ))
        create_memory(db_session, test_project.id, MemoryCreate(
            memory_type="project",
            content="前端使用 Next.js 和 React 框架",
        ))

        results = _keyword_search(db_session, test_project.id, "FastAPI 后端", top_k=5)
        assert len(results) > 0
        assert any("FastAPI" in m.content for m in results)

    def test_keyword_search_no_match(self, db_session, test_project):
        results = _keyword_search(db_session, test_project.id, "xyz不存在的内容", top_k=5)
        assert isinstance(results, list)


class TestSemanticSearch:
    @pytest.mark.asyncio
    async def test_semantic_search_returns_results(self, db_session, test_project):
        from app.services.memory import create_memory
        from app.schemas.memory import MemoryCreate

        create_memory(db_session, test_project.id, MemoryCreate(
            memory_type="project",
            content="项目的技术栈包括 Python 和 TypeScript",
        ))

        results = await _semantic_search_async(db_session, test_project.id, "技术栈", top_k=5)
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_semantic_search_empty_project(self, db_session, test_project):
        results = await _semantic_search_async(db_session, test_project.id, "测试查询", top_k=5)
        assert isinstance(results, list)
        assert len(results) == 0
