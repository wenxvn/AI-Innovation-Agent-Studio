'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Bot, 
  ArrowRight, 
  Upload, 
  FileText, 
  Layers, 
  Activity, 
  Clock,
  Zap,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { demoProject, agentRuns, outputs, skills } from '@/lib/mock-data'

const stages = [
  { id: 'ideation', label: 'Project Ideation', status: 'completed' },
  { id: 'requirement', label: 'Requirement Analysis', status: 'completed' },
  { id: 'architecture', label: 'Architecture Design', status: 'current' },
  { id: 'coding', label: 'Code Generation', status: 'pending' },
  { id: 'testing', label: 'Testing & QA', status: 'pending' },
  { id: 'pitch', label: 'Pitch', status: 'pending' }
]

const nextSteps = [
  { label: '上传赛题文件', icon: Upload, href: '/projects/[projectId]/files' },
  { label: '生成项目方向', icon: Target, href: '/projects/[projectId]/chat' },
  { label: '生成 PRD', icon: FileText, href: '/projects/[projectId]/outputs' },
  { label: '生成架构图', icon: Layers, href: '/projects/[projectId]/workflow' }
]

export default function ProjectOverviewPage() {
  const recentRuns = agentRuns.slice(0, 3)
  const recentOutputs = outputs.slice(0, 3)
  const activeSkills = skills.slice(0, 4)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{demoProject.name}</h1>
            <p className="text-zinc-400">{demoProject.description}</p>
          </div>
          <Badge variant="accent" className="text-sm px-4 py-1">
            {demoProject.currentStage}
          </Badge>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {demoProject.goal}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            {demoProject.agentRuns} 次 Agent 运行
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            最后更新: {new Date(demoProject.updatedAt).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>

      {/* Project Stages */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>项目阶段</CardTitle>
          <CardDescription>当前进度和各阶段状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    stage.status === 'completed' 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : stage.status === 'current'
                      ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}>
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : stage.status === 'current' ? (
                      <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${
                    stage.status === 'current' ? 'text-violet-400' : 'text-zinc-500'
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {index < stages.length - 1 && (
                  <div className={`w-20 h-0.5 mx-2 mt-[-20px] ${
                    stage.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Agent Run */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-violet-400" />
                    当前 Agent 运行
                  </CardTitle>
                  <CardDescription>Orchestrator 正在分析用户目标</CardDescription>
                </div>
                <Badge variant="info" className="animate-pulse">
                  运行中
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <p className="text-sm text-zinc-300 mb-2">
                    <span className="text-violet-400 font-medium">Agent:</span> Architecture Agent
                  </p>
                  <p className="text-sm text-zinc-300 mb-2">
                    <span className="text-violet-400 font-medium">Skill:</span> architecture-designer
                  </p>
                  <p className="text-sm text-zinc-300">
                    <span className="text-violet-400 font-medium">任务:</span> 设计系统架构和技术选型
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>已运行 3 分钟</span>
                  <span>•</span>
                  <span>消耗 1,250 tokens</span>
                  <span>•</span>
                  <span>调用 1 个工具</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm">
                    查看详情
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="sm">
                    查看 Trace
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Agent Runs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>最近 Agent 运行</CardTitle>
                  <CardDescription>最近 3 次 Agent 运行记录</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/projects/[projectId]/chat">
                    查看全部
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'completed' ? 'bg-emerald-400' :
                        run.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        run.status === 'failed' ? 'bg-red-400' : 'bg-zinc-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{run.agentName}</p>
                        <p className="text-xs text-zinc-500">{run.input}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {run.status === 'completed' && (
                        <>
                          <span>{run.latencyMs}ms</span>
                          <span>{run.tokenUsage} tokens</span>
                        </>
                      )}
                      <Badge 
                        variant={
                          run.status === 'completed' ? 'success' :
                          run.status === 'running' ? 'info' :
                          run.status === 'failed' ? 'error' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {run.status === 'completed' ? '完成' :
                         run.status === 'running' ? '运行中' :
                         run.status === 'failed' ? '失败' : '等待'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Outputs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>最近生成产物</CardTitle>
                  <CardDescription>系统生成的文档和代码</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/projects/[projectId]/outputs">
                    查看全部
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentOutputs.map((output) => (
                  <div key={output.id} className="p-4 rounded-lg border border-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <FileText className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">{output.title}</p>
                        <p className="text-xs text-zinc-500">
                          {output.createdByAgent} • v{output.version}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">推荐下一步</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href={step.href.replace('[projectId]', 'demo-project-001')}>
                      <Icon className="h-4 w-4 mr-2" />
                      {step.label}
                    </Link>
                  </Button>
                )
              })}
            </CardContent>
          </Card>

          {/* Active Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">活跃技能</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSkills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                  <div className="p-1.5 rounded-md bg-violet-500/10">
                    <Zap className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{skill.name}</p>
                    <p className="text-xs text-zinc-500">v{skill.version}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Project Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">项目统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">进度</span>
                <span className="text-sm font-medium">{demoProject.progress}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Agent 运行</span>
                <span className="text-sm font-medium">{demoProject.agentRuns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">生成产物</span>
                <span className="text-sm font-medium">{outputs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">平均评分</span>
                <span className="text-sm font-medium text-emerald-400">92</span>
              </div>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">技术栈</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {demoProject.techStack.map((tech, index) => (
                  <Badge key={index} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
