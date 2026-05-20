export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'archived'
  goal: string
  currentStage: string
  techStack: string[]
  createdAt: string
  updatedAt: string
  progress: number
  agentRuns: number
  lastRunAt: string
}

export interface AgentRun {
  id: string
  projectId: string
  agentName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: string
  output: string
  startedAt: string
  endedAt: string | null
  latencyMs: number
  tokenUsage: number
  cost: number
}

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  trigger: string[]
  inputs: string[]
  outputs: string[]
  tools: string[]
  permissions: {
    readFiles: boolean
    writeFiles: boolean
    executeCode: boolean
    externalNetwork: boolean
  }
  requiresApproval: boolean
  author: string
  createdAt: string
  updatedAt: string
}

export interface Tool {
  id: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  permissionLevel: 'low' | 'medium' | 'high'
  requiresApproval: boolean
  timeoutSeconds: number
  recentCalls: number
  successRate: number
  avgLatencyMs: number
}

export interface Memory {
  id: string
  projectId: string
  memoryType: 'user' | 'project' | 'semantic' | 'experience'
  content: string
  metadata: Record<string, unknown>
  confidence: number
  isActive: boolean
  isStale: boolean
  createdAt: string
  updatedAt: string
}

export interface Evaluation {
  id: string
  agentRunId: string
  projectId: string
  score: number
  rubric: Record<string, number>
  result: string
  feedback: string
  createdAt: string
}

export interface Output {
  id: string
  projectId: string
  type: string
  title: string
  content: string
  version: number
  createdByAgent: string
  createdAt: string
  updatedAt: string
}

// Demo Project
export const demoProject: Project = {
  id: 'demo-project-001',
  name: '面向高校 AI 创新竞赛的多智能体项目孵化平台',
  description: '一个工程级 AI Agent 平台，通过多智能体协作实现从赛题解析到项目交付的全流程',
  status: 'active',
  goal: '参加人工智能创新赛道比赛，构建工程级 Agent 项目',
  currentStage: 'Architecture Design',
  techStack: ['Python', 'TypeScript', 'FastAPI', 'Next.js', 'LangGraph', 'PostgreSQL', 'Redis'],
  createdAt: '2026-05-15T10:00:00Z',
  updatedAt: '2026-05-19T14:30:00Z',
  progress: 65,
  agentRuns: 12,
  lastRunAt: '2026-05-19T14:30:00Z'
}

// Projects List
export const projects: Project[] = [
  demoProject,
  {
    id: 'project-002',
    name: '智能医疗诊断助手',
    description: '基于多模态 AI 的医疗影像诊断系统',
    status: 'active',
    goal: '开发智能医疗诊断辅助系统',
    currentStage: 'Code Generation',
    techStack: ['Python', 'PyTorch', 'FastAPI', 'React'],
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-05-18T16:45:00Z',
    progress: 45,
    agentRuns: 8,
    lastRunAt: '2026-05-18T16:45:00Z'
  },
  {
    id: 'project-003',
    name: '智能教育个性化推荐系统',
    description: '基于知识图谱的个性化学习路径推荐',
    status: 'completed',
    goal: '构建智能教育推荐系统',
    currentStage: 'Completed',
    techStack: ['Python', 'Neo4j', 'FastAPI', 'Vue.js'],
    createdAt: '2026-04-20T09:00:00Z',
    updatedAt: '2026-05-15T11:20:00Z',
    progress: 100,
    agentRuns: 25,
    lastRunAt: '2026-05-15T11:20:00Z'
  }
]

// Agent Runs
export const agentRuns: AgentRun[] = [
  {
    id: 'run-001',
    projectId: 'demo-project-001',
    agentName: 'Orchestrator Agent',
    status: 'completed',
    input: '分析项目目标，规划下一步任务',
    output: '已识别项目需求，建议进行架构设计',
    startedAt: '2026-05-19T14:00:00Z',
    endedAt: '2026-05-19T14:05:00Z',
    latencyMs: 3200,
    tokenUsage: 2450,
    cost: 0.005
  },
  {
    id: 'run-002',
    projectId: 'demo-project-001',
    agentName: 'Architecture Agent',
    status: 'running',
    input: '设计系统架构和技术选型',
    output: '',
    startedAt: '2026-05-19T14:30:00Z',
    endedAt: null,
    latencyMs: 0,
    tokenUsage: 0,
    cost: 0
  },
  {
    id: 'run-003',
    projectId: 'demo-project-001',
    agentName: 'Research Agent',
    status: 'completed',
    input: '调研多智能体协作框架',
    output: '已完成 LangGraph、CrewAI、AutoGen 对比分析',
    startedAt: '2026-05-19T13:30:00Z',
    endedAt: '2026-05-19T13:45:00Z',
    latencyMs: 8500,
    tokenUsage: 5200,
    cost: 0.012
  },
  {
    id: 'run-004',
    projectId: 'demo-project-001',
    agentName: 'Product Agent',
    status: 'completed',
    input: '生成 PRD 文档',
    output: '已生成 PRD，包含 15 个用户故事',
    startedAt: '2026-05-19T12:00:00Z',
    endedAt: '2026-05-19T12:20:00Z',
    latencyMs: 12000,
    tokenUsage: 8900,
    cost: 0.018
  }
]

