'use client'

import { useEffect, useMemo, useRef, useState, type ElementType } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { TraceTimeline } from '@/components/trace/trace-timeline'
import { api, type AgentRun, type ToolCall } from '@/lib/api-client'
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  User,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react'

const SKILL_LABELS: Record<string, string> = {
  'competition-analyzer': '赛题分析',
  'idea-generator': '创意生成',
  'research-synthesizer': '调研综合',
  'prd-writer': 'PRD 编写',
  'architecture-designer': '架构设计',
  'api-designer': 'API 设计',
  'rag-builder': 'RAG 构建',
  'context-pack-builder': '上下文构建',
  'fastapi-generator': 'FastAPI 生成',
  'nextjs-generator': 'Next.js 生成',
  'qa-debugger': 'QA 调试',
  'pitch-writer': '答辩编写',
}

const STATUS_CONFIG: Record<string, { icon: ElementType; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info'; label: string }> = {
  idle: { icon: Clock, variant: 'secondary', label: '空闲' },
  planning: { icon: Target, variant: 'info', label: '规划中' },
  retrieving_context: { icon: Search, variant: 'info', label: '检索上下文' },
  selecting_skill: { icon: Zap, variant: 'info', label: '选择 Skill' },
  calling_tool: { icon: Wrench, variant: 'warning', label: '调用工具' },
  waiting_approval: { icon: Shield, variant: 'warning', label: '等待审批' },
  generating: { icon: Sparkles, variant: 'info', label: '生成中' },
  evaluating: { icon: BarChart3, variant: 'info', label: '评估中' },
  completed: { icon: CheckCircle2, variant: 'success', label: '已完成' },
  failed: { icon: XCircle, variant: 'destructive', label: '失败' },
  pending: { icon: Clock, variant: 'warning', label: '等待中' },
}

const SUGGESTIONS = [
  '分析这个 AI 创新竞赛的赛题要求，并给出项目方向建议',
  '基于当前资料生成一版 PRD，突出 MVP 范围和验收标准',
  '设计系统架构方案，包括前后端、数据模型和 Agent 工作流',
  '生成答辩稿大纲，覆盖问题背景、方案亮点和演示流程',
]

const INSPIRATION_PROMPT = `我现在没有明确 idea。请作为灵感探索 Agent：
1. 先向我提出 3-5 个用于确定大体主题的问题；
2. 在信息不足时，先基于通用热点假设 2-3 个可选主题；
3. 围绕这些主题，扫描小红书、抖音、X/Twitter、知乎、论坛或其他社交平台上的热点信号；
4. 筛选可产品化的话题，并给出项目建议、MVP 范围、验证实验和风险。`

