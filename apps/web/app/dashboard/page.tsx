'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Code2,
  Database,
  FileArchive,
  FileText,
  FolderOpen,
  GitBranch,
  Layers,
  Loader2,
  MessageSquareText,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { api, type DashboardStats, type Project, type ProjectCreate } from '@/lib/api-client'

const BLUE = '#002FA7'

const STAGE_LABELS: Record<string, string> = {
  ideation: '创意构思',
  research: '需求调研',
  architecture: '架构设计',
  development: '开发实现',
  testing: '测试验证',
  completed: '已完成',
}

const MODULES = [
  { label: 'Agent 运行台', suffix: '/chat', icon: MessageSquareText, description: '运行任务、查看计划、上下文、工具调用和 Trace' },
  { label: '文件与 RAG', suffix: '/files', icon: FileText, description: '上传赛题、论文、政策和项目资料' },
  { label: 'Workflow', suffix: '/workflow', icon: GitBranch, description: '查看需求分析到答辩材料的阶段状态' },
  { label: 'Memory', suffix: '/memory', icon: Brain, description: '管理项目记忆、语义检索和上下文沉淀' },
  { label: 'Skills', suffix: '/skills', icon: Sparkles, description: '查看可用 Agent 技能和风险等级' },
  { label: 'Tools', suffix: '/tools', icon: Wrench, description: '审计工具注册、调用记录和审批状态' },
  { label: 'Prompts', suffix: '/prompts', icon: Code2, description: '管理系统提示词模板和变量' },
  { label: 'Evals', suffix: '/evals', icon: BarChart3, description: '运行质量评估并查看评分反馈' },
  { label: 'Outputs', suffix: '/outputs', icon: FileArchive, description: '预览 PRD、架构、代码和答辩材料' },
]

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCell({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="border-r border-b border-[#D7DADF] bg-white p-4 last:border-r-0">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-[#5C6674]">{label}</p>
        <Icon className="h-4 w-4 text-[#002FA7]" />
      </div>
      <p className="font-mono text-3xl font-semibold leading-none text-[#0C111D]">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status?: string }) {
  const active = status === 'active'
  const completed = status === 'completed'
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-[#002FA7] text-[#002FA7]'
          : completed
            ? 'border-emerald-600 text-emerald-700'
            : 'border-[#5C6674] text-[#5C6674]'
      }
    >
      {active ? '进行中' : completed ? '已完成' : '已归档'}
    </Badge>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ProjectCreate>({
    name: '',
    description: '',
    goal: '',
    tech_stack: [],
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    retry: 1,
  })

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.dashboard.stats(),
    retry: 1,
  })

  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: () => api.health(),
    refetchInterval: 10000,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => api.projects.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDialogOpen(false)
      setForm({ name: '', description: '', goal: '', tech_stack: [] })
      toast({ title: '项目创建成功', description: '已进入 Agent 运行台。', variant: 'success' })
      router.push(`/projects/${res.data.id}/chat`)
    },
    onError: (err: Error) => {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast({ title: '项目已删除', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  const projects = projectsQuery.data?.data || []
  const total = projectsQuery.data?.total || 0
  const stats = statsQuery.data?.data as DashboardStats | undefined
  const firstProject = projects[0]
  const apiReady = healthQuery.data?.status === 'ok' || healthQuery.data?.status === 'degraded'
  const healthText = healthQuery.isError ? '无法连接' : apiReady ? healthQuery.data?.status : '检测中'

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: '请输入项目名称', variant: 'destructive' })
      return
    }
    createMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || '',
      goal: form.goal?.trim() || '',
    })
  }

  const openCreateDialog = () => setDialogOpen(true)

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#0C111D]">
      <header className="border-b border-[#D7DADF] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#0C111D] bg-white">
                <Bot className="h-5 w-5" style={{ color: BLUE }} />
              </div>
              <div>
                <p className="text-lg font-semibold leading-none">智创工坊</p>
                <p className="mt-1 text-xs text-[#5C6674]">AI Innovation Agent Studio</p>
              </div>
            </Link>
            <div className="hidden h-10 border-l border-[#D7DADF] md:block" />
            <div className="hidden md:block">
              <p className="text-xs uppercase text-[#5C6674]">Workspace</p>
              <p className="text-sm font-medium">Agent 工程控制台</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-9 rounded-lg border-[#D7DADF] bg-white px-3 text-[#0C111D]">
              API：{healthText}
            </Badge>
            <Button
              variant="outline"
              className="h-9 rounded-lg border-[#D7DADF] bg-white"
              onClick={() => {
                healthQuery.refetch()
                projectsQuery.refetch()
                statsQuery.refetch()
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            <ThemeToggle />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-lg bg-[#002FA7] text-white hover:bg-[#001F73]">
                  <Plus className="mr-2 h-4 w-4" />
                  新建项目
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg">
                <DialogHeader>
                  <DialogTitle>新建项目</DialogTitle>
                  <DialogDescription>创建后会直接进入 Agent 运行台。</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">项目名称 *</Label>
                    <Input
                      id="name"
                      placeholder="例如：高校 AI 创新竞赛项目"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">项目描述</Label>
                    <Textarea
                      id="description"
                      placeholder="项目要解决的问题、目标用户或赛题背景"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal">项目目标</Label>
                    <Textarea
                      id="goal"
                      placeholder="希望 Agent 产出的材料或原型范围"
                      value={form.goal}
                      onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    className="bg-[#002FA7] text-white hover:bg-[#001F73]"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    创建并进入
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
        <section className="space-y-6">
          <div className="grid border-l border-t border-[#D7DADF] bg-white md:grid-cols-4">
            <StatCell label="项目" value={stats ? stats.project_count : total} icon={FolderOpen} />
            <StatCell label="Agent Run" value={statsQuery.isLoading ? '-' : stats?.agent_run_count ?? 0} icon={Activity} />
            <StatCell label="产物" value={statsQuery.isLoading ? '-' : stats?.output_count ?? 0} icon={FileArchive} />
            <StatCell label="平均评分" value={stats && stats.avg_score > 0 ? stats.avg_score : '-'} icon={BarChart3} />
          </div>

          {projectsQuery.error && (
            <Card className="rounded-lg border-[#E5484D] bg-white">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-[#B42318]">项目列表无法加载</p>
                  <p className="mt-1 text-sm text-[#5C6674]">
                    请确认 `AI Studio API` 窗口已启动并能访问 http://localhost:8000/health。
                  </p>
                  <p className="mt-1 text-xs text-[#5C6674]">{(projectsQuery.error as Error).message}</p>
                </div>
                <Button variant="outline" className="rounded-lg" onClick={() => projectsQuery.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-lg border-[#D7DADF] bg-white shadow-none">
            <CardHeader className="border-b border-[#D7DADF] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-sm text-[#002FA7]">01</p>
                  <CardTitle className="mt-2 text-2xl font-semibold tracking-normal">项目工作台</CardTitle>
                  <p className="mt-2 text-sm text-[#5C6674]">
                    选择一个项目进入完整链路：文件、运行、工作流、记忆、工具、评估和产物。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-lg border-[#D7DADF] text-[#5C6674]">
                    共 {total} 个项目
                  </Badge>
                  {firstProject && (
                    <Button className="rounded-lg bg-[#002FA7] text-white hover:bg-[#001F73]" asChild>
                      <Link href={`/projects/${firstProject.id}/chat`}>
                        进入运行台
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {projectsQuery.isLoading && (
                <div className="flex min-h-64 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#002FA7]" />
                </div>
              )}

              {!projectsQuery.isLoading && !projectsQuery.error && projects.length === 0 && (
                <div className="grid gap-0 md:grid-cols-[1fr_320px]">
                  <div className="border-b border-[#D7DADF] p-8 md:border-b-0 md:border-r">
                    <p className="font-mono text-5xl font-semibold text-[#002FA7]">00</p>
                    <h2 className="mt-6 text-2xl font-semibold">还没有项目</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#5C6674]">
                      先创建一个项目，再上传资料或直接让 Agent 生成项目方向。新项目会进入 Agent 运行台，
                      方便你马上看到计划、上下文、工具调用和 Trace。
                    </p>
                    <Button className="mt-6 rounded-lg bg-[#002FA7] text-white hover:bg-[#001F73]" onClick={openCreateDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      创建第一个项目
                    </Button>
                  </div>
                  <div className="p-8">
                    <p className="text-sm font-medium">MVP 演示路径</p>
                    <div className="mt-5 space-y-4 text-sm text-[#5C6674]">
                      {['创建项目', '上传赛题或输入目标', '运行 Agent', '查看 Workflow / Trace / Outputs'].map((item, index) => (
                        <div key={item} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center border border-[#D7DADF] font-mono text-xs text-[#002FA7]">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!projectsQuery.isLoading && !projectsQuery.error && projects.length > 0 && (
                <div className="divide-y divide-[#D7DADF]">
                  {projects.map((project: Project, index) => (
                    <div key={project.id} className="grid gap-0 lg:grid-cols-[88px_1fr_220px]">
                      <div className="hidden border-r border-[#D7DADF] p-5 font-mono text-3xl text-[#002FA7] lg:block">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <Link href={`/projects/${project.id}/chat`} className="block p-5 transition-colors hover:bg-[#F7F7F8]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold">{project.name}</h3>
                              <StatusPill status={project.status} />
                            </div>
                            <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-[#5C6674]">
                              {project.description || project.goal || '暂无描述，可在项目设置中补充目标和背景。'}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#5C6674]">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5" />
                                {STAGE_LABELS[project.current_stage] || project.current_stage}
                              </span>
                              <span>更新于 {formatDate(project.updated_at)}</span>
                              {project.tech_stack?.slice(0, 4).map((tech) => (
                                <Badge key={tech} variant="outline" className="rounded-md border-[#D7DADF] text-[#5C6674]">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="min-w-[160px]">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="text-[#5C6674]">进度</span>
                              <span className="font-mono text-[#0C111D]">{project.progress}%</span>
                            </div>
                            <div className="h-2 border border-[#D7DADF] bg-white">
                              <div className="h-full bg-[#002FA7]" style={{ width: `${project.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center justify-between border-t border-[#D7DADF] p-5 lg:border-l lg:border-t-0">
                        <Button variant="outline" className="rounded-lg border-[#D7DADF] bg-white" asChild>
                          <Link href={`/projects/${project.id}/chat`}>
                            打开
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-[#5C6674] hover:text-[#B42318]"
                          title="删除项目"
                          onClick={() => {
                            if (confirm('确定删除此项目？')) {
                              deleteMutation.mutate(project.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="rounded-lg border-[#D7DADF] bg-white shadow-none">
            <CardHeader className="border-b border-[#D7DADF] p-5">
              <p className="font-mono text-sm text-[#002FA7]">02</p>
              <CardTitle className="mt-2 text-xl font-semibold">工程模块</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-0 p-0">
              {MODULES.map((item) => {
                const href = firstProject ? `/projects/${firstProject.id}${item.suffix}` : ''
                const Icon = item.icon
                const body = (
                  <div className="flex gap-4 border-b border-[#D7DADF] p-4 transition-colors hover:bg-[#F7F7F8]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#D7DADF]">
                      <Icon className="h-5 w-5 text-[#002FA7]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{item.label}</p>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#5C6674]" />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#5C6674]">{item.description}</p>
                    </div>
                  </div>
                )
                return firstProject ? (
                  <Link key={item.label} href={href} className="block">
                    {body}
                  </Link>
                ) : (
                  <button key={item.label} className="w-full text-left" onClick={openCreateDialog}>
                    {body}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[#D7DADF] bg-white shadow-none">
            <CardHeader className="border-b border-[#D7DADF] p-5">
              <p className="font-mono text-sm text-[#002FA7]">03</p>
              <CardTitle className="mt-2 text-xl font-semibold">运行与产物</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">最近 Agent Run</p>
                  <PlayCircle className="h-4 w-4 text-[#002FA7]" />
                </div>
                {stats?.recent_agent_runs?.length ? (
                  <div className="space-y-3">
                    {stats.recent_agent_runs.map((run) => (
                      <div key={run.id} className="border-l-2 border-[#002FA7] pl-3">
                        <p className="truncate text-sm font-medium">{run.selected_skill || run.agent_name}</p>
                        <p className="mt-1 text-xs text-[#5C6674]">{run.status} · {formatDate(run.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#5C6674]">暂无运行记录。进入 Agent 运行台后可以创建第一条 Run。</p>
                )}
              </div>

              <div className="border-t border-[#D7DADF] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">最近产物</p>
                  <FileArchive className="h-4 w-4 text-[#002FA7]" />
                </div>
                {stats?.recent_outputs?.length ? (
                  <div className="space-y-3">
                    {stats.recent_outputs.map((output) => (
                      <div key={output.id} className="border-l-2 border-[#D7DADF] pl-3">
                        <p className="truncate text-sm font-medium">{output.title}</p>
                        <p className="mt-1 text-xs text-[#5C6674]">{output.output_type} · {formatDate(output.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#5C6674]">暂无产物。Agent 生成的 PRD、架构和代码会出现在 Outputs。</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[#D7DADF] bg-white shadow-none">
            <CardContent className="grid grid-cols-2 gap-0 p-0">
              <div className="border-b border-r border-[#D7DADF] p-4">
                <Database className="mb-3 h-5 w-5 text-[#002FA7]" />
                <p className="text-xs text-[#5C6674]">Database</p>
                <p className="mt-1 text-sm font-medium">{healthQuery.data?.database || '-'}</p>
              </div>
              <div className="border-b border-[#D7DADF] p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-[#002FA7]" />
                <p className="text-xs text-[#5C6674]">Redis</p>
                <p className="mt-1 text-sm font-medium">{healthQuery.data?.redis || '-'}</p>
              </div>
              <div className="border-r border-[#D7DADF] p-4">
                <FileText className="mb-3 h-5 w-5 text-[#002FA7]" />
                <p className="text-xs text-[#5C6674]">Documents</p>
                <p className="mt-1 text-sm font-medium">{stats?.document_count ?? 0}</p>
              </div>
              <div className="p-4">
                <Brain className="mb-3 h-5 w-5 text-[#002FA7]" />
                <p className="text-xs text-[#5C6674]">Memory</p>
                <p className="mt-1 text-sm font-medium">{stats?.memory_count ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
