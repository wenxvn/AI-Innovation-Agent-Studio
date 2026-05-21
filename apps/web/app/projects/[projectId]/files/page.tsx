'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type Document, type DocumentChunk } from '@/lib/api-client'
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  File,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive'; icon: React.ElementType }> = {
  uploaded: { label: '已上传', variant: 'info', icon: Clock },
  parsing: { label: '解析中', variant: 'warning', icon: Loader2 },
  parsed: { label: '已解析', variant: 'info', icon: FileText },
  indexed: { label: '已索引', variant: 'success', icon: CheckCircle2 },
  failed: { label: '失败', variant: 'destructive', icon: AlertCircle },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FilesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.documents.list(projectId),
    enabled: !!projectId,
  })

  const { data: chunksData } = useQuery({
    queryKey: ['document-chunks', expandedDoc],
    queryFn: () => api.documents.chunks(projectId, expandedDoc!),
    enabled: !!expandedDoc,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.documents.upload(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
      toast({ title: '文件上传成功', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '上传失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.documents.delete(projectId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
      toast({ title: '文件已删除', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  const reindexMutation = useMutation({
    mutationFn: (docId: string) => api.documents.reindex(projectId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
      toast({ title: '重新索引完成', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '索引失败', description: err.message, variant: 'destructive' })
    },
  })

  const documents = docsData?.data || []
  const chunks = chunksData?.data || []

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
      e.target.value = ''
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="text-sm text-muted-foreground mt-1">上传文档资料，支持 RAG 检索</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.pdf"
          onChange={handleFileChange}
        />
        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          上传文件
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有文件</h3>
            <p className="text-muted-foreground mb-4">上传文档资料，Agent 可以在运行时检索相关内容</p>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              上传文件
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = STATUS_MAP[doc.status] || STATUS_MAP.uploaded
            const StatusIcon = status.icon
            const isExpanded = expandedDoc === doc.id

            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="h-5 w-5 text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.filename}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>{doc.file_type}</span>
                          {doc.chunk_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {doc.chunk_count} chunks
                            </span>
                          )}
                          <span>{new Date(doc.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${status.variant === 'warning' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                      {doc.embedding_status && (
                        <Badge variant="secondary" className="text-xs">
                          embedding: {doc.embedding_status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => reindexMutation.mutate(doc.id)}
                        disabled={reindexMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${reindexMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-error"
                        onClick={() => {
                          if (confirm('确定删除此文件及相关 chunks？')) {
                            deleteMutation.mutate(doc.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {doc.summary && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/20 text-sm text-muted-foreground">
                      {doc.summary}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 border-t border-border/50 pt-4">
                      <h4 className="text-sm font-semibold mb-2">文档 Chunks ({doc.chunk_count})</h4>
                      {chunks.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-auto">
                          {chunks.map((chunk) => (
                            <div key={chunk.id} className="p-3 rounded-lg bg-muted/10 border border-border/30">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Chunk #{chunk.chunk_index}</span>
                                <span className="text-xs text-muted-foreground">{chunk.token_count} tokens</span>
                              </div>
                              <p className="text-sm line-clamp-3">{chunk.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无 chunks 数据</p>
                      )}
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