// Skills
export const skills: Skill[] = [
  {
    id: 'skill-001',
    name: 'competition-analyzer',
    description: '解析比赛通知，提取赛题要求、评分标准、提交物要求',
    version: '0.1.0',
    trigger: ['用户上传比赛通知', '用户需要分析比赛要求'],
    inputs: ['competition_file', 'scoring_criteria'],
    outputs: ['requirements.json', 'criteria.json'],
    tools: ['file_reader', 'pdf_parser'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-002',
    name: 'idea-generator',
    description: '根据比赛要求和用户兴趣生成多个项目方向',
    version: '0.1.0',
    trigger: ['用户需要项目方向', '比赛分析完成后'],
    inputs: ['requirements', 'user_preferences', 'market_trends'],
    outputs: ['project_ideas.json'],
    tools: ['rag_search', 'web_search'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: true },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-003',
    name: 'prd-writer',
    description: '将用户想法、赛题、调研资料转化为结构化 PRD',
    version: '0.1.0',
    trigger: ['用户需要产品需求文档', '用户选择了项目方向'],
    inputs: ['project_goal', 'target_users', 'competition_rules', 'retrieved_context'],
    outputs: ['prd.md', 'user_stories.json', 'feature_priority_table.json'],
    tools: ['document_reader', 'rag_search', 'citation_checker'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-004',
    name: 'architecture-designer',
    description: '生成系统架构、模块划分、数据库设计、API 设计',
    version: '0.1.0',
    trigger: ['用户需要架构设计', 'PRD 生成完成后'],
    inputs: ['prd', 'tech_stack', 'constraints'],
    outputs: ['architecture.md', 'database_schema.json', 'api_design.json'],
    tools: ['diagram_generator', 'code_analyzer'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-005',
    name: 'fastapi-generator',
    description: '生成 FastAPI 后端代码骨架和配置文件',
    version: '0.1.0',
    trigger: ['用户需要后端代码', '架构设计完成后'],
    inputs: ['api_design', 'database_schema', 'tech_stack'],
    outputs: ['backend_files/'],
    tools: ['file_writer', 'code_formatter'],
    permissions: { readFiles: true, writeFiles: true, executeCode: false, externalNetwork: false },
    requiresApproval: true,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-006',
    name: 'nextjs-generator',
    description: '生成 Next.js 前端代码骨架和配置文件',
    version: '0.1.0',
    trigger: ['用户需要前端代码', '架构设计完成后'],
    inputs: ['api_design', 'ui_requirements', 'tech_stack'],
    outputs: ['frontend_files/'],
    tools: ['file_writer', 'code_formatter'],
    permissions: { readFiles: true, writeFiles: true, executeCode: false, externalNetwork: false },
    requiresApproval: true,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-007',
    name: 'pitch-writer',
    description: '生成答辩稿、路演稿、项目摘要、技术亮点',
    version: '0.1.0',
    trigger: ['用户需要答辩材料', '项目开发完成后'],
    inputs: ['project_summary', 'technical_highlights', 'business_value'],
    outputs: ['pitch.md', 'slide_outline.json', 'demo_script.md'],
    tools: ['document_generator', 'template_engine'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-008',
    name: 'qa-debugger',
    description: '运行测试、检查代码质量、生成修复建议',
    version: '0.1.0',
    trigger: ['用户需要代码检查', '代码生成完成后'],
    inputs: ['code_files', 'test_requirements'],
    outputs: ['test_results.json', 'fixes.json', 'quality_report.md'],
    tools: ['code_sandbox', 'linter', 'test_runner'],
    permissions: { readFiles: true, writeFiles: false, executeCode: true, externalNetwork: false },
    requiresApproval: true,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-009',
    name: 'research-synthesizer',
    description: '进行行业调研、竞品分析、技术趋势分析',
    version: '0.1.0',
    trigger: ['用户需要调研分析', '项目方向确定后'],
    inputs: ['project_direction', 'research_scope'],
    outputs: ['research_report.md', 'competitors.json', 'trends.json'],
    tools: ['web_search', 'rag_search', 'paper_search'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: true },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-010',
    name: 'context-pack-builder',
    description: '为每一次 Agent 执行构建最小、准确、可追踪的上下文包',
    version: '0.1.0',
    trigger: ['任意 Agent 即将执行任务时'],
    inputs: ['user_goal', 'project_state', 'current_task', 'retrieved_documents', 'memory_items'],
    outputs: ['context_pack.json'],
    tools: ['memory_retriever', 'rag_retriever'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-011',
    name: 'rag-builder',
    description: '构建 RAG 知识库，包括文档解析、切分、向量化',
    version: '0.1.0',
    trigger: ['用户上传文档后', '需要更新知识库时'],
    inputs: ['documents', 'chunk_size', 'embedding_model'],
    outputs: ['vector_index', 'chunk_metadata.json'],
    tools: ['pdf_parser', 'text_splitter', 'embedding_generator'],
    permissions: { readFiles: true, writeFiles: true, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'skill-012',
    name: 'api-designer',
    description: '设计 RESTful API，生成 OpenAPI 规范',
    version: '0.1.0',
    trigger: ['用户需要 API 设计', '架构设计阶段'],
    inputs: ['requirements', 'data_models', 'auth_strategy'],
    outputs: ['openapi.yaml', 'api_endpoints.json'],
    tools: ['schema_generator', 'api_validator'],
    permissions: { readFiles: true, writeFiles: false, executeCode: false, externalNetwork: false },
    requiresApproval: false,
    author: 'System',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  }
]

// Tools
export const tools: Tool[] = [
  {
    id: 'tool-001',
    name: 'File Tool',
    description: '读取、写入、列出、删除文件',
    inputSchema: { path: 'string', action: 'read|write|list|delete' },
    outputSchema: { content: 'string', files: 'array' },
    permissionLevel: 'high',
    requiresApproval: true,
    timeoutSeconds: 30,
    recentCalls: 156,
    successRate: 98.5,
    avgLatencyMs: 45
  },
  {
    id: 'tool-002',
    name: 'RAG Search Tool',
    description: '检索项目知识库，返回相关文档片段',
    inputSchema: { query: 'string', topK: 'number' },
    outputSchema: { chunks: 'array', scores: 'array' },
    permissionLevel: 'low',
    requiresApproval: false,
    timeoutSeconds: 10,
    recentCalls: 234,
    successRate: 99.2,
    avgLatencyMs: 120
  },
  {
    id: 'tool-003',
    name: 'Web Search Tool',
    description: '搜索互联网获取最新信息',
    inputSchema: { query: 'string', numResults: 'number' },
    outputSchema: { results: 'array', snippets: 'array' },
    permissionLevel: 'medium',
    requiresApproval: false,
    timeoutSeconds: 20,
    recentCalls: 89,
    successRate: 95.6,
    avgLatencyMs: 1500
  },
  {
    id: 'tool-004',
    name: 'GitHub Tool',
    description: '读取 repo、创建 issue、创建 PR、提交代码',
    inputSchema: { repo: 'string', action: 'string', params: 'object' },
    outputSchema: { result: 'object' },
    permissionLevel: 'high',
    requiresApproval: true,
    timeoutSeconds: 60,
    recentCalls: 23,
    successRate: 100,
    avgLatencyMs: 2100
  },
  {
    id: 'tool-005',
    name: 'Code Sandbox Tool',
    description: '运行测试、执行 lint、类型检查',
    inputSchema: { code: 'string', language: 'string', command: 'string' },
    outputSchema: { output: 'string', errors: 'array', success: 'boolean' },
    permissionLevel: 'high',
    requiresApproval: true,
    timeoutSeconds: 120,
    recentCalls: 45,
    successRate: 92.3,
    avgLatencyMs: 3500
  },
  {
    id: 'tool-006',
    name: 'Report Tool',
    description: '生成 Markdown、README、PPT 大纲',
    inputSchema: { type: 'string', content: 'object', format: 'string' },
    outputSchema: { document: 'string', format: 'string' },
    permissionLevel: 'low',
    requiresApproval: false,
    timeoutSeconds: 30,
    recentCalls: 67,
    successRate: 100,
    avgLatencyMs: 800
  },
  {
    id: 'tool-007',
    name: 'Eval Tool',
    description: '对 Agent 输出评分，检测幻觉和风险',
    inputSchema: { output: 'string', rubric: 'object' },
    outputSchema: { score: 'number', feedback: 'string', risks: 'array' },
    permissionLevel: 'low',
    requiresApproval: false,
    timeoutSeconds: 15,
    recentCalls: 123,
    successRate: 100,
    avgLatencyMs: 2500
  }
]

// Memory
export const memories: Memory[] = [
  {
    id: 'memory-001',
    projectId: 'demo-project-001',
    memoryType: 'user',
    content: '用户偏好使用 Python 和 TypeScript，喜欢深色主题',
    metadata: { source: 'user_profile' },
    confidence: 0.95,
    isActive: true,
    isStale: false,
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'memory-002',
    projectId: 'demo-project-001',
    memoryType: 'project',
    content: '项目目标：参加人工智能创新赛道比赛，构建工程级 Agent 项目',
    metadata: { source: 'project_init' },
    confidence: 1.0,
    isActive: true,
    isStale: false,
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'memory-003',
    projectId: 'demo-project-001',
    memoryType: 'project',
    content: '技术选型：FastAPI + Next.js + LangGraph + PostgreSQL',
    metadata: { source: 'architecture_decision' },
    confidence: 0.98,
    isActive: true,
    isStale: false,
    createdAt: '2026-05-17T14:00:00Z',
    updatedAt: '2026-05-17T14:00:00Z'
  },
  {
    id: 'memory-004',
    projectId: 'demo-project-001',
    memoryType: 'semantic',
    content: 'LangGraph 是 LangChain 团队开发的状态图框架，适合复杂 Agent 工作流',
    metadata: { source: 'research_doc', chunk_id: 'chunk-001' },
    confidence: 0.92,
    isActive: true,
    isStale: false,
    createdAt: '2026-05-18T09:00:00Z',
    updatedAt: '2026-05-18T09:00:00Z'
  },
  {
    id: 'memory-005',
    projectId: 'demo-project-001',
    memoryType: 'experience',
    content: '使用 React Flow 实现工作流可视化效果良好，用户反馈积极',
    metadata: { source: 'agent_feedback', run_id: 'run-005' },
    confidence: 0.88,
    isActive: true,
    isStale: false,
    createdAt: '2026-05-19T11:00:00Z',
    updatedAt: '2026-05-19T11:00:00Z'
  }
]

// Evaluations
export const evaluations: Evaluation[] = [
  {
    id: 'eval-001',
    agentRunId: 'run-001',
    projectId: 'demo-project-001',
    score: 92,
    rubric: {
      correctness: 95,
      completeness: 90,
      feasibility: 88,
      innovation: 92,
      engineering_quality: 94,
      citation_quality: 85,
      security_risk: 10
    },
    result: 'pass',
    feedback: '整体质量优秀，建议增加更多边界情况处理',
    createdAt: '2026-05-19T14:05:00Z'
  },
  {
    id: 'eval-002',
    agentRunId: 'run-003',
    projectId: 'demo-project-001',
    score: 88,
    rubric: {
      correctness: 90,
      completeness: 85,
      feasibility: 92,
      innovation: 86,
      engineering_quality: 88,
      citation_quality: 90,
      security_risk: 5
    },
    result: 'pass',
    feedback: '调研全面，引用质量高，部分技术趋势分析可更深入',
    createdAt: '2026-05-19T13:45:00Z'
  },
  {
    id: 'eval-003',
    agentRunId: 'run-004',
    projectId: 'demo-project-001',
    score: 95,
    rubric: {
      correctness: 96,
      completeness: 94,
      feasibility: 95,
      innovation: 93,
      engineering_quality: 96,
      citation_quality: 92,
      security_risk: 8
    },
    result: 'pass',
    feedback: 'PRD 结构完整，用户故事清晰，验收标准明确',
    createdAt: '2026-05-19T12:20:00Z'
  }
]

// Outputs
export const outputs: Output[] = [
  {
    id: 'output-001',
    projectId: 'demo-project-001',
    type: 'prd',
    title: '产品需求文档 (PRD)',
    content: `# 智创工坊 AI Innovation Agent Studio PRD

## 1. 项目概述
本项目是一个面向高校 AI 创新竞赛的多智能体工程平台，通过多智能体协作实现从赛题解析到项目交付的全流程。

## 2. 目标用户
- 高校学生参加 AI 创新竞赛
- 创业团队进行项目孵化
- 科研团队进行项目设计

## 3. 核心功能
1. 赛题解析与需求分析
2. 项目方向生成与评估
3. PRD 与技术文档生成
4. 系统架构设计
5. 代码骨架生成
6. 测试与质量评估
7. 答辩材料生成

## 4. 用户故事
- 作为参赛学生，我希望上传比赛通知后能自动解析要求
- 作为项目负责人，我希望获得多个项目方向建议
- 作为开发者，我希望自动生成代码骨架

## 5. MVP 范围
Phase 1: 前端静态原型
Phase 2: 后端基础 API
Phase 3: RAG 和文件上传
Phase 4: Agent Runtime
Phase 5: Tool Gateway
Phase 6: Eval & Trace
Phase 7: 代码生成和测试`,
    version: 1,
    createdByAgent: 'Product Agent',
    createdAt: '2026-05-19T12:20:00Z',
    updatedAt: '2026-05-19T12:20:00Z'
  },
  {
    id: 'output-002',
    projectId: 'demo-project-001',
    type: 'architecture',
    title: '系统架构设计文档',
    content: `# 系统架构设计

## 1. 架构概述
采用前后端分离的微服务架构，支持多智能体协作。

## 2. 技术栈
- 前端: Next.js 15 + React 19 + TypeScript
- 后端: FastAPI + LangGraph
- 数据库: PostgreSQL + pgvector
- 缓存: Redis
- 存储: MinIO

## 3. 模块划分
1. Web 应用 (Next.js)
2. API 服务 (FastAPI)
3. Agent Runtime (LangGraph)
4. Tool Gateway
5. RAG Pipeline
6. Memory System
7. Eval System

## 4. 数据流
用户输入 → Orchestrator Agent → Context Pack Builder → Skill Agent → Tool Gateway → Output Generator

## 5. 部署架构
本地开发: Docker Compose
生产环境: Kubernetes`,
    version: 1,
    createdByAgent: 'Architecture Agent',
    createdAt: '2026-05-19T14:30:00Z',
    updatedAt: '2026-05-19T14:30:00Z'
  },
  {
    id: 'output-003',
    projectId: 'demo-project-001',
    type: 'pitch',
    title: '答辩稿',
    content: `# 智创工坊 - 答辩稿

## 项目简介
智创工坊是一个面向 AI 创新竞赛的多智能体工程平台。

## 核心创新点
1. **多智能体协作架构**: 8 个专业 Agent 协同工作
2. **上下文工程**: 最小必要上下文包构建
3. **四层记忆系统**: 用户/项目/语义/经验记忆
4. **插件化技能注册**: 12 个内置 Skill
5. **工具调用网关**: 安全审批机制
6. **自动化评估**: 12 个评估维度

## 技术亮点
- LangGraph 状态机工作流
- pgvector 向量检索
- React Flow 可视化
- 全链路 Trace 追踪

## 商业价值
- 降低 AI 项目开发门槛
- 提升竞赛准备效率
- 沉淀项目经验知识

## Demo 演示
[演示从赛题上传到答辩材料生成的全流程]`,
    version: 1,
    createdByAgent: 'Pitch Agent',
    createdAt: '2026-05-19T15:00:00Z',
    updatedAt: '2026-05-19T15:00:00Z'
  }
]

// Workflow nodes
export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    agentName: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval'
    skill?: string
    toolCalls?: number
    duration?: string
    evalScore?: number
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  animated?: boolean
}

export const workflowNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'input',
    position: { x: 250, y: 0 },
    data: { label: 'Start', agentName: '', status: 'completed' }
  },
  {
    id: 'requirement',
    type: 'default',
    position: { x: 250, y: 100 },
    data: { label: 'Requirement Analysis', agentName: 'Requirement Agent', status: 'completed', skill: 'competition-analyzer', toolCalls: 3, duration: '2m', evalScore: 92 }
  },
  {
    id: 'research',
    type: 'default',
    position: { x: 250, y: 200 },
    data: { label: 'Research', agentName: 'Research Agent', status: 'completed', skill: 'research-synthesizer', toolCalls: 5, duration: '5m', evalScore: 88 }
  },
  {
    id: 'product',
    type: 'default',
    position: { x: 250, y: 300 },
    data: { label: 'Product Design', agentName: 'Product Agent', status: 'completed', skill: 'prd-writer', toolCalls: 2, duration: '8m', evalScore: 95 }
  },
  {
    id: 'architecture',
    type: 'default',
    position: { x: 250, y: 400 },
    data: { label: 'Architecture', agentName: 'Architecture Agent', status: 'running', skill: 'architecture-designer', toolCalls: 1, duration: '3m' }
  },
  {
    id: 'coding',
    type: 'default',
    position: { x: 250, y: 500 },
    data: { label: 'Code Generation', agentName: 'Coding Agent', status: 'pending', skill: 'fastapi-generator' }
  },
  {
    id: 'qa',
    type: 'default',
    position: { x: 250, y: 600 },
    data: { label: 'QA & Testing', agentName: 'QA Agent', status: 'pending', skill: 'qa-debugger' }
  },
  {
    id: 'pitch',
    type: 'default',
    position: { x: 250, y: 700 },
    data: { label: 'Pitch Materials', agentName: 'Pitch Agent', status: 'pending', skill: 'pitch-writer' }
  },
  {
    id: 'end',
    type: 'output',
    position: { x: 250, y: 800 },
    data: { label: 'End', agentName: '', status: 'pending' }
  }
]

export const workflowEdges: WorkflowEdge[] = [
  { id: 'e1', source: 'start', target: 'requirement' },
  { id: 'e2', source: 'requirement', target: 'research' },
  { id: 'e3', source: 'research', target: 'product' },
  { id: 'e4', source: 'product', target: 'architecture' },
  { id: 'e5', source: 'architecture', target: 'coding', animated: true },
  { id: 'e6', source: 'coding', target: 'qa' },
  { id: 'e7', source: 'qa', target: 'pitch' },
  { id: 'e8', source: 'pitch', target: 'end' }
]

// Context Pack
export interface ContextPack {
  task: string
  goal: string
  currentStage: string
  constraints: string[]
  projectState: Record<string, unknown>
  relevantMemory: Array<{
    content: string
    memoryType: string
    source: string
    confidence: number
  }>
  retrievedEvidence: Array<{
    content: string
    sourceDocument: string
    chunkId: string
    score: number
  }>
  toolResults: unknown[]
  decisionsSoFar: string[]
  risks: string[]
  doNotDo: string[]
  expectedOutput: string
}

export const contextPack: ContextPack = {
  task: '设计系统架构',
  goal: '为智创工坊平台设计可扩展的系统架构',
  currentStage: 'Architecture Design',
  constraints: [
    'Windows 本地一键启动',
    '第一阶段使用 mock data',
    '支持后续接入真实 LLM API',
    '深色主题优先'
  ],
  projectState: {
    name: '智创工坊 AI Innovation Agent Studio',
    techStack: ['Python', 'TypeScript', 'FastAPI', 'Next.js', 'LangGraph', 'PostgreSQL'],
    progress: 65
  },
  relevantMemory: [
    {
      content: '用户偏好使用 Python 和 TypeScript',
      memoryType: 'user',
      source: 'user_profile',
      confidence: 0.95
    },
    {
      content: '技术选型：FastAPI + Next.js + LangGraph + PostgreSQL',
      memoryType: 'project',
      source: 'architecture_decision',
      confidence: 0.98
    }
  ],
  retrievedEvidence: [
    {
      content: 'LangGraph 适合复杂 Agent 工作流编排',
      sourceDocument: 'langgraph_research.md',
      chunkId: 'chunk-001',
      score: 0.92
    }
  ],
  toolResults: [],
  decisionsSoFar: [
    '使用 LangGraph 而非 CrewAI',
    '采用 PostgreSQL + pgvector',
    '前端使用 Next.js 15'
  ],
  risks: [
    'Mock data 可能与真实 LLM 输出格式不一致',
    '本地开发环境可能与生产环境有差异'
  ],
  doNotDo: [
    '不要使用过时的技术栈',
    '不要在第一阶段暴露 API Key'
  ],
  expectedOutput: '系统架构文档，包含模块划分、数据流、部署架构'
}
