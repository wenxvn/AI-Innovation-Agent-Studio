# 智创工坊 AI Innovation Agent Studio

> 从一个想法，到一个可参赛的 AI 项目原型。

## 项目简介

智创工坊是一个面向高校 AI 创新竞赛、创业项目孵化、科研项目设计和软件原型开发的多智能体工程平台。

## 核心特性

- **Intent Classifier** - LLM 意图识别 + 规则兜底
- **Agent Workflow** - 多智能体协作工作流 + 轻量状态机
- **Context Engineering** - 智能上下文工程
- **Memory System** - Embedding 语义检索 + 关键词兜底
- **Skill Registry** - YAML 配置化技能注册
- **Tool Gateway** - YAML 配置化工具注册 + 风险审批
- **Eval & Trace** - 自动化评估与 Trace 时间线可视化
- **Prompts Management** - 提示词模板管理
- **Storage Abstraction** - 本地/MinIO 可配置存储

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm
- Python 3.11+ (可选，用于后端)
- Docker Desktop (可选，用于基础设施服务)

### 一键启动 (Windows)

1. 双击 `start.bat`
2. 等待服务启动完成
3. 浏览器自动打开 http://localhost:3000/dashboard

`start.bat` 会优先使用 Docker 启动 PostgreSQL、Redis 和 MinIO。如果 Docker Desktop 未安装或未运行，会自动降级到本地 SQLite 数据库，保证前端 Dashboard 和项目列表仍可用于本地演示。

### 手动启动

#### 前端

```bash
cd apps/web
pnpm install
pnpm dev
```

访问 http://localhost:3000

#### 后端 (可选)

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
$env:DATABASE_URL="sqlite:///./agent_studio.db"
python -m app.db.init_db
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 文档: http://localhost:8000/docs

#### 基础设施 (可选)

```bash
docker compose up -d
```

启动 PostgreSQL、Redis、MinIO

### 停止服务

双击 `stop.bat` 或运行：

```bash
docker compose down
```

## 项目结构

```
ai-innovation-agent-studio/
├── apps/
│   ├── web/              # Next.js 前端
│   │   ├── app/          # 页面路由
│   │   ├── components/   # UI 组件
│   │   ├── lib/          # 工具函数和 Mock 数据
│   │   ├── stores/       # Zustand 状态管理
│   │   └── styles/       # 全局样式
│   └── api/              # FastAPI 后端 (Phase 2)
├── packages/             # 共享包
├── skills/               # Skill 定义
├── evals/                # 评估配置
├── docker-compose.yml    # Docker 配置
├── start.bat             # 一键启动
├── stop.bat              # 停止服务
├── .env.example          # 环境变量示例
└── README.md             # 项目文档
```

## 页面导航

- `/` - Landing Page
- `/dashboard` - 项目仪表板
- `/projects/[id]` - 项目工作台
- `/projects/[id]/chat` - Agent 聊天 (支持意图识别展示)
- `/projects/[id]/workflow` - 工作流可视化 (实时状态)
- `/projects/[id]/context` - 上下文包查看
- `/projects/[id]/memory` - 记忆系统 (语义搜索)
- `/projects/[id]/skills` - 技能注册 (YAML 配置)
- `/projects/[id]/tools` - 工具网关 (风险等级)
- `/projects/[id]/prompts` - 提示词管理
- `/projects/[id]/evals` - 评估仪表板
- `/projects/[id]/outputs` - 生成产物 (代码预览)
- `/projects/[id]/settings` - 项目设置

## 技术栈

### 前端

- Next.js 15+
- React 19+
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- React Flow

### 后端

- FastAPI
- SQLAlchemy + Alembic
- PostgreSQL + pgvector
- Redis (缓存/队列)
- MinIO/S3 (文件存储)

## 开发阶段

- [x] Phase 1: 前端静态原型
- [x] Phase 2: 后端基础 API + 数据库
- [x] Phase 3: RAG 和文件上传 + Embedding
- [x] Phase 4: Agent Runtime + Intent Classifier
- [x] Phase 5: Tool Gateway + 风险审批
- [x] Phase 6: Eval & Trace 时间线
- [x] Phase 7: Workflow 状态机 + Skill/Tool YAML 配置
- [ ] Phase 8: Redis 异步队列 + MinIO 云存储

## v1.4 新增能力

- Agent Intent Classifier: LLM 意图识别 + 规则兜底
- Workflow 状态机: 多阶段工作流可视化
- Memory Embedding 语义检索
- Skill Registry YAML 配置化
- Tool Registry YAML 配置化 + 风险等级
- Trace 时间线可视化组件
- Prompts 管理页面
- 代码产物预览 (语言检测)
- Playwright E2E 测试基础
- Storage 服务抽象层

## 许可证

MIT
