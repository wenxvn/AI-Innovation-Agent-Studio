'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import {
  Loader2,
  Activity,
  FileText,
  BarChart3,
  Layers,
  Clock,
  Brain,
  Zap,
} from 'lucide-react'

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: !!projectId,
  })

  const { data: runsData } = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
  })

  const { data: outputsData } = useQuery({
    queryKey: ['outputs', projectId],
    queryFn: () => api.outputs.list(projectId),
    enabled: !!projectId,
  })

  const { data: evalsData } = useQuery({
    queryKey: ['evaluations', projectId],
    queryFn: () => api.evals.list(projectId),
    enabled: !!projectId,
  })

  const { data: docsData } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.documents.list(projectId),
    enabled: !!projectId,
  })

  const { data: memData } = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => api.memory.list(projectId),
    enabled: !!projectId,
  })

  const project = projectData?.data
  const runs = runsData?.data || []
  const outputs = outputsData?.data || []
  const evals = evalsData?.data || []
  const docs = docsData?.data || []
  const memories = memData?.data || []

  const avgScore = evals.length > 0
    ? (evals.reduce((sum, e) => sum + e.score, 0) / evals.length).toFixed(1)
    : '-'

  const STAGE_LABELS: Record<string, string> = {
    ideation: '创意构思',
    research: '需求调研',
    architecture: '架构设计',
    development: '开发实现',
    testing: '测试验证',
    completed: '已完成',
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{project?.name || '项目概览'}</h1>
        <p className="text-muted-foreground">{project?.description || ''}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5 text-center">
            <Activity className="h-6 w-6 mx-auto text-violet-500 mb-2" />
            <p className="text-2xl font-bold">{runs.length}</p>
            <p className="text-xs text-muted-foreground">Agent Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <FileText className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{outputs.length}</p>
            <p className="text-xs text-muted-foreground">Outputs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Brain className="h-6 w-6 mx-auto text-cyan-500 mb-2" />
            <p className="text-2xl font-bold">{memories.length}</p>
            <p className="text-xs text-muted-foreground">Memories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">项目信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">状态</span>
              <Badge variant={project?.status === 'active' ? 'success' : 'secondary'}>{project?.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">阶段</span>
              <span>{STAGE_LABELS[project?.current_stage || ''] || project?.current_stage}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">文档</span>
              <span>{docs.length} 个文件</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">进度</span>
              <span>{project?.progress}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近运行</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无运行记录</p>
            ) : (
              <div className="space-y-2">
                {runs.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{run.user_input}</p>
                      <p className="text-xs text-muted-foreground">{run.selected_skill}</p>
                    </div>
                    <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'} className="text-xs shrink-0">
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
