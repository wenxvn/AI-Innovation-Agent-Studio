'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/toaster'
import {
  Bot,
  MessageSquare,
  GitBranch,
  FileText,
  Database,
  Brain,
  Wrench,
  BarChart3,
  FolderOpen,
  Settings,
  ArrowLeft,
  Layers,
  Activity,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

const navItems = [
  { label: 'Overview', icon: FolderOpen, suffix: '' },
  { label: 'Chat', icon: MessageSquare, suffix: '/chat' },
  { label: 'Workflow', icon: GitBranch, suffix: '/workflow' },
  { label: 'Files', icon: FileText, suffix: '/files' },
  { label: 'Context', icon: Database, suffix: '/context' },
  { label: 'Memory', icon: Brain, suffix: '/memory' },
  { label: 'Skills', icon: Wrench, suffix: '/skills' },
  { label: 'Tools', icon: Wrench, suffix: '/tools' },
  { label: 'Evals', icon: BarChart3, suffix: '/evals' },
  { label: 'Outputs', icon: FileText, suffix: '/outputs' },
  { label: 'Settings', icon: Settings, suffix: '/settings' },
]

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const projectId = params.projectId as string

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: !!projectId,
  })

  const project = projectData?.data

  const isActive = (suffix: string) => {
    const base = `/projects/${projectId}`
    if (suffix === '') return pathname === base
    return pathname.startsWith(base + suffix)
  }

  const STAGE_LABELS: Record<string, string> = {
    ideation: '创意构思',
    research: '需求调研',
    architecture: '架构设计',
    development: '开发实现',
    testing: '测试验证',
    completed: '已完成',
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">返回</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-violet-500" />
              <span className="font-bold">智创工坊</span>
            </Link>
            {project && (
              <Badge variant="accent" className="ml-2">
                {STAGE_LABELS[project.current_stage] || project.current_stage}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">模型: GPT-4</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="hidden sm:inline">就绪</span>
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-53px)]">
        <aside className="w-52 border-r border-border/50 p-4 flex flex-col shrink-0 bg-card/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : project ? (
            <div className="mb-6">
              <h2 className="text-sm font-semibold truncate mb-1">
                {project.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {project.progress}% 完成
              </p>
              <div className="w-full bg-muted/30 rounded-full h-1.5 mt-2">
                <div
                  className="bg-violet-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <nav className="flex-1 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.suffix)
              const href = `/projects/${projectId}${item.suffix}`
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="pt-4 border-t border-border/50">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1"><Activity className="h-3 w-3" /> 运行记录</p>
              <p className="flex items-center gap-1"><FileText className="h-3 w-3" /> 生成产物</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        <aside className="w-72 border-l border-border/50 p-4 overflow-auto shrink-0 hidden xl:block bg-card/20">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Inspector</h3>
          {project ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">项目</p>
                <p className="text-sm font-medium truncate">{project.name}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">当前阶段</p>
                <p className="text-sm font-medium">{STAGE_LABELS[project.current_stage] || project.current_stage}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">技术栈</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.tech_stack?.map((tech, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">状态</p>
                <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                  {project.status === 'active' ? '进行中' : project.status}
                </Badge>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <p className="text-xs text-muted-foreground mb-1">目标</p>
                <p className="text-sm text-foreground/80">{project.goal || '未设定'}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          )}
        </aside>
      </div>
      <Toaster />
    </div>
  )
}
