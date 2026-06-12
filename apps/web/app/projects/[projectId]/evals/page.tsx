'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import {
  api,
  type AgentRun,
  type Evaluation,
  type EvaluationDimension,
  type EvaluationStatus,
  type Output,
} from '@/lib/api-client'

const DIMENSION_LABELS: Record<string, string> = {
  correctness: '准确性',
  completeness: '完整性',
  feasibility: '可行性',
  innovation: '创新性',
  engineering_quality: '工程质量',
  citation_quality: '引用质量',
}

const STATUS_OPTIONS: Array<{ value: EvaluationStatus; label: string; icon: typeof CheckCircle2 }> = [
  { value: 'pending', label: '待评审', icon: Activity },
  { value: 'pass', label: '通过', icon: CheckCircle2 },
  { value: 'needs_revision', label: '需修改', icon: AlertTriangle },
  { value: 'accepted', label: '接受', icon: ClipboardCheck },
  { value: 'fail', label: '不通过', icon: XCircle },
]

type ReviewItem = {
  key: string
  output: Output | null
  run: AgentRun | null
  evaluation: Evaluation | null
}

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreBar(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function statusBadge(status: EvaluationStatus): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'pass' || status === 'accepted') return 'success'
  if (status === 'needs_revision') return 'warning'
  if (status === 'fail') return 'destructive'
  return 'outline'
}

function resultBadge(result: string): 'success' | 'destructive' | 'outline' {
  if (result === 'pass') return 'success'
  if (result === 'fail') return 'destructive'
  return 'outline'
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function getDimensions(evaluation: Evaluation): EvaluationDimension[] {
  const fromMeta = evaluation.metadata_?.dimensions
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    return fromMeta.map((dimension) => ({
      name: dimension.name,
      score: Number(dimension.score || 0),
      reason: dimension.reason,
    }))
  }

  return Object.entries(evaluation.rubric || {}).map(([name, score]) => ({
    name,
    score: Number(score || 0),
  }))
}

function getList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function outputTitle(item: ReviewItem) {
  if (item.output) return item.output.title
  const generated = getRecord(item.run?.generated_output)
  return getString(generated.title, 'Agent 运行产物')
}

function outputType(item: ReviewItem) {
  if (item.output) return item.output.output_type
  const generated = getRecord(item.run?.generated_output)
  return getString(generated.type, 'run')
}

