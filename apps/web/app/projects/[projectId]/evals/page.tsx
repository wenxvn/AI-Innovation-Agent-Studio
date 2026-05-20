'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Target,
  FileText,
  Code,
  Lightbulb
} from 'lucide-react'
import { evaluations } from '@/lib/mock-data'

const rubricLabels: Record<string, { label: string; icon: any }> = {
  correctness: { label: '正确性', icon: CheckCircle2 },
  completeness: { label: '完整性', icon: FileText },
  feasibility: { label: '可行性', icon: Target },
  innovation: { label: '创新性', icon: Lightbulb },
  engineering_quality: { label: '工程质量', icon: Code },
  citation_quality: { label: '引用质量', icon: FileText },
  security_risk: { label: '安全风险', icon: Shield }
}

export default function EvalsPage() {
  const latestEval = evaluations[0]
  const avgScore = evaluations.reduce((acc, e) => acc + e.score, 0) / evaluations.length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Eval Dashboard</h1>
          <p className="text-zinc-400">评估 Agent 输出质量和性能</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            导出报告
          </Button>
          <Button variant="primary" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            运行评估
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">平均评分</p>
                <p className="text-3xl font-bold text-emerald-400">{avgScore.toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">评估次数</p>
                <p className="text-3xl font-bold">{evaluations.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">通过率</p>
                <p className="text-3xl font-bold text-emerald-400">100%</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">平均耗时</p>
                <p className="text-3xl font-bold">2.5s</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Clock className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Evaluation */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>最新评估结果</CardTitle>
              <p className="text-sm text-zinc-500">
                Run ID: {latestEval.agentRunId} • {new Date(latestEval.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <Badge variant="success" className="text-lg px-4 py-1">
              {latestEval.score} 分
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(latestEval.rubric).map(([key, value]) => {
              const { label, icon: Icon } = rubricLabels[key] || { label: key, icon: Target }
              const isRisk = key === 'security_risk'
              const score = isRisk ? 100 - (value as number) : (value as number)
              
              return (
                <div key={key} className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-blue-400' : 'text-amber-400'}`} />
                    <span className="text-sm text-zinc-400">{label}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{score}</span>
                    <span className="text-xs text-zinc-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-blue-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm text-zinc-400 mb-2">评估反馈</p>
            <p className="text-sm text-zinc-300">{latestEval.feedback}</p>
          </div>
        </CardContent>
      </Card>

      {/* Evaluation History */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>评估历史</CardTitle>
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    evaluation.score >= 90 ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                  }`}>
                    <span className={`text-lg font-bold ${
                      evaluation.score >= 90 ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {evaluation.score}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{evaluation.agentRunId}</p>
                    <p className="text-sm text-zinc-500">
                      {new Date(evaluation.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {Object.entries(evaluation.rubric).slice(0, 3).map(([key, value]) => {
                      const { label } = rubricLabels[key] || { label: key }
                      const isRisk = key === 'security_risk'
                      const score = isRisk ? 100 - (value as number) : (value as number)
                      return (
                        <Badge 
                          key={key} 
                          variant={score >= 80 ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {label}: {score}
                        </Badge>
                      )
                    })}
                  </div>
                  
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {evaluation.result}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eval Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>评估维度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Correctness', description: '输出的正确性', icon: CheckCircle2 },
              { name: 'Completeness', description: '输出的完整性', icon: FileText },
              { name: 'Feasibility', description: '方案的可行性', icon: Target },
              { name: 'Innovation', description: '创新性程度', icon: Lightbulb },
              { name: 'Engineering Quality', description: '工程质量', icon: Code },
              { name: 'Citation Quality', description: '引用质量', icon: FileText },
              { name: 'RAG Groundedness', description: 'RAG 可靠性', icon: Shield },
              { name: 'Tool Call Success Rate', description: '工具调用成功率', icon: Zap },
              { name: 'Hallucination Risk', description: '幻觉风险', icon: AlertCircle },
              { name: 'Security Risk', description: '安全风险', icon: Shield },
              { name: 'Latency', description: '延迟', icon: Clock },
              { name: 'Cost', description: '成本', icon: BarChart3 }
            ].map((dimension) => {
              const Icon = dimension.icon
              return (
                <div key={dimension.name} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <Icon className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-sm font-medium">{dimension.name}</p>
                    <p className="text-xs text-zinc-500">{dimension.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
