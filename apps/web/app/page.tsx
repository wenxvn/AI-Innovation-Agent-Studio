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
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Brain,
  Workflow,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  Target,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const features = [
  {
    icon: Workflow,
    title: '智能体工作流',
    description: '多智能体协作工作流，可视化编排复杂任务，8大专业Agent协同工作',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
  },
  {
    icon: Database,
    title: '上下文工程',
    description: '智能上下文工程，构建最小必要上下文包，精确检索相关证据',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: Brain,
    title: '记忆系统',
    description: '四层记忆系统：用户记忆、项目记忆、语义记忆、经验记忆',
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  {
    icon: Code,
    title: '技能注册表',
    description: '插件化技能注册，12个内置专业技能，覆盖项目全流程',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
  },
  {
    icon: Shield,
    title: '工具网关',
    description: '工具调用网关，安全审批机制，高风险操作人工确认',
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    icon: BarChart3,
    title: '评估与追踪',
    description: '多维度自动评估，全链路追踪可视化，12个评估维度',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  }
]

const workflowSteps = [
  { step: 1, title: '上传赛题', description: '上传比赛通知、赛题PDF、行业资料', icon: FileText },
  { step: 2, title: '解析要求', description: 'AI解析比赛要求和评分标准', icon: Target },
  { step: 3, title: '生成方向', description: '生成多个项目方向供选择', icon: Sparkles },
  { step: 4, title: '设计架构', description: '生成系统架构和数据库设计', icon: GitBranch },
  { step: 5, title: '生成代码', description: '生成前后端代码骨架', icon: Code },
  { step: 6, title: '输出材料', description: '生成答辩稿、README、技术文档', icon: FileText },
]

const agents = [
  { name: '需求分析智能体', role: '需求分析', status: '解析赛题和评分标准' },
  { name: '调研智能体', role: '调研分析', status: '背景调研与竞品分析' },
  { name: '产品智能体', role: '产品设计', status: 'PRD生成与用户故事' },
  { name: '架构智能体', role: '架构设计', status: '系统架构与数据库' },
  { name: '代码智能体', role: '代码生成', status: '前后端代码骨架' },
  { name: '质量智能体', role: '质量检查', status: '测试与修复建议' },
  { name: '答辩智能体', role: '答辩准备', status: '答辩稿与路演材料' },
]

const stats = [
  { label: '内置技能', value: '12+', icon: Code },
  { label: '评估维度', value: '12', icon: BarChart3 },
  { label: '智能体类型', value: '8', icon: Bot },
  { label: '工具集成', value: '8+', icon: Shield },
]

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="h-8 w-8 text-violet-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <span className="text-xl font-bold">智创工坊</span>
              <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">Idea2MVP Agent Studio</span>
            </div>
          </div>
          <nav className="flex items-center space-x-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              功能
            </Link>
            <Link href="#workflow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              流程
            </Link>
            <Link href="#agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              智能体
            </Link>
            <Link href="#architecture" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              架构
            </Link>
            <Button variant="primary" size="sm" asChild>
              <Link href="/dashboard">
                进入工作台
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4">
        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <Badge variant="accent" className="mb-6 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            工程级 AI Agent 平台
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            从一个想法，到一个
            <br />
            <span className="text-gradient">可参赛的 AI 项目原型</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            智创工坊是一个面向 AI 创新竞赛和项目孵化的多智能体工程平台。
            它将赛题解析、项目选题、调研分析、PRD 生成、架构设计、代码骨架生成、
            测试评估和答辩材料生成整合进一个可观测的 Agent 工作流。
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-12">
            <Button size="lg" variant="primary" className="px-8" asChild>
              <Link href="/dashboard">
                进入演示工作台
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8" asChild>
              <a href="#workflow">
                <Zap className="mr-2 h-5 w-5" />
                查看核心流程
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-violet-500 mr-2" />
                  <span className="text-3xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            <Badge variant="secondary" className="px-3 py-1">智能体工作流</Badge>
            <Badge variant="secondary" className="px-3 py-1">上下文工程</Badge>
            <Badge variant="secondary" className="px-3 py-1">记忆系统</Badge>
            <Badge variant="secondary" className="px-3 py-1">技能注册表</Badge>
            <Badge variant="secondary" className="px-3 py-1">工具调用</Badge>
            <Badge variant="secondary" className="px-3 py-1">评估与 Trace</Badge>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">核心流程</Badge>
            <h2 className="text-4xl font-bold mb-4">端到端的项目孵化流水线</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              不是普通聊天机器人，而是完整的多智能体协作工作流
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden group hover:border-violet-500/30 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20">
                      <span className="text-violet-400 font-bold text-sm">{step.step}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <step.icon className="h-5 w-5 text-violet-400" />
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-sm">{step.description}</CardDescription>
                </CardHeader>
                {index < workflowSteps.length - 1 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-60 transition-opacity">
                    <ChevronRight className="h-6 w-6 text-violet-400" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">核心能力</Badge>
            <h2 className="text-4xl font-bold mb-4">完整的 Agent 工程化管理平台</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              提示词 + 技能 + 记忆 + RAG + 工具调用 + 智能体工作流 + 评估 + Trace
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className={`hover:shadow-lg transition-all duration-300 group ${feature.borderColor} hover:border-violet-500/30`}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Agents Section */}
      <section id="agents" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">智能体团队</Badge>
            <h2 className="text-4xl font-bold mb-4">8大专业 Agent 协同工作</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              每个 Agent 专注于特定领域，通过智能协作完成复杂任务
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:border-violet-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agent.role}</p>
                      <p className="text-xs text-muted-foreground">{agent.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">技术架构</Badge>
            <h2 className="text-4xl font-bold mb-4">现代化的技术栈</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              基于业界最佳实践，构建可扩展、可观测的 Agent 平台
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-violet-400" />
                </div>
                前端技术栈
              </h3>
              <ul className="space-y-4">
                {[
                  { name: 'Next.js 15+ / React 19+', desc: 'App Router, Server Components' },
                  { name: 'TypeScript + Tailwind CSS', desc: '类型安全，原子化CSS' },
                  { name: 'shadcn/ui + Framer Motion', desc: '高质量组件库，流畅动画' },
                  { name: 'React Flow + Monaco Editor', desc: '可视化流程，代码编辑' },
                ].map((tech, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-sm text-muted-foreground">{tech.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-400" />
                </div>
                后端技术栈
              </h3>
              <ul className="space-y-4">
                {[
                  { name: 'FastAPI + LangGraph', desc: '高性能API，Agent编排' },
                  { name: 'PostgreSQL + pgvector', desc: '主数据库，向量检索' },
                  { name: 'Redis + Celery', desc: '缓存，异步任务队列' },
                  { name: 'Langfuse + Promptfoo', desc: '可观测性，评估框架' },
                ].map((tech, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-sm text-muted-foreground">{tech.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-500/5 to-background" />
        <div className="container mx-auto text-center max-w-3xl relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">准备好开始了吗？</h2>
          <p className="text-xl text-muted-foreground mb-10">
            体验从想法到可参赛项目的全流程自动化
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="primary" className="px-10" asChild>
              <Link href="/dashboard">
                立即体验
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-10" asChild>
              <a href="#features">了解更多</a>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>本地运行</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>一键启动</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>开箱即用</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="h-6 w-6 text-violet-500" />
                <span className="font-bold">智创工坊</span>
              </div>
              <p className="text-sm text-muted-foreground">
                面向 AI 创新竞赛和项目孵化的多智能体工程平台
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">平台</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">项目工作台</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">功能特性</Link></li>
                <li><Link href="#workflow" className="hover:text-foreground transition-colors">核心流程</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">技术</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#architecture" className="hover:text-foreground transition-colors">技术架构</Link></li>
                <li><Link href="#agents" className="hover:text-foreground transition-colors">智能体团队</Link></li>
                <li><a href="http://localhost:8000/docs" target="_blank" className="hover:text-foreground transition-colors">API 文档</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">资源</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">使用文档</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">反馈建议</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2024 智创工坊。保留所有权利。
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>v0.4.0</span>
              <span>•</span>
              <span>AI 辅助构建</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
