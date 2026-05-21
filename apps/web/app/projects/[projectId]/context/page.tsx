'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type Memory, type Document } from '@/lib/api-client'
import { Loader2, Database, Brain, FileText, Search } from 'lucide-react'

export default function ContextPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: memData, isLoading: memLoading } = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => api.memory.list(projectId),
    enabled: !!projectId,
  })

  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.documents.list(projectId),
    enabled: !!projectId,
  })

  const memories = memData?.data || []
  const documents = docData?.data || []
  const isLoading = memLoading || docLoading
  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0)

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Context Pack</h1>
        <p className="text-sm text-muted-foreground mt-1">项目上下文信息总览</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="h-8 w-8 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">{memories.length}</p>
                <p className="text-sm text-muted-foreground">Memory 条目</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">文档数量</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto text-cyan-500 mb-2" />
                <p className="text-2xl font-bold">{totalChunks}</p>
                <p className="text-sm text-muted-foreground">可检索 Chunks</p>
              </CardContent>
            </Card>
          </div>

          {memories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  Relevant Memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {memories.slice(0, 10).map((mem) => (
                  <div key={mem.id} className="p-3 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="accent" className="text-xs">{mem.memory_type}</Badge>
                      <span className="text-xs text-muted-foreground">可信度 {(mem.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-sm">{mem.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  Retrieved Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-lg bg-muted/10 border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-500" />
                        <span className="font-medium">{doc.filename}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.status === 'indexed' ? 'success' : 'warning'} className="text-xs">{doc.status}</Badge>
                        <span className="text-xs text-muted-foreground">{doc.chunk_count} chunks</span>
                      </div>
                    </div>
                    {doc.summary && <p className="text-xs text-muted-foreground mt-2">{doc.summary}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isLoading && memories.length === 0 && documents.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无上下文</h3>
                <p className="text-muted-foreground">上传文档或运行 Agent 以积累上下文信息</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
