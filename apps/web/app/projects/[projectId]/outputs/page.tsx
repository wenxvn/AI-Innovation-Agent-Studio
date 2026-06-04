'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { api, type Output } from '@/lib/api-client'
import {
  Loader2,
  FileText,
  Download,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Code,
  FileCode,
  BarChart3,
  Layers,
  Clock,
  Eye,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const OUTPUT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  analysis: { icon: BarChart3, color: 'text-violet-500 bg-violet-500/10', label: '分析报告' },
  idea_report: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', label: '创意报告' },
  prd: { icon: FileText, color: 'text-cyan-500 bg-cyan-500/10', label: 'PRD' },
  architecture: { icon: Layers, color: 'text-indigo-500 bg-indigo-500/10', label: '架构设计' },
  research_report: { icon: FileText, color: 'text-emerald-500 bg-emerald-500/10', label: '调研报告' },
  pitch: { icon: FileText, color: 'text-amber-500 bg-amber-500/10', label: '答辩稿' },
  backend_code: { icon: Code, color: 'text-red-500 bg-red-500/10', label: '后端代码' },
  frontend_code: { icon: Code, color: 'text-pink-500 bg-pink-500/10', label: '前端代码' },
  test_report: { icon: FileText, color: 'text-teal-500 bg-teal-500/10', label: '测试报告' },
  api_doc: { icon: FileCode, color: 'text-orange-500 bg-orange-500/10', label: 'API 文档' },
}

function getOutputConfig(type: string) {
  return OUTPUT_TYPE_CONFIG[type] || { icon: FileText, color: 'text-gray-500 bg-gray-500/10', label: type }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN')
}

export default function OutputsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['outputs', projectId],
    queryFn: () => api.outputs.list(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.outputs.delete(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outputs', projectId] })
      toast({ title: '产物已删除', variant: 'success' })
    },
  })

  const outputs = data?.data || []

  const filteredOutputs = selectedType === 'all'
    ? outputs
    : outputs.filter(o => o.output_type === selectedType)

  const outputsByType = outputs.reduce((acc, output) => {
    const type = output.output_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(output)
    return acc
  }, {} as Record<string, Output[]>)

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({ title: '已复制到剪贴板', variant: 'success' })
  }

  const handleDownload = (outputId: string, title: string) => {
    const url = `${API_BASE}/api/v1/projects/${projectId}/outputs/${outputId}/download`
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">产物</h1>
        <p className="text-sm text-muted-foreground mt-1">智能体生成的产物文档</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">{outputs.length}</p>
                <p className="text-xs text-muted-foreground">总产物数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Code className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">
                  {outputs.filter(o => ['backend_code', 'frontend_code'].includes(o.output_type)).length}
                </p>
                <p className="text-xs text-muted-foreground">代码文件</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto text-cyan-500 mb-2" />
                <p className="text-2xl font-bold">
                  {outputs.filter(o => ['prd', 'architecture', 'research_report'].includes(o.output_type)).length}
                </p>
                <p className="text-xs text-muted-foreground">文档报告</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Layers className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">
                  {Object.keys(outputsByType).length}
                </p>
                <p className="text-xs text-muted-foreground">产物类型</p>
              </CardContent>
            </Card>
          </div>

          {/* Type Filter */}
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setSelectedType('all')}>
                全部 ({outputs.length})
              </TabsTrigger>
              {Object.entries(outputsByType).map(([type, typeOutputs]) => {
                const config = getOutputConfig(type)
                return (
                  <TabsTrigger key={type} value={type} onClick={() => setSelectedType(type)}>
                    {config.label} ({typeOutputs.length})
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          {/* Outputs List */}
          {filteredOutputs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无产物</h3>
                <p className="text-muted-foreground">
                  {selectedType === 'all' ? 'Agent 运行后会自动生成产物' : `暂无 ${getOutputConfig(selectedType).label} 类型的产物`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOutputs.map((output) => {
                const isExpanded = expandedId === output.id
                const config = getOutputConfig(output.output_type)
                const Icon = config.icon

                return (
                  <Card key={output.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{output.title}</p>
                              <Badge variant="secondary" className="text-xs shrink-0">{config.label}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(output.created_at)}
                              </span>
                              <span>v{output.version}</span>
                              {output.created_by_agent && <span>来源 {output.created_by_agent}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setExpandedId(isExpanded ? null : output.id)}
                            title="预览"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopy(output.content)}
                            title="复制"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(output.id, output.title)}
                            title="下载"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-error"
                            onClick={() => {
                              if (confirm('确定删除此产物？')) deleteMutation.mutate(output.id)
                            }}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 border-t border-border/30 pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">内容预览</p>
                            <Badge variant="outline" className="text-xs">
                              {output.content.length} 字符
                            </Badge>
                          </div>
                          <pre className="text-sm whitespace-pre-wrap p-4 rounded-lg bg-muted/10 border border-border/30 max-h-96 overflow-auto">
                            {output.content}
                          </pre>
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
