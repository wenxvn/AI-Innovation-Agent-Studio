'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  AlertTriangle, 
  Database, 
  Brain, 
  FileText, 
  Wrench,
  CheckCircle2,
  Clock,
  Shield
} from 'lucide-react'
import { contextPack } from '@/lib/mock-data'

export default function ContextPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Context Pack Viewer</h1>
        <p className="text-zinc-400">当前 Agent 执行的上下文包</p>
      </div>

      {/* Context Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-400" />
              <CardTitle>任务目标</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">任务</p>
              <p className="text-sm">{contextPack.task}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">目标</p>
              <p className="text-sm">{contextPack.goal}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">当前阶段</p>
              <Badge variant="accent">{contextPack.currentStage}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <CardTitle>约束条件</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contextPack.constraints.map((constraint, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {constraint}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Memory and Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <CardTitle>相关记忆</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contextPack.relevantMemory.map((memory, index) => (
              <div key={index} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {memory.memoryType}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    置信度: {(memory.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{memory.content}</p>
                <p className="text-xs text-zinc-600 mt-2">来源: {memory.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <CardTitle>检索证据</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contextPack.retrievedEvidence.map((evidence, index) => (
              <div key={index} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">{evidence.sourceDocument}</span>
                  <Badge variant="success" className="text-xs">
                    相关度: {(evidence.score * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm text-zinc-300">{evidence.content}</p>
                <p className="text-xs text-zinc-600 mt-2">Chunk ID: {evidence.chunkId}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Decisions and Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <CardTitle>已做决策</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contextPack.decisionsSoFar.map((decision, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {decision}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <CardTitle>风险点</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contextPack.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              <CardTitle>禁止事项</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contextPack.doNotDo.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
                  <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-red-400 text-xs">✕</span>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Expected Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            <CardTitle>期望输出</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm text-zinc-300">{contextPack.expectedOutput}</p>
          </div>
        </CardContent>
      </Card>

      {/* Context Structure */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>上下文结构</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm text-zinc-400">
            <pre className="p-4 rounded-lg bg-zinc-900 overflow-auto">
{`Context Pack
├── Goal: ${contextPack.goal}
├── Constraints: ${contextPack.constraints.length} 条
├── Project State
│   ├── Name: ${contextPack.projectState.name}
│   └── Progress: ${contextPack.projectState.progress}%
├── Memory: ${contextPack.relevantMemory.length} 条
│   ├── User Memory
│   └── Project Memory
├── Evidence: ${contextPack.retrievedEvidence.length} 条
├── Decisions: ${contextPack.decisionsSoFar.length} 条
├── Risks: ${contextPack.risks.length} 条
└── Expected Output: ${contextPack.expectedOutput}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
