'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FolderOpen, 
  Clock, 
  Activity, 
  FileText, 
  BarChart3,
  ArrowRight,
  Bot,
  Layers,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { projects, agentRuns, outputs } from '@/lib/mock-data'

export default function DashboardPage() {
  const recentRuns = agentRuns.slice(0, 3)
  const recentOutputs = outputs.slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-violet-400" />
              <span className="text-xl font-bold">智创工坊</span>
            </Link>
            <Badge variant="accent">Dashboard</Badge>
          </div>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            新建项目
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">欢迎回来</h1>
          <p className="text-zinc-400">
            管理你的 AI 项目，查看 Agent 运行状态和生成产物
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">项目总数</p>
                  <p className="text-3xl font-bold">{projects.length}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-violet-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Agent 运行</p>
                  <p className="text-3xl font-bold">{agentRuns.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">生成产物</p>
                  <p className="text-3xl font-bold">{outputs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">平均评分</p>
                  <p className="text-3xl font-bold">92</p>
                </div>
                <BarChart3 className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">项目列表</h2>
              <Button variant="ghost" size="sm">
                查看全部
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:border-violet-500/30 transition-colors cursor-pointer">
                  <Link href={`/projects/${project.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                          <p className="text-sm text-zinc-400">{project.description}</p>
                        </div>
                        <Badge 
                          variant={
                            project.status === 'active' ? 'success' : 
                            project.status === 'completed' ? 'info' : 'secondary'
                          }
                        >
                          {project.status === 'active' ? '进行中' : 
                           project.status === 'completed' ? '已完成' : '已归档'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Layers className="h-4 w-4" />
                          {project.currentStage}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {project.agentRuns} 次运行
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        {project.techStack.slice(0, 4).map((tech, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {project.techStack.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{project.techStack.length - 4}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-zinc-400">{project.progress}%</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recent Agent Runs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">最近运行</h2>
                <Button variant="ghost" size="sm">
                  查看全部
                </Button>
              </div>
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <Card key={run.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{run.agentName}</span>
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
                      <p className="text-xs text-zinc-500 truncate">{run.input}</p>
                      {run.status === 'completed' && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
                          <span>{run.latencyMs}ms</span>
                          <span>•</span>
                          <span>{run.tokenUsage} tokens</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Outputs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">最近产物</h2>
                <Button variant="ghost" size="sm">
                  查看全部
                </Button>
              </div>
              <div className="space-y-3">
                {recentOutputs.map((output) => (
                  <Card key={output.id} className="hover:border-violet-500/30 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <FileText className="h-4 w-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{output.title}</p>
                          <p className="text-xs text-zinc-500">
                            {output.createdByAgent} • v{output.version}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="h-4 w-4 mr-2" />
                  上传赛题文件
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  生成项目方向
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  查看评估报告
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
