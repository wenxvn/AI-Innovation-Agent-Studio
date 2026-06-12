'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ReactMarkdown, { type Components } from 'react-markdown'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Archive, Braces, Calendar, CheckCircle2, Code, Copy, Download, Eye, FileText, Filter, Layers, Loader2, PackageOpen, RefreshCw, Search, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { api, type Output } from '@/lib/api-client'

type BadgeVariant = 'success' | 'warning' | 'info' | 'secondary' | 'destructive' | 'outline' | 'accent'

interface AssetTypeConfig {
  label: string
  group: string
  icon: ElementType
  tone: string
  badge: BadgeVariant
}

const OUTPUT_TYPE_CONFIG: Record<string, AssetTypeConfig> = {
  prd: { label: 'PRD', group: 'Product', icon: FileText, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', badge: 'info' },
  architecture: { label: '架构', group: 'System design', icon: Layers, tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', badge: 'accent' },
  research_report: { label: '研究报告', group: 'Research', icon: FileText, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', badge: 'success' },
  analysis_report: { label: '分析报告', group: 'Analysis', icon: Archive, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', badge: 'warning' },
  idea_report: { label: '创意报告', group: 'Ideation', icon: FileText, tone: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400', badge: 'accent' },
  backend_code: { label: '后端代码', group: 'Code', icon: Code, tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', badge: 'destructive' },
  frontend_code: { label: '前端代码', group: 'Code', icon: Code, tone: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', badge: 'info' },
  api_doc: { label: 'API 文档', group: 'Contract', icon: Braces, tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', badge: 'warning' },
  test_report: { label: '测试报告', group: 'Quality', icon: CheckCircle2, tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', badge: 'success' },
  pitch: { label: '答辩材料', group: 'Presentation', icon: FileText, tone: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', badge: 'accent' },
  agent_output: { label: 'Agent 输出', group: 'General', icon: FileText, tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', badge: 'secondary' },
  document: { label: '文档', group: 'General', icon: FileText, tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', badge: 'secondary' },
}

const STATUS_CONFIG: Record<string, { label: string; badge: BadgeVariant }> = {
  completed: { label: '已完成', badge: 'success' },
  ready: { label: '可交付', badge: 'success' },
  published: { label: '已发布', badge: 'success' },
  draft: { label: '草稿', badge: 'warning' },
  pending: { label: '等待中', badge: 'secondary' },
  failed: { label: '失败', badge: 'destructive' },
}

const DELIVERY_TYPES = new Set(['prd', 'architecture', 'research_report', 'analysis_report', 'api_doc', 'test_report'])
const CODE_TYPES = new Set(['backend_code', 'frontend_code'])

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-0 border-b border-border pb-3 text-3xl font-bold leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-8 border-b border-border/60 pb-2 text-2xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-xl font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-5 text-base font-semibold">{children}</h4>,
  p: ({ children }) => <p className="my-4 leading-7 text-card-foreground">{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-5 border-l-4 border-sky-500 bg-sky-500/5 py-2 pl-4 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-8 border-border" />,
  a: ({ children, href }) => <a href={href} className="text-sky-600 underline underline-offset-4 dark:text-sky-400" target="_blank" rel="noreferrer">{children}</a>,
  code: ({ children, className }) => <code className={`rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[0.9em] ${className || ''}`}>{children}</code>,
  pre: ({ children }) => <pre className="my-5 max-h-[520px] overflow-auto rounded-md border border-border bg-slate-950 p-4 text-sm leading-6 text-slate-100">{children}</pre>,
  table: ({ children }) => <div className="my-5 overflow-auto rounded-md border border-border"><table className="w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border-b border-border bg-muted/20 px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-3 py-2 align-top">{children}</td>,
}

function getOutputConfig(type: string): AssetTypeConfig {
  return OUTPUT_TYPE_CONFIG[type] || {
    label: humanize(type || 'output'),
    group: 'Other',
    icon: FileText,
    tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    badge: 'secondary',
  }
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: humanize(status || 'unknown'), badge: 'outline' as BadgeVariant }
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getContentStats(content: string) {
  const trimmed = content.trim()
  return {
    characters: content.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: trimmed ? content.split(/\r\n|\r|\n/).length : 0,
  }
}

function isCodeOutput(output: Output): boolean {
  return CODE_TYPES.has(output.output_type) || output.content_type === 'code'
}

function looksLikeMarkdown(content: string): boolean {
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*]\s|\d+\.\s|>\s|```)/.test(content)
}

function fallbackDownloadName(output: Output): string {
  const base = (output.file_name || output.title || 'output')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return base.toLowerCase().endsWith('.md') ? base : `${base || 'output'}.md`
}

export default function OutputsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const outputsQuery = useQuery({
    queryKey: ['outputs', projectId],
    queryFn: () => api.outputs.list(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.outputs.delete(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outputs', projectId] })
      toast({ title: 'Output deleted', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' })
    },
  })

  const outputs = outputsQuery.data?.data || []

  const typeOptions = useMemo(() => {
    return Array.from(new Set(outputs.map((output) => output.output_type || 'document'))).sort((a, b) =>
      getOutputConfig(a).label.localeCompare(getOutputConfig(b).label),
    )
  }, [outputs])

  const statusOptions = useMemo(() => {
    return Array.from(new Set(outputs.map((output) => output.status || 'draft'))).sort((a, b) =>
      getStatusConfig(a).label.localeCompare(getStatusConfig(b).label),
    )
  }, [outputs])

  const filteredOutputs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return outputs.filter((output) => {
      const matchesType = typeFilter === 'all' || output.output_type === typeFilter
      const matchesStatus = statusFilter === 'all' || output.status === statusFilter
      const searchable = [
        output.title,
        output.output_type,
        output.status,
        output.created_by_agent,
        output.file_name,
        output.content,
      ].join(' ').toLowerCase()
      return matchesType && matchesStatus && (!query || searchable.includes(query))
    })
  }, [outputs, search, statusFilter, typeFilter])

  useEffect(() => {
    if (filteredOutputs.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredOutputs.some((output) => output.id === selectedId)) {
      setSelectedId(filteredOutputs[0].id)
    }
  }, [filteredOutputs, selectedId])

  const selectedOutput = filteredOutputs.find((output) => output.id === selectedId) || null
  const hasFilters = Boolean(search.trim()) || typeFilter !== 'all' || statusFilter !== 'all'
  const documentCount = outputs.filter((output) => DELIVERY_TYPES.has(output.output_type)).length
  const codeCount = outputs.filter((output) => CODE_TYPES.has(output.output_type)).length
  const readyCount = outputs.filter((output) => ['completed', 'ready', 'published'].includes(output.status)).length

  async function handleCopy(output: Output) {
    setActionError(null)
    setCopyingId(output.id)
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is not available in this browser.')
      }
      await navigator.clipboard.writeText(output.content || '')
      toast({ title: 'Copied to clipboard', variant: 'success' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Copy failed'
      setActionError(message)
      toast({ title: 'Copy failed', description: message, variant: 'destructive' })
    } finally {
      setCopyingId(null)
    }
  }

  async function handleDownload(output: Output) {
    setActionError(null)
    setDownloadingId(output.id)
    try {
      const exported = await api.outputs.download(projectId, output.id, 'markdown')
      const url = URL.createObjectURL(exported.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exported.filename || fallbackDownloadName(output)
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast({ title: 'Markdown download started', variant: 'success' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      setActionError(message)
      toast({ title: 'Download failed', description: message, variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  function resetFilters() {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-2xl font-bold">产物</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            只读预览项目生成的 PRD、架构、研究报告和代码产物，像交付资产一样浏览和导出。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => outputsQuery.refetch()} disabled={outputsQuery.isFetching}>
          {outputsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新
        </Button>
      </div>

      {outputsQuery.isLoading && <LoadingState />}

      {outputsQuery.isError && (
        <ErrorState
          message={outputsQuery.error instanceof Error ? outputsQuery.error.message : 'Unable to load outputs.'}
          onRetry={() => outputsQuery.refetch()}
        />
      )}

      {!outputsQuery.isLoading && !outputsQuery.isError && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={FileText} label="总数" value={outputs.length} tone="text-sky-600 dark:text-sky-400" />
            <StatCard icon={Archive} label="文档类" value={documentCount} tone="text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={Code} label="代码类" value={codeCount} tone="text-rose-600 dark:text-rose-400" />
            <StatCard icon={CheckCircle2} label="可交付" value={readyCount} tone="text-teal-600 dark:text-teal-400" />
          </div>

          <Card className="mb-5">
            <CardContent className="p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索标题、内容、智能体或文件名"
                    className="pl-9"
                  />
                </div>
                <label className="relative">
                  <span className="sr-only">Type filter</span>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">全部类型</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {getOutputConfig(type).label}
                      </option>
                    ))}
                  </select>
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </label>
                <label className="relative">
                  <span className="sr-only">Status filter</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">全部状态</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusConfig(status).label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button variant="outline" onClick={resetFilters} disabled={!hasFilters}>
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>

          {actionError && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-md border border-error/25 bg-error/10 p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">产物操作失败</p>
                <p>{actionError}</p>
              </div>
            </div>
          )}

          {outputs.length === 0 ? (
            <EmptyState projectId={projectId} />
          ) : filteredOutputs.length === 0 ? (
            <NoResultsState onReset={resetFilters} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-3">
                {filteredOutputs.map((output) => (
                  <OutputListItem
                    key={output.id}
                    output={output}
                    isSelected={selectedOutput?.id === output.id}
                    isCopying={copyingId === output.id}
                    isDownloading={downloadingId === output.id}
                    isDeleting={deleteMutation.isPending}
                    onSelect={() => setSelectedId(output.id)}
                    onPreview={() => setSelectedId(output.id)}
                    onCopy={() => handleCopy(output)}
                    onDownload={() => handleDownload(output)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${output.title}"?`)) {
                        deleteMutation.mutate(output.id)
                      }
                    }}
                  />
                ))}
              </div>

              <AssetPreviewCard
                output={selectedOutput}
                isCopying={Boolean(selectedOutput && copyingId === selectedOutput.id)}
                isDownloading={Boolean(selectedOutput && downloadingId === selectedOutput.id)}
                onCopy={() => selectedOutput && handleCopy(selectedOutput)}
                onDownload={() => selectedOutput && handleDownload(selectedOutput)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-muted/20 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function OutputListItem({
  output,
  isSelected,
  isCopying,
  isDownloading,
  isDeleting,
  onSelect,
  onPreview,
  onCopy,
  onDownload,
  onDelete,
}: {
  output: Output
  isSelected: boolean
  isCopying: boolean
  isDownloading: boolean
  isDeleting: boolean
  onSelect: () => void
  onPreview: () => void
  onCopy: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const config = getOutputConfig(output.output_type)
  const status = getStatusConfig(output.status)
  const Icon = config.icon
  const stats = getContentStats(output.content || '')

  return (
    <Card className={`transition-colors ${isSelected ? 'border-sky-500/60 bg-sky-500/5' : 'hover:border-border/80'}`}>
      <CardContent className="p-4">
        <button type="button" className="block w-full text-left" onClick={onSelect}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${config.tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{output.title || '未命名产物'}</p>
                <Badge variant={status.badge} className="shrink-0 text-[10px]">
                  {status.label}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={config.badge} className="text-[10px]">
                  {config.label}
                </Badge>
                <span>v{output.version}</span>
                <span>{stats.lines} 行</span>
              </div>
            </div>
          </div>
        </button>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {output.created_by_agent || '未知智能体'}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="预览" aria-label="预览" onClick={onPreview}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="复制 Markdown" aria-label="复制 Markdown" onClick={onCopy} disabled={isCopying}>
              {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="下载 Markdown" aria-label="下载 Markdown" onClick={onDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-error" title="删除产物" aria-label="删除产物" onClick={onDelete} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AssetPreviewCard({
  output,
  isCopying,
  isDownloading,
  onCopy,
  onDownload,
}: {
  output: Output | null
  isCopying: boolean
  isDownloading: boolean
  onCopy: () => void
  onDownload: () => void
}) {
  if (!output) {
    return (
      <Card className="min-h-[520px]">
        <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-10 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">选择一个产物</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">从左侧列表选择一项，查看它的只读 Markdown 交付预览。</p>
        </CardContent>
      </Card>
    )
  }

  const config = getOutputConfig(output.output_type)
  const status = getStatusConfig(output.status)
  const stats = getContentStats(output.content || '')
  const Icon = config.icon

  return (
    <Card className="min-h-[640px] overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${config.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <Badge variant={config.badge}>{config.label}</Badge>
              <Badge variant={status.badge}>{status.label}</Badge>
              <Badge variant="outline">v{output.version}</Badge>
            </div>
            <CardTitle className="text-2xl leading-tight">{output.title || '未命名产物'}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />更新于 {formatDateTime(output.updated_at)}</span>
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{output.created_by_agent || '未知智能体'}</span>
              <span>{stats.words} 词</span>
              <span>{stats.characters} 字符</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={onCopy} disabled={isCopying}>
              {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              复制
            </Button>
            <Button variant="primary" size="sm" onClick={onDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              下载 Markdown
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <AssetPreview output={output} />
      </CardContent>
    </Card>
  )
}

function AssetPreview({ output }: { output: Output }) {
  const content = output.content || ''
  if (!content.trim()) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center p-10 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">暂无正文</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">这个产物已有记录，但正文为空。</p>
      </div>
    )
  }

  if (isCodeOutput(output) && !looksLikeMarkdown(content)) {
    return (
      <div className="bg-slate-950">
        <pre className="max-h-[760px] overflow-auto p-5 text-sm leading-6 text-slate-100">
          <code>{content}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="max-h-[760px] overflow-auto bg-card px-6 py-5">
      <article className="mx-auto max-w-3xl text-sm">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </article>
    </div>
  )
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-sky-600 dark:text-sky-400" />
        <h2 className="text-lg font-semibold">正在加载产物</h2>
        <p className="mt-2 text-sm text-muted-foreground">正在准备产物库。</p>
      </CardContent>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-error" />
        <h2 className="text-lg font-semibold">产物加载失败</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">{message}</p>
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
        <PackageOpen className="mb-4 h-14 w-14 text-muted-foreground/35" />
        <h2 className="text-lg font-semibold">还没有产物</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">去对话页运行一次智能体，生成 PRD、架构、研究报告或代码产物。</p>
        <Button asChild className="mt-5" variant="primary">
          <Link href={`/projects/${projectId}/chat`}>打开对话</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center">
        <Search className="mb-4 h-12 w-12 text-muted-foreground/35" />
        <h2 className="text-lg font-semibold">没有匹配的产物</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">调整搜索、类型筛选或状态筛选，找到其他资产。</p>
        <Button className="mt-5" variant="outline" onClick={onReset}>
          清空筛选
        </Button>
      </CardContent>
    </Card>
  )
}
