'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type Tool, type ToolCall } from '@/lib/api-client'
import {
  Loader2,
  Wrench,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ToolsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.tools.list(),
  })

  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ['tool-calls', projectId],
    queryFn: () => api.tools.listCalls(projectId),
    enabled: !!projectId,
  })

  const approveMutation = useMutation({
    mutationFn: (callId: string) => api.tools.approve(projectId, callId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-calls', projectId] })
      toast({ title: '已批准', variant: 'success' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (callId: string) => api.tools.reject(projectId, callId, ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-calls', projectId] })
      toast({ title: '已拒绝', variant: 'success' })
    },
  })

  const tools = toolsData?.tools || []
  const calls = callsData?.data || []

  const PERMISSION_COLOR: Record<string, string> = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-error',
  }

  const CALL_STATUS: Record<string, { icon: React.ElementType; variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    completed: { icon: CheckCircle2, variant: 'success', label: '完成' },
    pending: { icon: Clock, variant: 'warning', label: '待审批' },
    approved: { icon: CheckCircle2, variant: 'success', label: '已批准' },
    rejected: { icon: XCircle, variant: 'destructive', label: '已拒绝' },
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">管理 Agent 可用工具和审批记录</p>
      </div>

      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">工具注册表</TabsTrigger>
          <TabsTrigger value="calls">调用记录 ({calls.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="mt-4">
          {toolsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-violet-500" />
                        {tool.name}
                      </CardTitle>
                      <Badge variant={tool.permission_level === 'high' ? 'destructive' : tool.permission_level === 'medium' ? 'warning' : 'success'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {tool.permission_level}
                      </Badge>
                    </div>
                    <CardDescription>{tool.description || '暂无描述'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {tool.requires_approval && (
                        <span className="flex items-center gap-1 text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          需要审批
                        </span>
                      )}
                      {tool.timeout_seconds && <span>超时: {tool.timeout_seconds}s</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          {callsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : calls.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无调用记录</h3>
                <p className="text-muted-foreground">Agent 运行时的工具调用会记录在这里</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => {
                const status = CALL_STATUS[call.status] || CALL_STATUS.pending
                const StatusIcon = status.icon
                return (
                  <Card key={call.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wrench className="h-5 w-5 text-violet-500" />
                          <div>
                            <p className="font-medium">{call.tool_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(call.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {call.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => approveMutation.mutate(call.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1 text-success" /> 批准
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => rejectMutation.mutate(call.id)}>
                                <XCircle className="h-4 w-4 mr-1 text-error" /> 拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
