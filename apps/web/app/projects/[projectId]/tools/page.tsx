'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  Search, 
  Settings, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react'
import { tools } from '@/lib/mock-data'

const getPermissionColor = (level: string) => {
  switch (level) {
    case 'low': return 'success'
    case 'medium': return 'warning'
    case 'high': return 'error'
    default: return 'secondary'
  }
}

export default function ToolsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Tool Gateway</h1>
          <p className="text-zinc-400">管理和监控工具调用</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            搜索工具
          </Button>
          <Button variant="primary" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            工具配置
          </Button>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card key={tool.id} className="hover:border-violet-500/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Wrench className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    <p className="text-xs text-zinc-500">{tool.description}</p>
                  </div>
                </div>
                <Badge variant={getPermissionColor(tool.permissionLevel)} className="text-xs">
                  {tool.permissionLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-zinc-900 text-center">
                  <p className="text-xs text-zinc-500">调用次数</p>
                  <p className="text-sm font-semibold">{tool.recentCalls}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 text-center">
                  <p className="text-xs text-zinc-500">成功率</p>
                  <p className="text-sm font-semibold text-emerald-400">{tool.successRate}%</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900 text-center">
                  <p className="text-xs text-zinc-500">平均耗时</p>
                  <p className="text-sm font-semibold">{tool.avgLatencyMs}ms</p>
                </div>
              </div>
              
              {/* Schema */}
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-2">输入 Schema</p>
                <div className="p-2 rounded bg-zinc-900 font-mono text-xs text-zinc-400">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-2">输出 Schema</p>
                <div className="p-2 rounded bg-zinc-900 font-mono text-xs text-zinc-400">
                  {JSON.stringify(tool.outputSchema, null, 2)}
                </div>
              </div>
              
              {/* Permissions */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  {tool.requiresApproval ? (
                    <Badge variant="warning" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      需要审批
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      自动执行
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {tool.timeoutSeconds}s 超时
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  统计
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  配置
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tool Call History */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>最近工具调用</CardTitle>
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { tool: 'RAG Search Tool', agent: 'Research Agent', status: 'completed', time: '2s', cost: '$0.001' },
              { tool: 'File Tool', agent: 'Architecture Agent', status: 'completed', time: '50ms', cost: '$0.0001' },
              { tool: 'Web Search Tool', agent: 'Research Agent', status: 'completed', time: '1.5s', cost: '$0.002' },
              { tool: 'Eval Tool', agent: 'Product Agent', status: 'completed', time: '2.5s', cost: '$0.003' }
            ].map((call, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-violet-500/10">
                    <Wrench className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{call.tool}</p>
                    <p className="text-xs text-zinc-500">{call.agent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">{call.time}</span>
                  <span className="text-xs text-zinc-500">{call.cost}</span>
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    成功
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High Risk Tools */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <CardTitle>高风险工具 (需人工确认)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              '执行 shell 命令',
              '删除文件',
              '修改数据库',
              '提交 GitHub PR',
              '调用外部付费 API',
              '部署服务',
              '发送邮件',
              '覆盖已有代码'
            ].map((action, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-zinc-400">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                {action}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
