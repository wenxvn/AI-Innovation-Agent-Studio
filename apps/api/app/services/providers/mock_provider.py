import time
import hashlib
import json
from app.schemas.llm import LLMResult, EmbeddingResult, TokenUsage


MOCK_RESPONSES = {
    "prd": {
        "title": "产品需求文档 (PRD)",
        "type": "prd",
        "content": """# 产品需求文档

## 1. 项目概述
基于用户输入的需求，AI Agent 自动生成的产品需求文档。

## 2. 目标用户
- AI 创新竞赛参赛者
- 高校学生团队
- AI 项目创业者

## 3. 核心功能
### 3.1 项目管理
- 创建/编辑/删除项目
- 项目状态跟踪
- 进度可视化

### 3.2 智能体协作
- 多 Agent 工作流
- 任务编排与执行
- 上下文管理

### 3.3 知识管理
- 文档上传与解析
- RAG 检索
- 向量索引

### 3.4 产物生成
- PRD 文档
- 架构设计
- 答辩材料

## 4. 用户故事
1. 作为参赛者，我希望快速创建项目
2. 作为参赛者，我希望 AI 自动生成 PRD
3. 作为参赛者，我希望查看工作流进度

## 5. 非功能需求
- 本地可运行
- 数据持久化
- 响应时间 < 3s
"""
    },
    "architecture": {
        "title": "系统架构设计文档",
        "type": "architecture",
        "content": """# 系统架构设计

## 1. 架构概述
采用前后端分离的微服务架构。

## 2. 技术栈
- 前端: Next.js 15 + React 19 + TypeScript
- 后端: FastAPI + SQLAlchemy
- 数据库: PostgreSQL + pgvector
- 缓存: Redis
- 存储: MinIO

## 3. 系统架构
```
┌─────────────┐
│   Frontend   │
│  Next.js 15  │
└──────┬──────┘
       │
┌──────▼──────┐
│   Backend    │
│   FastAPI    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Database   │
│  PostgreSQL  │
└─────────────┘
```

## 4. 数据模型
- projects: 项目信息
- documents: 文档元数据
- document_chunks: 文档分块和向量
- agent_runs: Agent 运行记录
- memories: 记忆存储
- skills: 技能定义
- evaluations: 评估结果
- generated_outputs: 生成产物
"""
    },
    "research": {
        "title": "调研报告",
        "type": "research",
        "content": """# 调研报告

## 1. 研究背景
针对用户提出的问题进行深入调研和分析。

## 2. 技术调研
### 2.1 AI Agent 框架
- LangChain: 生态完善，社区活跃
- LangGraph: 适合复杂工作流
- AutoGen: 多智能体对话

### 2.2 RAG 技术
- 向量数据库: pgvector, Milvus, Qdrant
- Embedding 模型: OpenAI, BGE, Jina
- 检索策略: 混合检索、重排序

### 2.3 评估方法
- LLM-as-Judge
- 人工评估
- 自动化指标

## 3. 竞品分析
| 产品 | 特点 | 优势 |
|------|------|------|
| Cursor | AI 编程助手 | 代码补全强 |
| Windsurf | AI IDE | 工作流集成 |
| Replit | 在线开发 | 协作便捷 |

## 4. 建议
- 优先实现核心 Agent 流程
- 采用 RAG 增强上下文
- 建立评估体系
"""
    },
    "pitch": {
        "title": "答辩稿",
        "type": "pitch",
        "content": """# 项目答辩稿

## 开场
各位评委好，我们是 [团队名称]，今天为大家展示我们的项目。

## 问题背景
在 AI 快速发展的时代，如何将创意快速转化为可验证的 MVP？

## 解决方案
我们构建了 AI Innovation Agent Studio，一个智能的 Agent 协作平台。

## 核心亮点
1. **多 Agent 协作**: 不同专业 Agent 各司其职
2. **RAG 增强**: 基于文档的智能检索
3. **可视化工作流**: 清晰的执行过程
4. **评估体系**: 自动化质量评估

## 技术实现
- 前端: Next.js + React
- 后端: FastAPI + PostgreSQL
- AI: LLM + Embedding + pgvector

## 演示
[在此进行现场演示]

## 总结
我们的平台实现了从想法到 MVP 的自动化流程。

谢谢各位评委！
"""
    },
}


def get_mock_response(skill_name: str, user_input: str) -> dict:
    for key, resp in MOCK_RESPONSES.items():
        if key in skill_name.lower():
            return resp
    return {
        "title": f"{skill_name} 产物",
        "type": "document",
        "content": f"# {skill_name} 执行结果\n\n## 任务输入\n{user_input}\n\n## 执行结果\n已完成 {skill_name} 任务。\n\n## 下一步建议\n- 查看生成的文档\n- 验证结果准确性\n- 继续下一步任务",
    }


class MockLLMProvider:
    async def generate(
        self,
        messages: list[dict],
        response_format: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
        metadata: dict | None = None,
    ) -> LLMResult:
        start = time.time()
        user_input = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_input = msg.get("content", "")
                break

        skill_name = (metadata or {}).get("skill_name", "general")
        mock_data = get_mock_response(skill_name, user_input)

        if response_format == "json":
            content = json.dumps(mock_data, ensure_ascii=False)
        else:
            content = mock_data.get("content", "")

        input_tokens = sum(len(m.get("content", "")) // 2 for m in messages)
        output_tokens = len(content) // 2

        return LLMResult(
            content=content,
            raw=mock_data,
            provider="mock",
            model="mock-idea2mvp-v1",
            mode="mock",
            token_usage=TokenUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
            ),
            latency_ms=int((time.time() - start) * 1000),
            finish_reason="stop",
            error=None,
        )


class MockEmbeddingProvider:
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    async def embed_texts(
        self, texts: list[str], metadata: dict | None = None
    ) -> EmbeddingResult:
        start = time.time()
        vectors = []
        for text in texts:
            h = hashlib.sha256(text.encode()).digest()
            raw = []
            for i in range(0, len(h), 4):
                val = int.from_bytes(h[i : i + 4], "big") / (2**32)
                raw.append(val)
            while len(raw) < self.dimension:
                h2 = hashlib.sha256(
                    repr(raw[-32:]).encode()
                ).digest()
                for i in range(0, len(h2), 4):
                    val = int.from_bytes(h2[i : i + 4], "big") / (2**32)
                    raw.append(val)
                    if len(raw) >= self.dimension:
                        break
            vectors.append(raw[: self.dimension])

        return EmbeddingResult(
            vectors=vectors,
            dimension=self.dimension,
            provider="mock",
            model="mock-embedding-v1",
            mode="mock",
            latency_ms=int((time.time() - start) * 1000),
            error=None,
        )
