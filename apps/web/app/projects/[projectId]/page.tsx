'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  GitBranch,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Workflow,
  Database,
  Code,
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

const STAGE_PROGRESS: Record<string, number> = {
  ideation: 10,
  research: 25,
  architecture: 40,
  development: 60,
  testing: 80,
  completed: 100,
}

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

  const completedRuns = runs.filter(r => r.status === 'completed').length
  const failedRuns = runs.filter(r => r.status === 'failed').length
  const successRate = runs.length > 0 ? ((completedRuns / runs.length) * 100).toFixed(0) : '0'

  const stageProgress = STAGE_PROGRESS[project?.current_stage || ''] || 0

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{project?.name || '项目概览'}</h1>
          <Badge variant={project?.status === 'active' ? 'success' : 'secondary'}>
            {project?.status === 'active' ? '进行中' : project?.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">{project?.description || ''}</p>
        {project?.goal && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            目标: {project.goal}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium">项目进度</span>
            </div>
            <Badge variant="accent">{STAGE_LABELS[project?.current_stage || ''] || project?.current_stage}</Badge>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-3 rounded-full transition-all"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>创意构思</span>
            <span>需求调研</span>
            <span>架构设计</span>
            <span>开发实现</span>
            <span>测试验证</span>
            <span>已完成</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 mx-auto text-violet-500 mb-2" />
            <p className="text-2xl font-bold">{runs.length}</p>
            <p className="text-xs text-muted-foreground">智能体运行</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{outputs.length}</p>
            <p className="text-xs text-muted-foreground">产物</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">平均评分</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Brain className="h-6 w-6 mx-auto text-cyan-500 mb-2" />
            <p className="text-2xl font-bold">{memories.length}</p>
            <p className="text-xs text-muted-foreground">记忆</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Database className="h-6 w-6 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{docs.length}</p>
            <p className="text-xs text-muted-foreground">文档</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{successRate}%</p>
            <p className="text-xs text-muted-foreground">成功率</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              项目信息
            </CardTitle>
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
              <span>{stageProgress}%</span>
            </div>
            {project?.tech_stack && project.tech_stack.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">技术栈</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack.map((tech, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              最近运行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无运行记录</p>
            ) : (
              <div className="space-y-2">
                {runs.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{run.user_input}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{run.selected_skill}</Badge>
                        <span className="text-[10px] text-muted-foreground">{run.latency_ms}ms</span>
                      </div>
                    </div>
                    <Badge
                      variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'}
                      className="text-xs shrink-0 ml-2"
                    >
                      {run.status === 'completed' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              最近产物
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outputs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无产物</p>
            ) : (
              <div className="space-y-2">
                {outputs.slice(0, 5).map((output) => (
                  <div key={output.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-violet-500" />
                      <div>
                        <p className="text-sm truncate">{output.title}</p>
                        <p className="text-[10px] text-muted-foreground">{output.output_type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">v{output.version}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={`/projects/${projectId}/chat`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-violet-500/10 transition-colors"
            >
              <Activity className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium">开始 Agent 对话</p>
                <p className="text-xs text-muted-foreground">输入需求，Agent 将执行任务</p>
              </div>
            </Link>
            <Link
              href={`/projects/${projectId}/files`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-blue-500/10 transition-colors"
            >
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">上传文档</p>
                <p className="text-xs text-muted-foreground">上传资料，构建知识库</p>
              </div>
            </Link>
            <Link
              href={`/projects/${projectId}/workflow`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-cyan-500/10 transition-colors"
            >
              <GitBranch className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-sm font-medium">查看工作流</p>
                <p className="text-xs text-muted-foreground">可视化 Agent 协作流程</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
