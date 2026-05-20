'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight
} from 'lucide-react'

interface WorkflowNode {
  id: string
  label: string
  agent: string
  skill: string
  status: 'completed' | 'running' | 'pending' | 'failed' | 'waiting_approval'
  toolCalls: number
  duration: string
  evalScore?: number
  x: number
  y: number
}

const workflowNodes: WorkflowNode[] = [
  {
    id: 'start',
    label: 'Start',
    agent: '',
    skill: '',
    status: 'completed',
    toolCalls: 0,
    duration: '0s',
    x: 400,
    y: 50
  },
  {
    id: 'requirement',
    label: 'Requirement Analysis',
    agent: 'Requirement Agent',
    skill: 'competition-analyzer',
    status: 'completed',
    toolCalls: 3,
    duration: '2m',
    evalScore: 92,
    x: 400,
    y: 150
  },
  {
    id: 'research',
    label: 'Research',
    agent: 'Research Agent',
    skill: 'research-synthesizer',
    status: 'completed',
    toolCalls: 5,
    duration: '5m',
    evalScore: 88,
    x: 400,
    y: 250
  },
  {
    id: 'product',
    label: 'Product Design',
    agent: 'Product Agent',
    skill: 'prd-writer',
    status: 'completed',
    toolCalls: 2,
    duration: '8m',
    evalScore: 95,
    x: 400,
    y: 350
  },
  {
    id: 'architecture',
    label: 'Architecture',
    agent: 'Architecture Agent',
    skill: 'architecture-designer',
    status: 'running',
    toolCalls: 1,
    duration: '3m',
    x: 400,
    y: 450
  },
  {
    id: 'coding',
    label: 'Code Generation',
    agent: 'Coding Agent',
    skill: 'fastapi-generator',
    status: 'pending',
    toolCalls: 0,
    duration: '-',
    x: 400,
    y: 550
  },
  {
    id: 'qa',
    label: 'QA & Testing',
    agent: 'QA Agent',
    skill: 'qa-debugger',
    status: 'pending',
    toolCalls: 0,
    duration: '-',
    x: 400,
    y: 650
  },
  {
    id: 'pitch',
    label: 'Pitch Materials',
    agent: 'Pitch Agent',
    skill: 'pitch-writer',
    status: 'pending',
    toolCalls: 0,
    duration: '-',
    x: 400,
    y: 750
  },
  {
    id: 'end',
    label: 'End',
    agent: '',
    skill: '',
    status: 'pending',
    toolCalls: 0,
    duration: '-',
    x: 400,
    y: 850
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
    case 'running': return 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse'
    case 'failed': return 'bg-red-500/20 border-red-500 text-red-400'
    case 'waiting_approval': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
    default: return 'bg-zinc-800 border-zinc-700 text-zinc-500'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-5 w-5" />
    case 'running': return <Clock className="h-5 w-5 animate-spin" />
    case 'failed': return <AlertCircle className="h-5 w-5" />
    default: return <div className="w-3 h-3 rounded-full bg-current" />
  }
}

export default function WorkflowPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Workflow Canvas</h1>
            <p className="text-sm text-zinc-500">可视化 Agent 工作流</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              运行
            </Button>
            <Button variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
            <div className="h-4 w-px bg-zinc-700 mx-2" />
            <Button variant="ghost" size="icon">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative overflow-auto bg-zinc-950 p-8">
          <div className="relative min-h-[900px]">
            {/* Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {workflowNodes.slice(0, -1).map((node, index) => {
                const nextNode = workflowNodes[index + 1]
                return (
                  <line
                    key={`edge-${index}`}
                    x1={node.x}
                    y1={node.y + 30}
                    x2={nextNode.x}
                    y2={nextNode.y - 30}
                    stroke={node.status === 'completed' ? '#22c55e' : '#3f3f46'}
                    strokeWidth="2"
                    strokeDasharray={node.status === 'running' ? '5,5' : 'none'}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {workflowNodes.map((node) => (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2"
                style={{ left: node.x, top: node.y }}
              >
                <Card className={`w-64 cursor-pointer hover:border-violet-500/50 transition-all ${getStatusColor(node.status)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(node.status)}
                        <span className="font-medium text-sm">{node.label}</span>
                      </div>
                      {node.evalScore && (
                        <Badge variant="success" className="text-xs">
                          {node.evalScore}
                        </Badge>
                      )}
                    </div>
                    
                    {node.agent && (
                      <div className="text-xs text-zinc-400 mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Zap className="h-3 w-3" />
                          {node.agent}
                        </div>
                        {node.skill && (
                          <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {node.skill}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{node.toolCalls} 工具调用</span>
                      <span>•</span>
                      <span>{node.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector */}
        <div className="w-80 border-l border-border/50 p-4 overflow-auto">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">选中节点</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Architecture</p>
                  <p className="text-xs text-zinc-500">Architecture Agent</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="animate-pulse">运行中</Badge>
                  <Badge variant="secondary">architecture-designer</Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">统计</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-zinc-900">
                      <p className="text-zinc-500">工具调用</p>
                      <p className="font-medium">1</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-900">
                      <p className="text-zinc-500">耗时</p>
                      <p className="font-medium">3m</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-900">
                      <p className="text-zinc-500">Tokens</p>
                      <p className="font-medium">1,250</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-900">
                      <p className="text-zinc-500">成本</p>
                      <p className="font-medium">$0.003</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">输入</p>
                  <div className="p-3 rounded bg-zinc-900 text-xs text-zinc-300">
                    PRD 文档、技术栈偏好、约束条件
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">输出</p>
                  <div className="p-3 rounded bg-zinc-900 text-xs text-zinc-300">
                    系统架构文档、数据库设计、API 设计
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400">下一步建议</p>
                  <div className="p-3 rounded bg-zinc-900 text-xs text-zinc-300">
                    生成 FastAPI 后端代码骨架
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1">
                    查看详情
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    查看 Trace
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">图例</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>已完成</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <span>运行中</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <span>等待中</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>失败</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>等待审批</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
