'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { api, type AgentRun, type TraceEvent } from '@/lib/api-client'
import {
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  Wrench,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  Database,
  Shield,
  Sparkles,
} from 'lucide-react'

const SUGGESTED_ACTIONS = [
  '分析这个比赛的赛题要求',
  '生成项目方向和 PRD 大纲',
  '设计系统架构',
  '撰写答辩稿',
]

export default function ChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [showTrace, setShowTrace] = useState<string | null>(null)

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
  })

  const { data: traceData } = useQuery({
    queryKey: ['run-trace', projectId, showTrace],
    queryFn: () => api.trace.listRunTrace(projectId, showTrace!),
    enabled: !!projectId && !!showTrace,
  })

  const runMutation = useMutation({
    mutationFn: (user_input: string) =>
      api.agents.run(projectId, { user_input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs', projectId] })
      setInput('')
      toast({ title: 'Agent 运行完成', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '运行失败', description: err.message, variant: 'destructive' })
    },
  })

  const runs = runsData?.data || []
  const traceEvents = traceData?.data || []

  const handleSubmit = () => {
    if (!input.trim()) return
    runMutation.mutate(input.trim())
  }

  const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    completed: { icon: CheckCircle2, color: 'text-success', label: '完成' },
    failed: { icon: AlertCircle, color: 'text-error', label: '失败' },
    running: { icon: Loader2, color: 'text-blue-500', label: '运行中' },
    planning: { icon: Brain, color: 'text-violet-500', label: '规划中' },
    retrieving_context: { icon: Zap, color: 'text-yellow-500', label: '检索中' },
    generating: { icon: Loader2, color: 'text-blue-500', label: '生成中' },
    evaluating: { icon: BarChart3, color: 'text-orange-500', label: '评估中' },
    waiting_approval: { icon: Clock, color: 'text-yellow-500', label: '待审批' },
    idle: { icon: Clock, color: 'text-muted-foreground', label: '空闲' },
  }

  const TRACE_STATUS_COLORS: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-500',
    success: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
    warning: 'bg-yellow-500/20 text-yellow-500',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h1 className="text-lg font-semibold">Agent Chat</h1>
        <p className="text-sm text-muted-foreground">输入需求，Agent 将分析并生成结构化产物</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        )}

        {!isLoading && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">开始对话</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              输入你的需求或想法，Agent 将选择合适的技能来执行任务
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_ACTIONS.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInput(action)
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {runs.map((run) => {
          const statusConfig = STATUS_CONFIG[run.status] || STATUS_CONFIG.idle
          const StatusIcon = statusConfig.icon
          const isExpanded = expandedRun === run.id
          const output = run.generated_output as Record<string, string>
          const evalResult = run.eval_result as Record<string, string | number | Record<string, number>>
          const contextPack = run.context_pack as { relevant_memory?: {content: string}[]; retrieved_evidence?: {content: string; score?: number; excerpt?: string}[] } | null

          return (
            <Card key={run.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm">{run.user_input}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(run.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 ml-4">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="accent" className="text-xs">{run.agent_name}</Badge>
                      {run.selected_skill && (
                        <Badge variant="secondary" className="text-xs">
                          <Wrench className="h-3 w-3 mr-1" />
                          {run.selected_skill}
                        </Badge>
                      )}
                      <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'} className="text-xs">
                        <StatusIcon className={`h-3 w-3 mr-1 ${run.status === 'running' || run.status === 'generating' || run.status === 'planning' ? 'animate-spin' : ''} ${statusConfig.color}`} />
                        {statusConfig.label}
                      </Badge>
                      {output?.mode && (
                        <Badge variant={output.mode === 'mock' ? 'warning' : 'success'} className="text-xs">
                          <Database className="h-3 w-3 mr-1" />
                          {output.mode === 'mock' ? 'Mock 模式' : '真实 LLM'}
                        </Badge>
                      )}
                      {output?.provider && output.provider !== 'mock' && (
                        <Badge variant="outline" className="text-xs">
                          {output.provider}/{output.model}
                        </Badge>
                      )}
                    </div>

                    {run.plan && run.plan.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1">执行计划：</p>
                        <div className="flex flex-wrap gap-1">
                          {run.plan.map((step: { step: number; action: string; status: string }, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {step.step}. {step.action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {contextPack?.retrieved_evidence && contextPack.retrieved_evidence.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          <Database className="h-3 w-3 inline mr-1" />
                          检索到 {contextPack.retrieved_evidence.length} 条证据
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {contextPack.retrieved_evidence.slice(0, 3).map((e, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              证据 {i + 1} {e.score ? `(相似度: ${(e.score * 100).toFixed(0)}%)` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {output && output.title && (
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30 mb-2">
                        <p className="text-sm font-medium mb-1">{String(output.title)}</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {String(output.content || '').slice(0, 200)}
                        </p>
                      </div>
                    )}

                    {evalResult && evalResult.score !== undefined && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          评分: {String(evalResult.score)}
                        </span>
                        {evalResult.result && (
                          <Badge variant={evalResult.result === 'pass' ? 'success' : 'destructive'} className="text-xs">
                            {String(evalResult.result)}
                          </Badge>
                        )}
                        {evalResult.mode && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            {String(evalResult.mode)}
                          </Badge>
                        )}
                      </div>
                    )}

                    {run.error_message && (
                      <div className="p-2 rounded bg-error/10 border border-error/30 mb-2">
                        <p className="text-xs text-error">{run.error_message}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                        详情
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setShowTrace(showTrace === run.id ? null : run.id)}
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        Trace
                      </Button>
                      {run.token_usage && (
                        <span className="text-xs text-muted-foreground">
                          {run.token_usage.total_tokens || 0} tokens · {run.latency_ms}ms · ${(run.cost || 0).toFixed(4)}
                        </span>
                      )}
                    </div>

                    {showTrace === run.id && traceEvents.length > 0 && (
                      <div className="mt-3 border-t border-border/30 pt-3">
                        <p className="text-xs font-semibold mb-2">
                          <Activity className="h-3 w-3 inline mr-1" />
                          Trace Timeline ({traceEvents.length} events)
                        </p>
                        <div className="space-y-1">
                          {traceEvents.map((event: TraceEvent) => (
                            <div key={event.id} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/10">
                              <Badge className={`text-[10px] px-1 py-0 ${TRACE_STATUS_COLORS[event.status] || 'bg-muted text-muted-foreground'}`}>
                                {event.event_type}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{event.title}</span>
                                {event.message && (
                                  <span className="text-muted-foreground ml-1">- {event.message}</span>
                                )}
                              </div>
                              {event.latency_ms > 0 && (
                                <span className="text-muted-foreground shrink-0">{event.latency_ms}ms</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
                        {contextPack?.relevant_memory && contextPack.relevant_memory.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1">相关 Memory</p>
                            <div className="space-y-1">
                              {contextPack.relevant_memory.map((m, i) => (
                                <p key={i} className="text-xs text-muted-foreground p-2 rounded bg-muted/10">{m.content}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        {contextPack?.retrieved_evidence && contextPack.retrieved_evidence.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1">检索证据</p>
                            <div className="space-y-1">
                              {contextPack.retrieved_evidence.map((e, i) => (
                                <div key={i} className="text-xs text-muted-foreground p-2 rounded bg-muted/10">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px]">证据 {i + 1}</Badge>
                                    {e.score && <span className="text-[10px]">相似度: {(e.score * 100).toFixed(1)}%</span>}
                                  </div>
                                  <p className="line-clamp-2">{e.excerpt || e.content?.slice(0, 200)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {output && output.content && (
                          <div>
                            <p className="text-xs font-semibold mb-1">完整输出</p>
                            <pre className="text-xs text-muted-foreground p-3 rounded bg-muted/10 whitespace-pre-wrap max-h-64 overflow-auto">
                              {String(output.content)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="p-4 border-t border-border/50 bg-card/50">
        <div className="flex gap-2">
          <Textarea
            placeholder="输入你的需求，例如：分析这个比赛的赛题要求"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            rows={2}
            className="resize-none"
          />
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={runMutation.isPending || !input.trim()}
            className="shrink-0"
          >
            {runMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
