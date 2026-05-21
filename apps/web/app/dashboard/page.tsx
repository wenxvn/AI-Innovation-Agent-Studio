'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from '@/components/ui/use-toast'
import { api, type Project, type ProjectCreate } from '@/lib/api-client'
import {
  Plus,
  FolderOpen,
  Clock,
  Activity,
  FileText,
  BarChart3,
  ArrowRight,
  Bot,
  Layers,
  Zap,
  Trash2,
  Loader2,
  FolderPlus,
} from 'lucide-react'
import Link from 'next/link'

const STAGE_LABELS: Record<string, string> = {
  ideation: '创意构思',
  research: '需求调研',
  architecture: '架构设计',
  development: '开发实现',
  testing: '测试验证',
  completed: '已完成',
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ProjectCreate>({
    name: '',
    description: '',
    goal: '',
    tech_stack: [],
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDialogOpen(false)
      setForm({ name: '', description: '', goal: '', tech_stack: [] })
      toast({ title: '项目创建成功', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: '项目已删除', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  const projects = data?.data || []
  const total = data?.total || 0

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: '请输入项目名称', variant: 'destructive' })
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-violet-500" />
              <span className="text-xl font-bold">智创工坊</span>
            </Link>
            <Badge variant="accent">Dashboard</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  新建项目
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建项目</DialogTitle>
                  <DialogDescription>创建一个新的 AI 创新项目</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">项目名称 *</Label>
                    <Input
                      id="name"
                      placeholder="输入项目名称"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">项目描述</Label>
                    <Textarea
                      id="description"
                      placeholder="简要描述项目"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal">项目目标</Label>
                    <Textarea
                      id="goal"
                      placeholder="项目要达成什么目标"
                      value={form.goal}
                      onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                  <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    创建项目
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">欢迎回来</h1>
          <p className="text-muted-foreground">
            管理你的 AI 项目，查看 Agent 运行状态和生成产物
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">项目总数</p>
                  <p className="text-3xl font-bold">{total}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-violet-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent 运行</p>
                  <p className="text-3xl font-bold">-</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">生成产物</p>
                  <p className="text-3xl font-bold">-</p>
                </div>
                <FileText className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均评分</p>
                  <p className="text-3xl font-bold">-</p>
                </div>
                <BarChart3 className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">项目列表</h2>
            <span className="text-sm text-muted-foreground">共 {total} 个项目</span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          )}

          {error && (
            <Card className="border-error/30">
              <CardContent className="p-6 text-center">
                <p className="text-error mb-2">加载失败</p>
                <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && projects.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderPlus className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
                <p className="text-muted-foreground mb-4">创建你的第一个 AI 创新项目开始探索</p>
                <Button variant="primary" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建项目
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:border-violet-500/30 transition-colors group">
                  <Link href={`/projects/${project.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1 truncate">{project.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description || '暂无描述'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            project.status === 'active' ? 'success' :
                            project.status === 'completed' ? 'info' : 'secondary'
                          }
                          className="ml-2 shrink-0"
                        >
                          {project.status === 'active' ? '进行中' :
                           project.status === 'completed' ? '已完成' : '已归档'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Layers className="h-4 w-4" />
                          {STAGE_LABELS[project.current_stage] || project.current_stage}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      {project.tech_stack && project.tech_stack.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {project.tech_stack.slice(0, 5).map((tech, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                          {project.tech_stack.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{project.tech_stack.length - 5}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted/30 rounded-full h-2 w-32">
                            <div
                              className="bg-violet-500 h-2 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{project.progress}%</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-error"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (confirm('确定删除此项目？')) {
                                deleteMutation.mutate(project.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
