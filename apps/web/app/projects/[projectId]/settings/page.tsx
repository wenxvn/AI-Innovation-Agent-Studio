'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type Project } from '@/lib/api-client'
import {
  Loader2,
  Save,
  Settings,
  Brain,
  Database,
  Server,
  Shield,
  Key,
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  Info,
} from 'lucide-react'

export default function SettingsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [techStack, setTechStack] = useState('')

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: !!projectId,
  })

  const { data: runtimeData, isLoading: runtimeLoading } = useQuery({
    queryKey: ['runtime-status'],
    queryFn: () => api.runtime.status(),
  })

  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['runtime-providers'],
    queryFn: () => api.runtime.providers(),
  })

  const project = projectData?.data
  const runtime = runtimeData?.data
  const providers = providersData?.data

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setGoal(project.goal || '')
      setTechStack((project.tech_stack || []).join(', '))
    }
  }, [project])

  const updateMutation = useMutation({
    mutationFn: () => {
      const techStackArray = techStack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return api.projects.update(projectId, {
        name,
        description,
        goal,
        tech_stack: techStackArray,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast({ title: '设置已保存', variant: 'success' })
    },
    onError: (error: Error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: '项目名称不能为空', variant: 'destructive' })
      return
    }
    updateMutation.mutate()
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">项目配置和运行时状态</p>
      </div>

      <div className="space-y-6">
        {/* Project Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-violet-500" />
              项目设置
            </CardTitle>
            <CardDescription>项目的基本信息和配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">项目名称 *</label>
              <Input
                placeholder="输入项目名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">项目描述</label>
              <Textarea
                placeholder="描述项目的目标和范围"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">项目目标</label>
              <Textarea
                placeholder="项目的主要目标和预期成果"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">技术栈</label>
              <Input
                placeholder="Python, FastAPI, Next.js (逗号分隔)"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">多个技术栈请用逗号分隔</p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存设置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Runtime Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              运行时状态
            </CardTitle>
            <CardDescription>LLM 和 Embedding 服务的配置状态</CardDescription>
          </CardHeader>
          <CardContent>
            {runtimeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : runtime ? (
              <div className="space-y-4">
                {/* LLM Status */}
                <div className="p-4 rounded-lg border border-border/30 bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-violet-500" />
                      <p className="font-medium">LLM 服务</p>
                    </div>
                    <Badge variant={runtime.llm.configured ? 'success' : 'warning'}>
                      {runtime.llm.configured ? '已配置' : '未配置'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Provider</p>
                      <p className="font-medium">{runtime.llm.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="font-medium">{runtime.llm.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mode</p>
                      <Badge variant={runtime.llm.mode === 'real' ? 'success' : 'secondary'}>
                        {runtime.llm.mode}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Embedding Status */}
                <div className="p-4 rounded-lg border border-border/30 bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      <p className="font-medium">Embedding 服务</p>
                    </div>
                    <Badge variant={runtime.embedding.configured ? 'success' : 'warning'}>
                      {runtime.embedding.configured ? '已配置' : '未配置'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Provider</p>
                      <p className="font-medium">{runtime.embedding.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="font-medium">{runtime.embedding.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mode</p>
                      <Badge variant={runtime.embedding.mode === 'real' ? 'success' : 'secondary'}>
                        {runtime.embedding.mode}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-violet-400 mb-1">配置说明</p>
                      <p className="text-xs text-muted-foreground">
                        要使用真实的 LLM 服务，请在项目根目录的 <code className="px-1 py-0.5 rounded bg-muted/20 font-mono">.env</code> 文件中配置 API Key。
                        当前为 <Badge variant="secondary" className="text-[10px] mx-1">{runtime.llm.mode}</Badge> 模式。
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p><code className="px-1 py-0.5 rounded bg-muted/20 font-mono">LLM_PROVIDER=openai</code></p>
                        <p><code className="px-1 py-0.5 rounded bg-muted/20 font-mono">LLM_MODEL=gpt-4o-mini</code></p>
                        <p><code className="px-1 py-0.5 rounded bg-muted/20 font-mono">OPENAI_API_KEY=sk-xxx</code></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">无法获取运行时状态</p>
            )}
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" />
              环境信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-muted-foreground">项目 ID</p>
                <p className="font-mono text-xs mt-1">{projectId}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-muted-foreground">项目状态</p>
                <Badge variant={project?.status === 'active' ? 'success' : 'secondary'}>
                  {project?.status}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-muted-foreground">当前阶段</p>
                <p className="font-medium">{project?.current_stage || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/10">
                <p className="text-muted-foreground">创建时间</p>
                <p className="font-medium">{project?.created_at ? new Date(project.created_at).toLocaleString('zh-CN') : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
