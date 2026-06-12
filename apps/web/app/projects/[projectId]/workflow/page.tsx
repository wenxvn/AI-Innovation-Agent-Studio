'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, FileText, Lightbulb, Loader2 } from 'lucide-react'

function getRunBadgeVariant(status?: string) {
  if (status === 'completed') return 'success' as const
  if (status === 'failed') return 'destructive' as const
  if (status === 'running' || status === 'planning' || status === 'generating' || status === 'evaluating') return 'warning' as const
  return 'secondary' as const
}

export default function WorkflowPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
  })

  const { data: workflowData, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflow-status', projectId],
    queryFn: () => api.workflow.getStatus(projectId),
    enabled: !!projectId,
    refetchInterval: 5000,
  })

  const runs = runsData?.data || []
  const workflowStatus = workflowData?.data
  const recentRun = workflowStatus?.recent_run
  const failedNodes = workflowStatus?.failed_nodes || []
  const currentNode = workflowStatus?.nodes.find((node) => node.stage_id === workflowStatus.current_stage)
  const nextNode = workflowStatus?.nodes.find((node) => node.stage_id === workflowStatus.next_stage)

  if (runsLoading || workflowLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">工作流</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Agent 运行会推进阶段、更新项目进度，并留下可追踪产物。
            </p>
          </div>
          {workflowStatus && (
            <div className="flex items-center gap-2">
              <Badge variant="accent">{workflowStatus.progress}%</Badge>
              <Badge variant={workflowStatus.status === 'needs_attention' ? 'destructive' : workflowStatus.status === 'running' ? 'warning' : 'secondary'}>
                {workflowStatus.status}
              </Badge>
            </div>
          )}
        </div>

        {workflowStatus && (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                最近运行
              </div>
              {recentRun ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRunBadgeVariant(recentRun.status)} className="text-[10px]">
                      {recentRun.status === 'completed' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                      {recentRun.status}
                    </Badge>
                    <span className="truncate text-sm font-medium">{recentRun.selected_skill || 'unknown skill'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentNode?.label || recentRun.stage_id || '未识别阶段'} · {recentRun.latency_ms}ms
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">暂无运行记录</p>
              )}
            </div>

            <div className="rounded-md border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                产物摘要
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-foreground">
                {recentRun?.output_summary || '完成 Agent Run 后会显示最近产物摘要。'}
              </p>
            </div>

            <div className="rounded-md border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                失败节点
              </div>
              {failedNodes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {failedNodes.map((node) => (
                    <Badge key={node.stage_id} variant="destructive" className="max-w-full truncate text-[10px]">
                      {node.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">暂无失败节点</p>
              )}
            </div>

            <div className="rounded-md border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                下一步建议
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-foreground">
                {workflowStatus.next_suggestion || (nextNode ? `建议继续执行 ${nextNode.label}` : '暂无建议')}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowCanvas projectId={projectId} runs={runs} workflowStatus={workflowStatus} />
      </div>
    </div>
  )
}
