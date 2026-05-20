# 智创工坊 AI Innovation Agent Studio

> 从一个想法，到一个可参赛的 AI 项目原型。

## 项目简介

智创工坊是一个面向高校 AI 创新竞赛、创业项目孵化、科研项目设计和软件原型开发的多智能体工程平台。

## 核心特性

- **Agent Workflow** - 多智能体协作工作流
- **Context Engineering** - 智能上下文工程
- **Memory System** - 四层记忆系统
- **Skill Registry** - 插件化技能注册
- **Tool Gateway** - 工具调用网关
- **Eval & Trace** - 自动化评估与追踪

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm
- Python 3.11+ (可选，用于后端)
- Docker Desktop (可选，用于基础设施服务)

### 一键启动 (Windows)

1. 双击 `start.bat`
2. 等待服务启动完成
3. 浏览器自动打开 http://localhost:3000

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
- `/projects/[id]/chat` - Agent 聊天
- `/projects/[id]/workflow` - 工作流可视化
- `/projects/[id]/context` - 上下文包查看
- `/projects/[id]/memory` - 记忆系统
- `/projects/[id]/skills` - 技能注册
- `/projects/[id]/tools` - 工具网关
- `/projects/[id]/evals` - 评估仪表板
- `/projects/[id]/outputs` - 生成产物

## 技术栈

### 前端

- Next.js 15+
- React 19+
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- React Flow

### 后端 (Phase 2)

- FastAPI
- LangGraph
- PostgreSQL + pgvector
- Redis
- MinIO

## 开发阶段

- [x] Phase 1: 前端静态原型
- [ ] Phase 2: 后端基础 API
- [ ] Phase 3: RAG 和文件上传
- [ ] Phase 4: Agent Runtime
- [ ] Phase 5: Tool Gateway
- [ ] Phase 6: Eval & Trace
- [ ] Phase 7: 代码生成和测试

## 许可证

MIT