export default function EvalsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})

  const evalsQuery = useQuery({
    queryKey: ['evaluations', projectId],
    queryFn: () => api.evals.list(projectId),
    enabled: !!projectId,
  })

  const outputsQuery = useQuery({
    queryKey: ['outputs', projectId],
    queryFn: () => api.outputs.list(projectId),
    enabled: !!projectId,
  })

  const runsQuery = useQuery({
    queryKey: ['agent-runs', projectId],
    queryFn: () => api.agents.listRuns(projectId),
    enabled: !!projectId,
  })

  const runEvalMutation = useMutation({
    mutationFn: (agentRunId: string) => api.evals.run(projectId, agentRunId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', projectId] })
      toast({ title: '评估已完成' })
    },
    onError: (error: Error) => {
      toast({ title: '评估失败', description: error.message, variant: 'destructive' })
    },
  })

  const updateReviewMutation = useMutation({
    mutationFn: ({ evalId, status, review_note }: { evalId: string; status?: EvaluationStatus; review_note?: string }) =>
      api.evals.update(projectId, evalId, { status, review_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', projectId] })
      toast({ title: '评审状态已更新' })
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' })
    },
  })

  const evaluations = evalsQuery.data?.data || []
  const outputs = outputsQuery.data?.data || []
  const runs = runsQuery.data?.data || []
  const isLoading = evalsQuery.isLoading || outputsQuery.isLoading || runsQuery.isLoading

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const evalByRun = new Map(evaluations.map((evaluation) => [evaluation.agent_run_id, evaluation]))
    const runById = new Map(runs.map((run) => [run.id, run]))
    const outputRunIds = new Set<string>()

    const outputItems = outputs.map((output) => {
      if (output.agent_run_id) outputRunIds.add(output.agent_run_id)
      const run = output.agent_run_id ? runById.get(output.agent_run_id) || null : null
      const evaluation = output.agent_run_id ? evalByRun.get(output.agent_run_id) || null : null
      return { key: `output-${output.id}`, output, run, evaluation }
    })

    const runOnlyItems = runs
      .filter((run) => !outputRunIds.has(run.id) && evalByRun.has(run.id))
      .map((run) => ({
        key: `run-${run.id}`,
        output: null,
        run,
        evaluation: evalByRun.get(run.id) || null,
      }))

    return [...outputItems, ...runOnlyItems]
  }, [evaluations, outputs, runs])

  const evaluatedItems = reviewItems.filter((item) => item.evaluation)
  const averageScore = evaluatedItems.length
    ? evaluatedItems.reduce((sum, item) => sum + (item.evaluation?.score || 0), 0) / evaluatedItems.length
    : 0
  const pendingCount = evaluatedItems.filter((item) => item.evaluation?.status === 'pending').length
  const revisionCount = evaluatedItems.filter((item) => item.evaluation?.status === 'needs_revision').length
  const acceptedCount = evaluatedItems.filter((item) => ['pass', 'accepted'].includes(item.evaluation?.status || '')).length

  return (
    <div className="max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">产物质量评审中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">按产物和 Agent 运行汇总自动评分、风险建议和人工评审状态</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
          {evaluations.length} 条评估记录
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>平均质量分</span>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className={`text-3xl font-bold ${scoreTone(averageScore)}`}>{averageScore.toFixed(1)}</div>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${scoreBar(averageScore)}`} style={{ width: `${Math.min(averageScore, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>待人工评审</span>
                  <Activity className="h-4 w-4" />
                </div>
                <div className="text-3xl font-bold">{pendingCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">自动评估完成但尚未确认</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>需修改</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{revisionCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">已标记需要返工的产物</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>通过/接受</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{acceptedCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">可进入下一步交付的产物</p>
              </CardContent>
            </Card>
          </div>

          {reviewItems.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-72 flex-col items-center justify-center p-10 text-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h2 className="text-lg font-semibold">暂无可评审产物</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Agent 生成产物后，这里会显示自动评分和人工评审入口。</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviewItems.map((item) => {
                const evaluation = item.evaluation
                const runId = item.run?.id || item.output?.agent_run_id || ''
                const dimensions = evaluation ? getDimensions(evaluation) : []
                const strengths = evaluation ? getList(evaluation.metadata_?.strengths) : []
                const weaknesses = evaluation ? getList(evaluation.metadata_?.weaknesses) : []
                const actionItems = evaluation ? getList(evaluation.metadata_?.action_items) : []
                const risks = evaluation ? [...evaluation.risks, ...weaknesses] : []
                const noteValue = evaluation ? draftNotes[evaluation.id] ?? evaluation.review_note ?? '' : ''
                const provider = evaluation?.metadata_?.provider || 'rule'
                const mode = evaluation?.metadata_?.mode || 'rule_based'

                return (
                  <Card key={item.key}>
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{outputType(item)}</Badge>
                            {item.run?.agent_name && <Badge variant="outline">{item.run.agent_name}</Badge>}
                            {item.run?.status && <Badge variant="outline">运行 {item.run.status}</Badge>}
                          </div>
                          <CardTitle className="break-words text-xl">{outputTitle(item)}</CardTitle>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {runId ? `Run ${runId}` : '无关联 Agent Run'}
                          </p>
                        </div>

                        {evaluation ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted/20">
                              <span className={`text-2xl font-bold ${scoreTone(evaluation.score)}`}>{evaluation.score.toFixed(0)}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={resultBadge(evaluation.result)}>自动 {evaluation.result === 'pass' ? '通过' : evaluation.result === 'fail' ? '未通过' : evaluation.result}</Badge>
                                <Badge variant={statusBadge(evaluation.status)}>人工 {statusLabel(evaluation.status)}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{String(mode)}</span>
                                <span>{String(provider)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => runId && runEvalMutation.mutate(runId)}
                            disabled={!runId || runEvalMutation.isPending}
                          >
                            {runEvalMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            运行评估
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      {evaluation ? (
                        <>
                          {dimensions.length > 0 && (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {dimensions.map((dimension) => {
                                const score = Math.max(0, Math.min(Number(dimension.score || 0), 100))
                                return (
                                  <div key={dimension.name} className="rounded-md border bg-background p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{DIMENSION_LABELS[dimension.name] || dimension.name}</p>
                                        {dimension.reason && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{dimension.reason}</p>}
                                      </div>
                                      <span className={`shrink-0 text-lg font-semibold ${scoreTone(score)}`}>{score.toFixed(0)}</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted">
                                      <div className={`h-2 rounded-full ${scoreBar(score)}`} style={{ width: `${score}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {evaluation.feedback && (
                            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                              {evaluation.feedback}
                            </div>
                          )}

                          <div className="grid gap-4 lg:grid-cols-3">
                            <ReviewList
                              title="优势"
                              icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
                              items={strengths}
                              empty="暂无突出优势"
                              variant="success"
                            />
                            <ReviewList
                              title="风险"
                              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                              items={risks}
                              empty="暂无风险项"
                              variant="destructive"
                            />
                            <ReviewList
                              title="改进建议"
                              icon={<Lightbulb className="h-4 w-4 text-blue-500" />}
                              items={actionItems}
                              empty="暂无改进建议"
                              variant="info"
                            />
                          </div>

                          <div className="grid gap-4 border-t pt-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <div>
                              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                <Target className="h-4 w-4" />
                                人工评审状态
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((option) => {
                                  const Icon = option.icon
                                  return (
                                    <Button
                                      key={option.value}
                                      type="button"
                                      size="sm"
                                      variant={evaluation.status === option.value ? 'default' : 'outline'}
                                      onClick={() => updateReviewMutation.mutate({
                                        evalId: evaluation.id,
                                        status: option.value,
                                        review_note: noteValue,
                                      })}
                                      disabled={updateReviewMutation.isPending}
                                    >
                                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                                      {option.label}
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Textarea
                                value={noteValue}
                                onChange={(event) => setDraftNotes((current) => ({
                                  ...current,
                                  [evaluation.id]: event.target.value,
                                }))}
                                placeholder="评审备注"
                                className="min-h-24 resize-none"
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateReviewMutation.mutate({
                                    evalId: evaluation.id,
                                    review_note: noteValue,
                                  })}
                                  disabled={updateReviewMutation.isPending}
                                >
                                  保存备注
                                </Button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                          {runId ? '该产物尚未生成评估，可直接运行质量评审。' : '该产物没有关联 Agent Run，暂不能自动评估。'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReviewList({
  title,
  icon,
  items,
  empty,
  variant,
}: {
  title: string
  icon: ReactNode
  items: string[]
  empty: string
  variant: 'success' | 'destructive' | 'info'
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={`${item}-${index}`} variant={variant} className="max-w-full whitespace-normal leading-relaxed">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}
