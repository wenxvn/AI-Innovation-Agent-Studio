'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type Output } from '@/lib/api-client'
import {
  Loader2,
  FileText,
  Download,
  Trash2,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function OutputsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Outputs</h1>
        <p className="text-sm text-muted-foreground mt-1">Agent 生成的产物文档</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && outputs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无产物</h3>
            <p className="text-muted-foreground">Agent 运行后会自动生成产物</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && outputs.length > 0 && (
        <div className="space-y-3">
          {outputs.map((output) => {
            const isExpanded = expandedId === output.id
            return (
              <Card key={output.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{output.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <Badge variant="secondary" className="text-xs">{output.output_type}</Badge>
                          <span>v{output.version}</span>
                          {output.created_by_agent && <span>by {output.created_by_agent}</span>}
                          <span>{new Date(output.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : output.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(output.content)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(output.id, output.title)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-error"
                        onClick={() => { if (confirm('确定删除?')) deleteMutation.mutate(output.id) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border/30 pt-4">
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
    </div>
  )
}
