'use client'

import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { RuntimeDiagnosticsCard } from '@/components/runtime-diagnostics-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type ProviderRuntimeStatus } from '@/lib/api-client'
import {
  Loader2,
  Save,
  Settings,
  Brain,
  Database,
  Server,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react'

function readinessLabel(status: ProviderRuntimeStatus) {
  if (status.configured && status.mode === 'real') return '真实模式'
  if (status.missing_env_vars.length > 0) return '缺失配置'
  return 'Mock fallback'
}

function readinessVariant(status: ProviderRuntimeStatus): 'success' | 'destructive' | 'warning' {
  if (status.configured && status.mode === 'real') return 'success'
  if (status.missing_env_vars.length > 0) return 'destructive'
  return 'warning'
}

function baseUrlLabel(status: ProviderRuntimeStatus) {
  if (!status.supports_custom_base_url) return '不适用'
  return status.base_url_custom ? '已自定义' : '默认'
}

function ProviderReadinessPanel({
  title,
  status,
  icon: Icon,
  iconClassName,
}: {
  title: string
  status: ProviderRuntimeStatus
  icon: ComponentType<{ className?: string }>
  iconClassName: string
}) {
  const missingEnv = status.missing_env_vars
  const requiredEnv = status.required_env_vars
  const isReal = status.configured && status.mode === 'real'

  return (
    <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconClassName}`} />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              当前实际使用 {status.active_provider}/{status.active_model}
            </p>
          </div>
        </div>
        <Badge variant={readinessVariant(status)}>{readinessLabel(status)}</Badge>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-md border border-border/30 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">实际 Provider / Model</p>
          <p className="mt-1 break-words font-medium">{status.active_provider} / {status.active_model}</p>
        </div>
        <div className="rounded-md border border-border/30 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">目标配置 Provider / Model</p>
          <p className="mt-1 break-words font-medium">{status.provider} / {status.model}</p>
        </div>
        <div className="rounded-md border border-border/30 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Base URL</p>
          <p className="mt-1 font-medium">{baseUrlLabel(status)}</p>
        </div>
        <div className="rounded-md border border-border/30 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">必需环境变量</p>
          <p className="mt-1 font-mono text-xs">
            {requiredEnv.length ? requiredEnv.join(', ') : '无'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {missingEnv.length > 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-error/20 bg-error/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
            <div>
              <p className="text-sm font-medium text-error">缺失环境变量</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{missingEnv.join(', ')}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className={`h-4 w-4 ${isReal ? 'text-success' : 'text-warning'}`} />
            <span>{isReal ? '真实 provider 已就绪' : '没有缺失的必需变量，当前仍使用 mock。'}</span>
          </div>
        )}

        {status.fallback_reason && (
          <div className="flex items-start gap-3 rounded-md border border-warning/20 bg-warning/10 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs leading-5 text-muted-foreground">{status.fallback_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

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

  const runtimeQuery = useQuery({
    queryKey: ['runtime-status'],
    queryFn: () => api.runtime.status(),
  })

  const project = projectData?.data
  const runtime = runtimeQuery.data?.data

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
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">项目配置和运行时状态</p>
      </div>

      <div className="space-y-6">
        <RuntimeDiagnosticsCard
          runtime={runtime}
          isLoading={runtimeQuery.isLoading}
          isFetching={runtimeQuery.isFetching}
          isError={runtimeQuery.isError}
          onRefresh={() => runtimeQuery.refetch()}
        />

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-500" />
                  运行时状态
                </CardTitle>
                <CardDescription>LLM 和 Embedding 服务的真实模式、mock fallback 和缺失配置</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => runtimeQuery.refetch()} disabled={runtimeQuery.isFetching}>
                {runtimeQuery.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runtimeQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : runtime ? (
              <div className="space-y-4">
                <ProviderReadinessPanel
                  title="LLM 服务"
                  status={runtime.llm}
                  icon={Brain}
                  iconClassName="text-violet-500"
                />
                <ProviderReadinessPanel
                  title="Embedding 服务"
                  status={runtime.embedding}
                  icon={Database}
                  iconClassName="text-blue-500"
                />

                <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Key className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
                    <div>
                      <p className="mb-1 text-sm font-medium text-violet-400">密钥显示策略</p>
                      <p className="text-xs text-muted-foreground">
                        页面只显示环境变量名称和缺失状态，不显示任何 API Key 值。
                      </p>
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
