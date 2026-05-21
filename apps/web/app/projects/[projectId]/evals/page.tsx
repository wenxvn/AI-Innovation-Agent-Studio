'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { api, type Evaluation } from '@/lib/api-client'
import { Loader2, BarChart3, CheckCircle2, XCircle, RefreshCw, Shield, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Target } from 'lucide-react'

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

  const getEvalMeta = (ev: Evaluation) => {
    const meta = (ev as unknown as Record<string, unknown>).metadata_ as Record<string, unknown> | undefined
    return meta || {}
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Evaluations</h1>
        <p className="text-sm text-muted-foreground mt-1">Agent 运行的评估结果</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && evals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无评估</h3>
            <p className="text-muted-foreground">Agent 运行完成后会自动生成评估</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && evals.length > 0 && (
        <div className="space-y-4">
          {evals.map((ev) => {
            const meta = getEvalMeta(ev)
            const isExpanded = expandedEval === ev.id
            const dimensions = (meta.dimensions as Array<{ name: string; score: number; reason: string }>) || []
            const strengths = (meta.strengths as string[]) || []
            const weaknesses = (meta.weaknesses as string[]) || []
            const actionItems = (meta.action_items as string[]) || []
            const evalMode = (meta.mode as string) || 'unknown'
            const evalProvider = (meta.provider as string) || 'unknown'

            return (
              <Card key={ev.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${ev.score >= 70 ? 'bg-success/20' : 'bg-error/20'}`}>
                        {ev.score >= 70 ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-error" />}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{ev.score.toFixed(1)} 分</p>
                        <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                    </div>
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
                  </div>

                  {dimensions.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {dimensions.map((dim) => (
                        <div key={dim.name} className="p-3 rounded-lg bg-muted/10">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">{dim.name}</p>
                            <p className="font-semibold text-sm">{dim.score}</p>
                          </div>
                          <div className="w-full bg-muted/30 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${dim.score >= 80 ? 'bg-success' : dim.score >= 60 ? 'bg-yellow-500' : 'bg-error'}`}
                              style={{ width: `${dim.score}%` }}
                            />
                          </div>
                          {dim.reason && (
                            <p className="text-[10px] text-muted-foreground mt-1">{dim.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {ev.rubric && Object.keys(ev.rubric).length > 0 && dimensions.length === 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      {Object.entries(ev.rubric).map(([key, value]) => (
                        <div key={key} className="p-2 rounded-lg bg-muted/10 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{key}</p>
                          <p className="font-semibold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {ev.feedback && (
                    <p className="text-sm text-muted-foreground mb-3">{ev.feedback}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setExpandedEval(isExpanded ? null : ev.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      详情
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
                      {strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-yellow-500" />
                            优点
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {strengths.map((s, i) => (
                              <Badge key={i} variant="success" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {weaknesses.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            不足
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {weaknesses.map((w, i) => (
                              <Badge key={i} variant="warning" className="text-xs">{w}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {ev.risks && ev.risks.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-error" />
                            风险项
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {ev.risks.map((risk, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">{risk}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {actionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                            <Target className="h-3 w-3 text-blue-500" />
                            改进建议
                          </p>
                          <div className="space-y-1">
                            {actionItems.map((item, i) => (
                              <p key={i} className="text-xs text-muted-foreground p-2 rounded bg-muted/10">{item}</p>
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
    </div>
  )
}
