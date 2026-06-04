'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { api, type Evaluation } from '@/lib/api-client'
import { 
  Loader2, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  AlertTriangle, 
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap
} from 'lucide-react'

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  correctness: CheckCircle2,
  completeness: Target,
  feasibility: Zap,
  innovation: Lightbulb,
  engineering_quality: Activity,
  citation_quality: Shield,
}

const DIMENSION_LABELS: Record<string, string> = {
  correctness: '正确性',
  completeness: '完整性',
  feasibility: '可行性',
  innovation: '创新性',
  engineering_quality: '工程质量',
  citation_quality: '引用质量',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreTrend(score: number): React.ReactNode {
  if (score >= 80) return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (score >= 60) return <Minus className="h-4 w-4 text-amber-500" />
  return <TrendingDown className="h-4 w-4 text-red-500" />
}

export default function EvalsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [expandedEval, setExpandedEval] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', projectId],
    queryFn: () => api.evals.list(projectId),
    enabled: !!projectId,
  })

  const evals = data?.data || []

  const avgScore = evals.length > 0
    ? evals.reduce((sum, e) => sum + e.score, 0) / evals.length
    : 0

  const passRate = evals.length > 0
    ? (evals.filter(e => e.result === 'pass').length / evals.length) * 100
    : 0

  const getEvalMeta = (ev: Evaluation) => {
    const meta = (ev as unknown as Record<string, unknown>).metadata_ as Record<string, unknown> | undefined
    return meta || {}
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">评估</h1>
        <p className="text-sm text-muted-foreground mt-1">智能体运行的多维度评估结果</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">平均评分</p>
                  {getScoreTrend(avgScore)}
                </div>
                <p className={`text-4xl font-bold ${getScoreColor(avgScore)}`}>
                  {avgScore.toFixed(1)}
                </p>
                <div className="w-full bg-muted/30 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${getScoreBgColor(avgScore)}`}
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">通过率</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className={`text-4xl font-bold ${passRate >= 80 ? 'text-emerald-500' : passRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {passRate.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {evals.filter(e => e.result === 'pass').length}/{evals.length} 通过
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">评估总数</p>
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                </div>
                <p className="text-4xl font-bold">{evals.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Agent 运行评估记录
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Evaluations List */}
          {evals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无评估</h3>
                <p className="text-muted-foreground">智能体运行完成后会自动生成评估</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {evals.map((ev) => {
                const meta = getEvalMeta(ev)
                const isExpanded = expandedEval === ev.id
                const dimensions = (meta.dimensions as Array<{ name: string; score: number; reason: string }>) || []
                const strengths = (meta.strengths as string[]) || []
                const weaknesses = (meta.weaknesses as string[]) || []
                const risks = (meta.risks as string[]) || []
                const actionItems = (meta.action_items as string[]) || []
                const evalMode = (meta.mode as string) || 'unknown'
                const evalProvider = (meta.provider as string) || 'unknown'

                return (
                  <Card key={ev.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${ev.score >= 70 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            <span className={`text-2xl font-bold ${getScoreColor(ev.score)}`}>
                              {ev.score.toFixed(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={ev.result === 'pass' ? 'success' : 'destructive'}>
                                {ev.result === 'pass' ? '通过' : '未通过'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                {evalMode}
                              </Badge>
                              {evalProvider !== 'unknown' && (
                                <Badge variant="outline" className="text-xs">
                                  {evalProvider}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(ev.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedEval(isExpanded ? null : ev.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Dimensions Grid */}
                      {dimensions.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {dimensions.map((dim) => {
                            const Icon = DIMENSION_ICONS[dim.name] || BarChart3
                            const label = DIMENSION_LABELS[dim.name] || dim.name
                            return (
                              <div key={dim.name} className="p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon className="h-4 w-4 text-violet-500" />
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className={`text-xl font-bold ${getScoreColor(dim.score)}`}>
                                    {dim.score}
                                  </p>
                                  {getScoreTrend(dim.score)}
                                </div>
                                <div className="w-full bg-muted/30 rounded-full h-1.5 mt-2">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${getScoreBgColor(dim.score)}`}
                                    style={{ width: `${dim.score}%` }}
                                  />
                                </div>
                                {dim.reason && (
                                  <p className="text-[10px] text-muted-foreground mt-1.5">{dim.reason}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Rubric fallback */}
                      {ev.rubric && Object.keys(ev.rubric).length > 0 && dimensions.length === 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          {Object.entries(ev.rubric).map(([key, value]) => (
                            <div key={key} className="p-3 rounded-lg bg-muted/10 text-center">
                              <p className="text-xs text-muted-foreground mb-1">{key}</p>
                              <p className={`text-xl font-bold ${getScoreColor(Number(value))}`}>{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {ev.feedback && (
                        <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/10">
                          {ev.feedback}
                        </p>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-4 border-t border-border/30 pt-4">
                          {strengths.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                优点
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {strengths.map((s, i) => (
                                  <Badge key={i} variant="success" className="text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {weaknesses.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                不足
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {weaknesses.map((w, i) => (
                                  <Badge key={i} variant="warning" className="text-xs">{w}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {risks.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                风险项
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {risks.map((risk, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">{risk}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {actionItems.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4 text-blue-500" />
                                改进建议
                              </p>
                              <div className="space-y-2">
                                {actionItems.map((item, i) => (
                                  <div key={i} className="text-sm p-3 rounded-lg bg-muted/10 border-l-2 border-blue-500">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
