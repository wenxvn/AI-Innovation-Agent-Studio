'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  GitBranch, 
  Database, 
  FileText, 
  Code, 
  TestTube, 
  Presentation,
  ArrowRight,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Bot,
    title: 'Agent Workflow',
    description: '多智能体协作工作流，可视化编排复杂任务',
    color: 'text-violet-400'
  },
  {
    icon: Database,
    title: 'Context Engineering',
    description: '智能上下文工程，构建最小必要上下文包',
    color: 'text-blue-400'
  },
  {
    icon: GitBranch,
    title: 'Memory System',
    description: '四层记忆系统，长期记忆与项目记忆',
    color: 'text-cyan-400'
  },
  {
    icon: Code,
    title: 'Skill Registry',
    description: '插件化技能注册，12个内置专业技能',
    color: 'text-indigo-400'
  },
  {
    icon: Shield,
    title: 'Tool Gateway',
    description: '工具调用网关，安全审批机制',
    color: 'text-emerald-400'
  },
  {
    icon: BarChart3,
    title: 'Eval & Trace',
    description: '自动化评估与全链路追踪',
    color: 'text-amber-400'
  }
]

const workflowSteps = [
  { step: 1, title: '上传赛题', description: '上传比赛通知、赛题PDF、行业资料' },
  { step: 2, title: '解析要求', description: 'AI解析比赛要求和评分标准' },
  { step: 3, title: '生成方向', description: '生成多个项目方向供选择' },
  { step: 4, title: '设计架构', description: '生成系统架构和数据库设计' },
  { step: 5, title: '生成代码', description: '生成前后端代码骨架' },
  { step: 6, title: '输出材料', description: '生成答辩稿、README、技术文档' }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-violet-400" />
            <span className="text-xl font-bold">智创工坊</span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              功能
            </Link>
            <Link href="#architecture" className="text-sm text-zinc-400 hover:text-white transition-colors">
              架构
            </Link>
            <Button variant="primary" asChild>
              <Link href="/dashboard">进入工作台</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="accent" className="mb-6">
            工程级 AI Agent 平台
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            从一个想法，到一个
            <span className="text-gradient">可参赛的 AI 项目原型</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            智创工坊是一个面向 AI 创新竞赛和项目孵化的多智能体工程平台。
            它将赛题解析、项目选题、调研分析、PRD 生成、架构设计、代码骨架生成、
            测试评估和答辩材料生成整合进一个可观测的 Agent 工作流。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="primary" asChild>
              <Link href="/dashboard">
                进入 Demo Workspace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#architecture">查看系统架构</a>
            </Button>
          </div>
          
          {/* Tech Stack Badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <Badge variant="secondary">Agent Workflow</Badge>
            <Badge variant="secondary">Context Engineering</Badge>
            <Badge variant="secondary">Memory System</Badge>
            <Badge variant="secondary">Skill Registry</Badge>
            <Badge variant="secondary">Tool Calling</Badge>
            <Badge variant="secondary">Eval & Trace</Badge>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 px-4 bg-zinc-900/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">核心流程</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden group hover:border-violet-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                      {step.step}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                {index < workflowSteps.length - 1 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">核心能力</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
            不是普通聊天机器人，而是完整的 Prompt + Skill + Memory + RAG + Tool Calling + Agent Workflow + Eval + Trace 工程化管理平台
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:border-violet-500/30 transition-colors">
                <CardHeader>
                  <feature.icon className={`h-10 w-10 ${feature.color} mb-4`} />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-16 px-4 bg-zinc-900/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">系统架构</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-400" />
                前端技术栈
              </h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                  Next.js 15+ / React 19+
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  TypeScript + Tailwind CSS
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  shadcn/ui + Framer Motion
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  React Flow + Monaco Editor
                </li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                后端技术栈
              </h3>
              <ul className="space-y-2 text-zinc-400">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                  FastAPI + LangGraph
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  PostgreSQL + pgvector
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  Redis + Celery
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  Langfuse + Promptfoo
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">准备好开始了吗？</h2>
          <p className="text-xl text-zinc-400 mb-8">
            体验从想法到可参赛项目的全流程自动化
          </p>
          <Button size="lg" variant="primary" asChild>
            <Link href="/dashboard">
              立即体验
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-violet-400" />
            <span className="font-semibold">智创工坊</span>
          </div>
          <p className="text-sm text-zinc-500">
            AI Innovation Agent Studio
          </p>
        </div>
      </footer>
    </div>
  )
}
