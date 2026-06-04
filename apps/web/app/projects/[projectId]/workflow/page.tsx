'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas'
import { Loader2 } from 'lucide-react'

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
        <h1 className="text-2xl font-bold">工作流</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agent 工作流可视化 - 点击节点查看详情
          {workflowStatus && (
            <span className="ml-2">
              · 阶段: {workflowStatus.current_stage} · 状态: {workflowStatus.status}
            </span>
          )}
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowCanvas projectId={projectId} runs={runs} workflowStatus={workflowStatus} />
      </div>
    </div>
  )
}
