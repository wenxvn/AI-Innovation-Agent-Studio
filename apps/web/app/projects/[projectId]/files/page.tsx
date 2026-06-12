'use client'

import { type ComponentType, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, Database, File, FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { api, type Document, type DocumentChunk } from '@/lib/api-client'

type StatusConfig = {
  label: string
  variant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive'
  icon: ComponentType<{ className?: string }>
}

type UploadState = {
  filename: string
  progress: number
  phase: 'uploading' | 'indexing' | 'complete' | 'failed'
  message?: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  uploaded: { label: '已上传', variant: 'info', icon: Clock },
  parsing: { label: '解析中', variant: 'warning', icon: Loader2 },
  parsed: { label: '已解析', variant: 'info', icon: FileText },
  indexed: { label: '已索引', variant: 'success', icon: CheckCircle2 },
  failed: { label: '失败', variant: 'destructive', icon: AlertCircle },
}

const EMBEDDING_STATUS_LABELS: Record<string, string> = {
  pending: '等待向量化',
  mock: 'Mock 向量',
  real: '真实向量',
  failed: '向量失败',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMetadataError(doc: Document): string {
  const metadata = doc.metadata_ || {}
  const lastError = metadata.last_error
  const parseError = metadata.parse_error
  const indexError = metadata.index_error

  for (const item of [lastError, parseError, indexError]) {
    if (item && typeof item === 'object' && 'message' in item) {
      const message = (item as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
  }

  return ''
}

function getDocumentError(doc: Document): string {
  return doc.error_message || getMetadataError(doc)
}

function UploadProgressPanel({ state }: { state: UploadState }) {
  const isFailed = state.phase === 'failed'
  const isComplete = state.phase === 'complete'
  const label = isFailed
    ? '上传或解析失败'
    : isComplete
      ? '已完成'
      : state.phase === 'indexing'
        ? '正在解析和索引'
        : '正在上传'

  return (
    <div className={`mb-4 rounded-lg border p-4 ${isFailed ? 'border-error/40 bg-error/5' : 'border-border bg-card'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{state.filename}</p>
          <p className={`text-xs ${isFailed ? 'text-error' : 'text-muted-foreground'}`}>
            {state.message || label}
          </p>
        </div>
        <Badge variant={isFailed ? 'destructive' : isComplete ? 'success' : 'warning'}>
          {isFailed ? <AlertCircle className="mr-1 h-3 w-3" /> : isComplete ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {label}
        </Badge>
      </div>
      {!isFailed && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.progress}
          />
        </div>
      )}
    </div>
  )
}

function DocumentMeta({ doc }: { doc: Document }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{formatFileSize(doc.file_size)}</span>
      <span>{doc.file_type.replace('.', '').toUpperCase()}</span>
      {doc.chunk_count > 0 && (
        <span className="inline-flex items-center gap-1">
          <Database className="h-3 w-3" />
          {doc.chunk_count} 个分块
        </span>
      )}
      <span>{new Date(doc.created_at).toLocaleString('zh-CN')}</span>
    </div>
  )
}

function ChunkList({
  chunks,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  chunks: DocumentChunk[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载分块
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error sm:flex-row sm:items-center sm:justify-between">
        <span>{error?.message || '分块加载失败'}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          重试
        </Button>
      </div>
    )
  }

  if (chunks.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无分块数据</p>
  }

  return (
    <div className="max-h-72 space-y-2 overflow-auto pr-1">
      {chunks.map((chunk) => (
        <div key={chunk.id} className="rounded-lg border border-border/40 bg-muted/10 p-3">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">分块 #{chunk.chunk_index}</span>
            <span className="text-xs text-muted-foreground">{chunk.token_count} tokens</span>
          </div>
          <p className="line-clamp-3 text-sm leading-6">{chunk.content}</p>
        </div>
      ))}
    </div>
  )
}

export default function FilesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [reindexingDocId, setReindexingDocId] = useState<string | null>(null)

  const {
    data: docsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.documents.list(projectId),
    enabled: !!projectId,
  })

  const {
    data: chunksData,
    isLoading: chunksLoading,
    isError: chunksIsError,
    error: chunksError,
    refetch: refetchChunks,
  } = useQuery({
    queryKey: ['document-chunks', projectId, expandedDoc],
    queryFn: () => api.documents.chunks(projectId, expandedDoc!),
    enabled: !!projectId && !!expandedDoc,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadState({ filename: file.name, progress: 0, phase: 'uploading' })
      return api.documents.upload(projectId, file, (progress) => {
        setUploadState((current) => {
          if (!current || current.filename !== file.name) return current
          return {
            ...current,
            progress,
            phase: progress >= 100 ? 'indexing' : 'uploading',
            message: progress >= 100 ? '上传完成，正在解析和索引' : undefined,
          }
        })
      })
    },
    onSuccess: (response) => {
      const doc = response.data
      const docError = getDocumentError(doc)
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })

      if (doc.status === 'failed') {
        setUploadState({
          filename: doc.filename,
          progress: 100,
          phase: 'failed',
          message: docError || '文件已上传，但解析或索引失败。',
        })
        toast({ title: '文件解析失败', description: docError, variant: 'destructive' })
        return
      }

      setUploadState({
        filename: doc.filename,
        progress: 100,
        phase: 'complete',
        message: `${doc.chunk_count} 个分块已加入索引`,
      })
      toast({ title: '文件已上传并索引', variant: 'success' })
    },
    onError: (err: Error) => {
      setUploadState((current) => ({
        filename: current?.filename || '上传文件',
        progress: current?.progress || 0,
        phase: 'failed',
        message: err.message,
      }))
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
    mutationFn: async (docId: string) => {
      setReindexingDocId(docId)
      return api.documents.reindex(projectId, docId)
    },
    onSuccess: (response) => {
      const doc = response.data
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
      queryClient.invalidateQueries({ queryKey: ['document-chunks', projectId, doc.id] })

      if (doc.status === 'failed') {
        toast({
          title: '重新索引失败',
          description: getDocumentError(doc) || '请检查文件内容后重试。',
          variant: 'destructive',
        })
        return
      }

      toast({ title: '重新索引完成', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '重新索引失败', description: err.message, variant: 'destructive' })
    },
    onSettled: () => {
      setReindexingDocId(null)
    },
  })

  const documents = docsData?.data || []
  const chunks = chunksData?.data || []
  const failedCount = useMemo(() => documents.filter((doc) => doc.status === 'failed').length, [documents])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    event.target.value = ''
  }

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">文件管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">上传 TXT、Markdown 或 PDF，索引后可用于项目检索。</p>
          {documents.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{documents.length} 个文件</Badge>
              <Badge variant={failedCount > 0 ? 'destructive' : 'success'}>{failedCount} 个失败</Badge>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.pdf"
          aria-label="Document upload file"
          onChange={handleFileChange}
        />
        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="w-full sm:w-auto"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          上传文件
        </Button>
      </div>

      {uploadState && <UploadProgressPanel state={uploadState} />}

      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <AlertCircle className="h-12 w-12 text-error" />
            <div>
              <h3 className="text-lg font-semibold">文件列表加载失败</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error?.message || '请稍后重试。'}</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && documents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="mb-2 text-lg font-semibold">还没有文件</h3>
            <p className="mb-4 text-sm text-muted-foreground">上传项目资料后，Agent 可以在运行时检索相关内容。</p>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              上传文件
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = STATUS_MAP[doc.status] || STATUS_MAP.uploaded
            const StatusIcon = status.icon
            const isExpanded = expandedDoc === doc.id
            const isReindexing = reindexingDocId === doc.id
            const docError = getDocumentError(doc)
            const embeddingLabel = EMBEDDING_STATUS_LABELS[doc.embedding_status] || doc.embedding_status

            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <File className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.filename}</p>
                        <DocumentMeta doc={doc} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge variant={status.variant}>
                        <StatusIcon className={`mr-1 h-3 w-3 ${doc.status === 'parsing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                      {doc.embedding_status && (
                        <Badge variant={doc.embedding_status === 'failed' ? 'destructive' : 'secondary'}>
                          {embeddingLabel}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={isExpanded ? '收起分块' : '查看分块'}
                        onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={doc.status === 'failed' ? 'outline' : 'ghost'}
                        size={doc.status === 'failed' ? 'sm' : 'icon'}
                        className={doc.status === 'failed' ? 'h-8' : 'h-8 w-8'}
                        title={doc.status === 'failed' ? '重试索引' : '重新索引'}
                        onClick={() => reindexMutation.mutate(doc.id)}
                        disabled={isReindexing}
                      >
                        {isReindexing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className={`h-4 w-4 ${doc.status === 'failed' ? 'mr-2' : ''}`} />
                        )}
                        {doc.status === 'failed' && <span>{isReindexing ? '索引中' : '重试'}</span>}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-error"
                        title="删除文件"
                        onClick={() => {
                          if (confirm('确定删除此文件及相关分块吗？')) {
                            deleteMutation.mutate(doc.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {doc.status === 'failed' && docError && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{docError}</span>
                    </div>
                  )}

                  {doc.status !== 'failed' && doc.summary && (
                    <div className="mt-3 rounded-lg bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                      {doc.summary}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 border-t border-border/50 pt-4">
                      <CardHeader className="mb-3 p-0">
                        <CardTitle className="text-sm">文档分块 ({doc.chunk_count})</CardTitle>
                      </CardHeader>
                      <ChunkList
                        chunks={chunks}
                        isLoading={chunksLoading}
                        isError={chunksIsError}
                        error={chunksError as Error | null}
                        onRetry={() => refetchChunks()}
                      />
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
