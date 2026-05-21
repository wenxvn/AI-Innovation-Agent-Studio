'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type AgentRun, type TraceEvent } from '@/lib/api-client'
import {
  Loader2,
  GitBranch,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowDown,
  Brain,
  Search,
  FileText,
  Code,
  Bug,
  Mic,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Database,
  Wrench,
} from 'lucide-react'

const WORKFLOW_NODES = [
  { id: 'start', label: 'Start', icon: GitBranch, agent: '' },
  { id: 'competition-analyzer', label: '竞赛分析', icon: Search, agent: 'Research Agent' },
  { id: 'idea-generator', label: '创意生成', icon: Brain, agent: 'Product Agent' },
  { id: 'prd-writer', label: 'PRD 撰写', icon: FileText, agent: 'Product Agent' },
  { id: 'architecture-designer', label: '架构设计', icon: Settings, agent: 'Architecture Agent' },
  { id: 'research-synthesizer', label: '调研综合', icon: Search, agent: 'Research Agent' },
  { id: 'fastapi-generator', label: '后端生成', icon: Code, agent: 'Coding Agent' },
  { id: 'nextjs-generator', label: '前端生成', icon: Code, agent: 'Coding Agent' },
  { id: 'qa-debugger', label: 'QA 调试', icon: Bug, agent: 'QA Agent' },
  { id: 'pitch-writer', label: '答辩撰写', icon: Mic, agent: 'Pitch Agent' },
  { id: 'end', label: 'End', icon: CheckCircle2, agent: '' },
]

export default function WorkflowPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
  })

  const runs = runsData?.data || []

  const runBySkill = new Map<string, AgentRun>()
  runs.forEach((run) => {
    if (run.selected_skill && !runBySkill.has(run.selected_skill)) {
      runBySkill.set(run.selected_skill, run)
    }
  })

  const selectedRun = selectedNode ? runBySkill.get(selectedNode) : null

  const { data: traceData } = useQuery({
    queryKey: ['run-trace', projectId, selectedRun?.id],
    queryFn: () => api.trace.listRunTrace(projectId, selectedRun!.id),
    enabled: !!projectId && !!selectedRun?.id,
  })

  const traceEvents = traceData?.data || []

  const getNodeStatus = (nodeId: string): 'pending' | 'running' | 'success' | 'failed' => {
    const run = runBySkill.get(nodeId)
    if (!run) return 'pending'
    if (run.status === 'completed') return 'success'
    if (run.status === 'failed') return 'failed'
    return 'running'
  }

  const STATUS_STYLE: Record<string, { bg: string; border: string; icon: React.ElementType }> = {
    pending: { bg: 'bg-muted/20', border: 'border-border/50', icon: Clock },
    running: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Loader2 },
    success: { bg: 'bg-success/10', border: 'border-success/30', icon: CheckCircle2 },
    failed: { bg: 'bg-error/10', border: 'border-error/30', icon: AlertCircle },
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Workflow</h1>
          <p className="text-sm text-muted-foreground mt-1">Agent 工作流执行状态 - 点击节点查看详情</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {WORKFLOW_NODES.map((node, index) => {
              const status = getNodeStatus(node.id)
              const style = STATUS_STYLE[status]
              const Icon = node.icon
              const StatusIcon = style.icon
              const run = runBySkill.get(node.id)
              const isSelected = selectedNode === node.id

              return (
                <div key={node.id} className="flex flex-col items-center">
                  <Card
                    className={`w-full max-w-2xl cursor-pointer transition-all ${style.border} ${style.bg} ${isSelected ? 'ring-2 ring-violet-500' : ''}`}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                          <p className="font-medium">{node.label}</p>
                          {node.agent && <p className="text-xs text-muted-foreground">{node.agent}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {run && (
                          <div className="text-xs text-muted-foreground text-right">
                            <p>{run.token_usage?.total_tokens || 0} tokens</p>
                            <p>{run.latency_ms}ms</p>
                          </div>
                        )}
                        <Badge
                          variant={status === 'success' ? 'success' : status === 'failed' ? 'destructive' : status === 'running' ? 'warning' : 'secondary'}
                        >
                          <StatusIcon className={`h-3 w-3 mr-1 ${status === 'running' ? 'animate-spin' : ''}`} />
                          {status === 'pending' ? '待执行' : status === 'running' ? '执行中' : status === 'success' ? '已完成' : '失败'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  {index < WORKFLOW_NODES.length - 1 && (
                    <ArrowDown className="h-5 w-5 text-muted-foreground/30 my-1" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="w-96 border-l border-border/50 p-4 overflow-auto bg-card/50">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">节点详情</h2>
            <p className="text-sm text-muted-foreground">{WORKFLOW_NODES.find(n => n.id === selectedNode)?.label}</p>
          </div>

          {selectedRun ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">状态</span>
                    <Badge variant={selectedRun.status === 'completed' ? 'success' : selectedRun.status === 'failed' ? 'destructive' : 'warning'}>
                      {selectedRun.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Agent</span>
                    <span className="text-xs">{selectedRun.agent_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Skill</span>
                    <Badge variant="secondary" className="text-xs">{selectedRun.selected_skill}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">耗时</span>
                    <span className="text-xs">{selectedRun.latency_ms}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tokens</span>
                    <span className="text-xs">{selectedRun.token_usage?.total_tokens || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {selectedRun.generated_output && (selectedRun.generated_output as Record<string, string>).title && (
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      生成产物
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-sm font-medium">{String((selectedRun.generated_output as Record<string, string>).title)}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                      {String((selectedRun.generated_output as Record<string, string>).content || '').slice(0, 200)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedRun.eval_result && (selectedRun.eval_result as Record<string, unknown>).score !== undefined && (
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      评估结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{String((selectedRun.eval_result as Record<string, unknown>).score)}</span>
                      <Badge variant={(selectedRun.eval_result as Record<string, unknown>).result === 'pass' ? 'success' : 'destructive'}>
                        {String((selectedRun.eval_result as Record<string, unknown>).result)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedRun.context_pack && (
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Context Pack
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Memory: {(selectedRun.context_pack as { relevant_memory?: unknown[] }).relevant_memory?.length || 0} 条</p>
                      <p>Evidence: {(selectedRun.context_pack as { retrieved_evidence?: unknown[] }).retrieved_evidence?.length || 0} 条</p>
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

              {selectedRun.error_message && (
                <Card className="border-error/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-error">{selectedRun.error_message}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">该节点尚未执行</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