interface AgentRunRequest {
  user_input: string
  agent_name?: string
  selected_skill?: string
  run_mode?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  run?: AgentRun
  timestamp: Date
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

function statusBadge(status: string) {
  const config = STATUS_CONFIG[status] || { icon: Clock, variant: 'secondary' as const, label: status || '未知' }
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function RunMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function PlanList({ run }: { run: AgentRun }) {
  if (!run.plan?.length) {
    return <p className="text-sm text-muted-foreground">本次运行没有记录执行计划。</p>
  }

  return (
    <div className="space-y-2">
      {run.plan.map((step, index) => (
        <div key={`${run.id}-plan-${index}`} className="flex items-start gap-3 border border-border bg-background p-3">
          <Badge variant="secondary" className="h-6 w-6 justify-center p-0">
            {step.step}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{step.action}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ContextPanel({ run }: { run: AgentRun }) {
  const pack = getRecord(run.context_pack)
  const memories = getArray(pack.relevant_memory)
  const evidence = getArray(pack.retrieved_evidence)
  const constraints = getArray(pack.constraints)
  const risks = getArray(pack.risks)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <RunMetric label="相关记忆" value={memories.length} />
        <RunMetric label="检索证据" value={evidence.length} />
        <RunMetric label="约束" value={constraints.length} />
        <RunMetric label="风险" value={risks.length} />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4 text-blue-500" />
          使用的记忆
        </p>
        {memories.length ? (
          <div className="space-y-2">
            {memories.slice(0, 4).map((item, index) => {
              const memory = getRecord(item)
              return (
                <div key={`${run.id}-memory-${index}`} className="border border-border bg-background p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="outline">{getString(memory.memory_type, 'memory')}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      可信度 {getNumber(memory.confidence, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {getString(memory.content, '无内容')}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="border border-border bg-background p-3 text-sm text-muted-foreground">未检索到相关记忆。</p>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-emerald-500" />
          检索证据
        </p>
        {evidence.length ? (
          <div className="space-y-2">
            {evidence.slice(0, 4).map((item, index) => {
              const source = getRecord(item)
              return (
                <div key={`${run.id}-evidence-${index}`} className="border border-border bg-background p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="outline">{getString(source.source_type, 'document_chunk')}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      chunk {String(source.chunk_index ?? '-')}
                    </span>
                  </div>
                  <p className="line-clamp-4 text-xs leading-5 text-muted-foreground">
                    {getString(source.excerpt, '无摘录')}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="border border-border bg-background p-3 text-sm text-muted-foreground">未检索到文档证据。</p>
        )}
      </div>
    </div>
  )
}

function EvalPanel({ run }: { run: AgentRun }) {
  const evalResult = getRecord(run.eval_result)
  const score = getNumber(evalResult.overall_score, getNumber(evalResult.score, 0))
  const dimensions = getArray(evalResult.dimensions)
  const rubric = getRecord(evalResult.rubric)
  const risks = getArray(evalResult.risks)

  if (!Object.keys(evalResult).length) {
    return <p className="text-sm text-muted-foreground">本次运行没有评估结果。</p>
  }

  return (
    <div className="space-y-4">
      <div className="border border-border bg-background p-4">
        <p className="text-[11px] text-muted-foreground">综合评分</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums">{score ? score.toFixed(1) : '-'}</span>
          <Badge variant={score >= 70 ? 'success' : 'destructive'}>
            {getString(evalResult.result, 'pending')}
          </Badge>
        </div>
        {evalResult.feedback ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{String(evalResult.feedback)}</p>
        ) : null}
      </div>

      {dimensions.length ? (
        <div className="space-y-2">
          {dimensions.map((item, index) => {
            const dimension = getRecord(item)
            const itemScore = getNumber(dimension.score)
            return (
              <div key={`${run.id}-dimension-${index}`} className="border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{getString(dimension.name, `dimension-${index + 1}`)}</p>
                  <span className="text-sm tabular-nums">{itemScore}</span>
                </div>
                <div className="mt-2 h-1.5 bg-muted/20">
                  <div className="h-1.5 bg-primary" style={{ width: `${Math.min(100, Math.max(0, itemScore))}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : Object.keys(rubric).length ? (
        <div className="space-y-2">
          {Object.entries(rubric).map(([name, value]) => {
            const itemScore = getNumber(value)
            return (
              <div key={name} className="border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{name}</p>
                  <span className="text-sm tabular-nums">{itemScore}</span>
                </div>
                <div className="mt-2 h-1.5 bg-muted/20">
                  <div className="h-1.5 bg-primary" style={{ width: `${Math.min(100, Math.max(0, itemScore))}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {risks.length ? (
        <div className="border border-warning/30 bg-warning/10 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" />
            风险
          </p>
          <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
            {risks.map((risk, index) => (
              <li key={`${run.id}-risk-${index}`}>{String(risk)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ToolsPanel({ run, toolCalls }: { run: AgentRun; toolCalls: ToolCall[] }) {
  const calls = toolCalls.filter((call) => call.agent_run_id === run.id)

  if (!calls.length) {
    return <p className="text-sm text-muted-foreground">本次运行没有工具调用记录。</p>
  }

  return (
    <div className="space-y-2">
      {calls.map((call) => (
        <div key={call.id} className="border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{call.tool_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatTime(call.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {statusBadge(call.status)}
              {call.requires_approval ? <Badge variant="warning">需审批</Badge> : null}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <RunMetric label="权限" value={call.permission_level || '-'} />
            <RunMetric label="耗时" value={call.latency_ms ? `${call.latency_ms}ms` : '-'} />
          </div>
          {call.error_message ? (
            <p className="mt-3 text-xs text-error">{call.error_message}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function RunInspector({
  run,
  toolCalls,
  traceEvents,
  isTraceLoading,
}: {
  run: AgentRun | null
  toolCalls: ToolCall[]
  traceEvents: ReturnType<typeof getArray>
  isTraceLoading: boolean
}) {
  if (!run) {
    return (
      <aside className="hidden w-[360px] shrink-0 border-l border-border bg-card/40 p-4 xl:block">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Layers className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">选择一次智能体运行</p>
          <p className="mt-2 max-w-[240px] text-xs leading-5 text-muted-foreground">
            运行任务或点击历史记录后，这里会展示上下文、工具、评估和 Trace。
          </p>
        </div>
      </aside>
    )
  }

  const output = getRecord(run.generated_output)
  const tokenUsage = getRecord(run.token_usage)

  return (
    <aside className="hidden w-[380px] shrink-0 overflow-auto border-l border-border bg-card/40 xl:block">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">智能体运行详情</p>
            <h2 className="mt-1 truncate text-base font-semibold">{getString(output.title, run.agent_name)}</h2>
          </div>
          {statusBadge(run.status)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{run.agent_name}</Badge>
          <Badge variant="outline">{SKILL_LABELS[run.selected_skill] || run.selected_skill}</Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <RunMetric label="耗时" value={run.latency_ms ? `${run.latency_ms}ms` : '-'} />
          <RunMetric label="Token" value={String(tokenUsage.total_tokens ?? '-')} />
          <RunMetric label="费用" value={run.cost ? `$${run.cost.toFixed(4)}` : '$0'} />
          <RunMetric label="创建时间" value={formatTime(run.created_at).split(' ')[1] || '-'} />
        </div>

        <Tabs defaultValue="context" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-5">
            <TabsTrigger className="px-2 text-xs" value="plan">计划</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="context">上下文</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="tools">工具</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="eval">评估</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="trace">追踪</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="mt-4">
            <PlanList run={run} />
          </TabsContent>
          <TabsContent value="context" className="mt-4">
            <ContextPanel run={run} />
          </TabsContent>
          <TabsContent value="tools" className="mt-4">
            <ToolsPanel run={run} toolCalls={toolCalls} />
          </TabsContent>
          <TabsContent value="eval" className="mt-4">
            <EvalPanel run={run} />
          </TabsContent>
          <TabsContent value="trace" className="mt-4">
            {isTraceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <TraceTimeline events={traceEvents as never} title="运行追踪" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}

export default function ChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: runsData, isLoading: runsLoading, isError: runsError } = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
    retry: false,
  })

  const { data: toolCallsData } = useQuery({
    queryKey: ['tool-calls', projectId],
    queryFn: () => api.tools.listCalls(projectId),
    enabled: !!projectId,
    retry: false,
  })

  const runs = useMemo(() => runsData?.data || [], [runsData?.data])
  const selectedRun = useMemo(() => {
    if (!runs.length) return null
    return runs.find((run) => run.id === selectedRunId) || runs[0]
  }, [runs, selectedRunId])

  const { data: traceData, isLoading: traceLoading } = useQuery({
    queryKey: ['run-trace', projectId, selectedRun?.id],
    queryFn: () => api.trace.listRunTrace(projectId, selectedRun!.id),
    enabled: !!projectId && !!selectedRun?.id,
    retry: false,
  })

  const runMutation = useMutation({
    mutationFn: (payload: AgentRunRequest) =>
      api.agents.run(projectId, payload),
    onSuccess: (data) => {
      const run = data.data
      const output = getRecord(run.generated_output)
      setSelectedRunId(run.id)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${run.id}`,
          role: 'assistant',
          content: getString(output.content, '任务已执行，结果已保存到产物页。'),
          run,
          timestamp: new Date(),
        },
      ])
      queryClient.invalidateQueries({ queryKey: ['agent-runs', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tool-calls', projectId] })
      queryClient.invalidateQueries({ queryKey: ['outputs', projectId] })
      queryClient.invalidateQueries({ queryKey: ['evaluations', projectId] })
      queryClient.invalidateQueries({ queryKey: ['run-trace', projectId, run.id] })
    },
    onError: (error: Error) => {
      toast({ title: 'Agent 运行失败', description: error.message, variant: 'destructive' })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, runMutation.isPending])

  useEffect(() => {
    if (!selectedRunId && runs.length) {
      setSelectedRunId(runs[0].id)
    }
  }, [runs, selectedRunId])

  const submitRun = (content: string, options: Omit<AgentRunRequest, 'user_input'> = {}) => {
    const trimmed = content.trim()
    if (!trimmed || runMutation.isPending) return

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      },
    ])

    runMutation.mutate({ ...options, user_input: trimmed })
    setInput('')
  }

  const handleSend = () => {
    submitRun(input)
  }

  const handleInspirationDiscovery = () => {
    const trimmed = input.trim()
    const prompt = trimmed
      ? `我现在没有明确 idea，但有这些偏好或线索：\n${trimmed}\n\n请先帮我确定大体主题，再扫描小红书、抖音、X/Twitter、知乎、论坛或其他社交平台的热点信号，筛选可产品化话题，并给出项目建议、MVP 范围、验证实验和风险。`
      : INSPIRATION_PROMPT

    submitRun(prompt, {
      agent_name: 'Product Agent',
      selected_skill: 'idea-generator',
      run_mode: 'inspiration_discovery',
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: '已复制', variant: 'success' })
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/30 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <Bot className="h-5 w-5 text-primary" />
                智能体对话
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                输入任务后，系统会选择 Skill、检索上下文、记录工具调用并生成可追踪产物。
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:flex">
              {runs.length} 次运行
            </Badge>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-h-0 flex-col border-r border-border/60">
            <div className="flex-1 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mx-auto max-w-2xl text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                    <h2 className="text-xl font-semibold">开始一次可观察的智能体运行</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      你可以从赛题解析、PRD、架构、代码骨架或答辩材料开始。运行后右侧会展示上下文、工具、评估和 Trace。
                    </p>
                    <div className="mt-5 flex justify-center">
                      <Button
                        variant="primary"
                        className="h-auto rounded-md px-4 py-3 text-sm"
                        onClick={handleInspirationDiscovery}
                        disabled={runMutation.isPending}
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        没有 idea，帮我找热点方向
                      </Button>
                    </div>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          className="h-auto justify-start whitespace-normal rounded-md px-3 py-3 text-left text-xs leading-5"
                          onClick={() => {
                            setInput(suggestion)
                            textareaRef.current?.focus()
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => {
                    const isUser = message.role === 'user'
                    const run = message.run
                    const output = getRecord(run?.generated_output)
                    return (
                      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[min(760px,92%)] items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border border-border'}`}>
                            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`border p-4 ${isUser ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
                              <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                            </div>
                            {run ? (
                              <Card className={`mt-2 rounded-md ${selectedRun?.id === run.id ? 'border-primary/60' : 'border-border'}`}>
                                <CardContent className="p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="gap-1">
                                      <Zap className="h-3 w-3" />
                                      {SKILL_LABELS[run.selected_skill] || run.selected_skill}
                                    </Badge>
                                    {statusBadge(run.status)}
                                    {run.latency_ms ? <Badge variant="outline">{run.latency_ms}ms</Badge> : null}
                                    {getRecord(run.token_usage).total_tokens ? (
                                      <Badge variant="outline">{String(getRecord(run.token_usage).total_tokens)} tokens</Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedRunId(run.id)}>
                                      <Layers className="mr-1 h-3.5 w-3.5" />
                                      查看详情
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(getString(output.content, message.content))}>
                                      <Copy className="mr-1 h-3.5 w-3.5" />
                                      复制内容
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : null}
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {message.timestamp.toLocaleTimeString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {runMutation.isPending ? (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3 border border-border bg-card p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">智能体正在检索上下文、调用工具并生成结果...</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-card/40 p-4">
              <div className="flex gap-3">
                <Textarea
                  ref={textareaRef}
                  placeholder="输入任务需求... Enter 发送，Shift+Enter 换行"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="resize-none rounded-md"
                  disabled={runMutation.isPending}
                />
                <Button
                  variant="outline"
                  onClick={handleInspirationDiscovery}
                  disabled={runMutation.isPending}
                  className="shrink-0 rounded-md px-3"
                  aria-label="没有 idea，寻找热点方向"
                  title="没有 idea，寻找热点方向"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">没 idea</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={!input.trim() || runMutation.isPending}
                  className="shrink-0 rounded-md"
                  aria-label="发送任务"
                >
                  {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <aside className="hidden min-h-0 overflow-y-auto bg-card/20 p-4 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">最近运行</h2>
              {runsLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
            </div>
            {runsError ? (
              <div className="border border-warning/30 bg-warning/10 p-3">
                <p className="text-sm font-medium text-warning">数据服务未连接</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  启动后端 http://localhost:8000 后刷新，即可读取运行记录。
                </p>
              </div>
            ) : runs.length ? (
              <div className="space-y-2">
                {runs.slice(0, 12).map((run) => {
                  const active = selectedRun?.id === run.id
                  return (
                    <button
                      key={run.id}
                      type="button"
                      className={`w-full border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/10'}`}
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium">{run.user_input}</p>
                        {statusBadge(run.status)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">{SKILL_LABELS[run.selected_skill] || run.selected_skill}</Badge>
                        {run.latency_ms ? <Badge variant="outline">{run.latency_ms}ms</Badge> : null}
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">{formatTime(run.created_at)}</p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="border border-border bg-background p-3 text-sm text-muted-foreground">
                还没有运行记录。发送一个任务后会在这里出现。
              </p>
            )}
          </aside>
        </div>
      </section>

      <RunInspector
        run={selectedRun}
        toolCalls={toolCallsData?.data || []}
        traceEvents={traceData?.data || []}
        isTraceLoading={traceLoading}
      />
    </div>
  )
}
