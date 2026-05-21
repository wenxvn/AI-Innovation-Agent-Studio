'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type AgentRun, type TraceEvent } from '@/lib/api-client'
import {
  FileText,
  BarChart3,
  Database,
  Activity,
  Clock,
  Wrench,
} from 'lucide-react'

interface WorkflowInspectorProps {
  projectId: string
  nodeId: string
  nodeLabel: string
  run?: AgentRun
}

export function WorkflowInspector({ projectId, nodeId, nodeLabel, run }: WorkflowInspectorProps) {
  const { data: traceData } = useQuery({
    queryKey: ['run-trace', projectId, run?.id],
    queryFn: () => api.trace.listRunTrace(projectId, run!.id),
    enabled: !!projectId && !!run?.id,
  })

  const { data: toolCallsData } = useQuery({
    queryKey: ['tool-calls', projectId, run?.id],
    queryFn: () => api.tools.listCalls(projectId),
    enabled: !!projectId && !!run?.id,
  })

  const traceEvents = traceData?.data || []
  const toolCalls = (toolCallsData?.data || []).filter(tc => tc.agent_run_id === run?.id)

  if (!run) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">节点详情</h2>
          <p className="text-sm text-muted-foreground">{nodeLabel}</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">该节点尚未执行</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 overflow-auto max-h-full">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">节点详情</h2>
        <p className="text-sm text-muted-foreground">{nodeLabel}</p>
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">状态</span>
            <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'}>
              {run.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Agent</span>
            <span className="text-xs">{run.agent_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Skill</span>
            <Badge variant="secondary" className="text-xs">{run.selected_skill}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">耗时</span>
            <span className="text-xs">{run.latency_ms}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tokens</span>
            <span className="text-xs">{run.token_usage?.total_tokens || 0}</span>
          </div>
        </CardContent>
      </Card>

      {run.generated_output && (run.generated_output as Record<string, string>).title && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" />
              生成产物
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-sm font-medium">{String((run.generated_output as Record<string, string>).title)}</p>
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
              {String((run.generated_output as Record<string, string>).content || '').slice(0, 200)}
            </p>
          </CardContent>
        </Card>
      )}

      {run.eval_result && (run.eval_result as Record<string, unknown>).score !== undefined && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              评估结果
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{String((run.eval_result as Record<string, unknown>).score)}</span>
              <Badge variant={(run.eval_result as Record<string, unknown>).result === 'pass' ? 'success' : 'destructive'}>
                {String((run.eval_result as Record<string, unknown>).result)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {run.context_pack && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Database className="h-3 w-3" />
              Context Pack
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Memory: {(run.context_pack as { relevant_memory?: unknown[] }).relevant_memory?.length || 0} 条</p>
              <p>Evidence: {(run.context_pack as { retrieved_evidence?: unknown[] }).retrieved_evidence?.length || 0} 条</p>
            </div>
          </CardContent>
        </Card>
      )}

      {toolCalls.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Tool Calls ({toolCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1.5">
              {toolCalls.map((tc) => (
                <div key={tc.id} className="text-xs p-1.5 rounded bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tc.tool_name}</span>
                    <Badge variant={tc.status === 'completed' ? 'success' : tc.status === 'failed' ? 'destructive' : 'secondary'} className="text-[9px] px-1 py-0">
                      {tc.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{tc.latency_ms}ms</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {traceEvents.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Trace Timeline ({traceEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1 max-h-48 overflow-auto">
              {traceEvents.map((event: TraceEvent) => (
                <div key={event.id} className="text-xs p-1.5 rounded bg-muted/10">
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] px-1 py-0 ${event.status === 'success' ? 'bg-success/20 text-success' : event.status === 'error' ? 'bg-error/20 text-error' : 'bg-blue-500/20 text-blue-500'}`}>
                      {event.event_type}
                    </Badge>
                    {event.latency_ms > 0 && (
                      <span className="text-muted-foreground">{event.latency_ms}ms</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5">{event.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {run.error_message && (
        <Card className="border-error/30">
          <CardContent className="p-3">
            <p className="text-xs text-error">{run.error_message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
