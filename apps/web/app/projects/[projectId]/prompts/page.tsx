'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { api, type PromptTemplate } from '@/lib/api-client'
import {
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ScrollText,
  Sparkles,
  Variable,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, ElementType> = {
  system: Sparkles,
  agent: ScrollText,
  evaluation: CheckCircle2,
  custom: FileText,
}

function extractVariables(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)).map((match) => match[1]))).sort()
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PromptsPage() {
  const queryClient = useQueryClient()
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: '',
    content: '',
  })

  const { data: promptsData, isLoading: promptsLoading, error: promptsError } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.prompts.list(),
  })

  const { data: statsData } = useQuery({
    queryKey: ['prompt-stats'],
    queryFn: () => api.prompts.stats(),
  })

  const prompts = promptsData?.data ?? []
  const selectedPrompt = prompts.find((prompt) => prompt.name === selectedName) ?? prompts[0]

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['prompt-versions', selectedPrompt?.name],
    queryFn: () => api.prompts.versions(selectedPrompt.name),
    enabled: !!selectedPrompt,
  })

  useEffect(() => {
    if (!selectedName && prompts.length > 0) {
      setSelectedName(prompts[0].name)
    }
  }, [prompts, selectedName])

  useEffect(() => {
    if (!selectedPrompt) return
    setDraft({
      title: selectedPrompt.title,
      description: selectedPrompt.description,
      category: selectedPrompt.category,
      content: selectedPrompt.content,
    })
  }, [selectedPrompt?.id, selectedPrompt])

  const groupedPrompts = useMemo(() => {
    return prompts.reduce((acc, prompt) => {
      const category = prompt.category || 'custom'
      if (!acc[category]) acc[category] = []
      acc[category].push(prompt)
      return acc
    }, {} as Record<string, PromptTemplate[]>)
  }, [prompts])

  const draftVariables = useMemo(() => extractVariables(draft.content), [draft.content])
  const hasChanges = Boolean(
    selectedPrompt &&
    (draft.title !== selectedPrompt.title ||
      draft.description !== selectedPrompt.description ||
      draft.category !== selectedPrompt.category ||
      draft.content !== selectedPrompt.content),
  )

  const invalidatePromptQueries = (name?: string) => {
    queryClient.invalidateQueries({ queryKey: ['prompts'] })
    queryClient.invalidateQueries({ queryKey: ['prompt-stats'] })
    if (name) queryClient.invalidateQueries({ queryKey: ['prompt-versions', name] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPrompt) throw new Error('请选择模板')
      return api.prompts.update(selectedPrompt.name, {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        content: draft.content,
        activate: true,
        metadata: { updated_from: 'prompts_page' },
      })
    },
    onSuccess: (response) => {
      setSelectedName(response.data.name)
      setDraft({
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
        content: response.data.content,
      })
      invalidatePromptQueries(response.data.name)
      toast({ title: '模板已保存', description: `已创建 v${response.data.version} 并激活。`, variant: 'success' })
    },
    onError: (error: Error) => toast({ title: '保存失败', description: error.message, variant: 'destructive' }),
  })

  const activateMutation = useMutation({
    mutationFn: ({ name, version }: { name: string; version: number }) => api.prompts.activate(name, version, 'activated from prompts page'),
    onSuccess: (response) => {
      setSelectedName(response.data.name)
      setDraft({
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
        content: response.data.content,
      })
      invalidatePromptQueries(response.data.name)
      toast({ title: '版本已激活', description: `${response.data.name} v${response.data.version}`, variant: 'success' })
    },
    onError: (error: Error) => toast({ title: '激活失败', description: error.message, variant: 'destructive' }),
  })

  const reloadMutation = useMutation({
    mutationFn: () => api.prompts.reload(),
    onSuccess: () => {
      invalidatePromptQueries(selectedPrompt?.name)
      toast({ title: '默认模板已同步', variant: 'success' })
    },
    onError: (error: Error) => toast({ title: '同步失败', description: error.message, variant: 'destructive' }),
  })

  const handleCopy = async () => {
    if (!draft.content) return
    await navigator.clipboard.writeText(draft.content)
    setCopied(true)
    toast({ title: '已复制到剪贴板', variant: 'success' })
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (promptsLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (promptsError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h1 className="mb-2 text-lg font-semibold">提示词加载失败</h1>
            <p className="text-sm text-muted-foreground">{(promptsError as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">提示词模板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {statsData?.data.total ?? prompts.length} 个模板，{statsData?.data.total_versions ?? prompts.length} 个版本
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => reloadMutation.mutate()} disabled={reloadMutation.isPending}>
          {reloadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          同步默认模板
        </Button>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
            <h2 className="mb-2 text-lg font-semibold">暂无模板</h2>
            <Button variant="primary" onClick={() => reloadMutation.mutate()} disabled={reloadMutation.isPending}>
              {reloadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              同步默认模板
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {Object.entries(groupedPrompts).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category] ?? FileText
              return (
                <Card key={category}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-blue-500" />
                      {category}
                      <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4 pt-2">
                    {items.map((prompt) => (
                      <button
                        key={prompt.id}
                        type="button"
                        onClick={() => setSelectedName(prompt.name)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          prompt.name === selectedPrompt?.name
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border/50 hover:border-border hover:bg-muted/10'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{prompt.title}</span>
                          <Badge variant={prompt.is_active ? 'success' : 'secondary'} className="shrink-0 text-[10px]">
                            {prompt.is_active ? '激活' : '未激活'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{prompt.name}</span>
                          <span className="shrink-0">v{prompt.version}</span>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="mb-2 flex items-center gap-2 text-base">
                      <ScrollText className="h-4 w-4 text-violet-500" />
                      模板详情
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={selectedPrompt?.is_active ? 'success' : 'secondary'}>
                        {selectedPrompt?.is_active ? '当前激活' : '未激活'}
                      </Badge>
                      <Badge variant="outline">v{selectedPrompt?.version}</Badge>
                      <Badge variant="info">{selectedPrompt?.source}</Badge>
                      <span className="text-xs text-muted-foreground">{selectedPrompt?.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedPrompt && setDraft({
                        title: selectedPrompt.title,
                        description: selectedPrompt.description,
                        category: selectedPrompt.category,
                        content: selectedPrompt.content,
                      })}
                      disabled={!hasChanges}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      还原
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      保存
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prompt-title">标题</Label>
                    <Input
                      id="prompt-title"
                      value={draft.title}
                      onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-category">分类</Label>
                    <Input
                      id="prompt-category"
                      value={draft.category}
                      onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-description">描述</Label>
                  <Input
                    id="prompt-description"
                    value={draft.description}
                    onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-content">内容</Label>
                  <Textarea
                    id="prompt-content"
                    value={draft.content}
                    onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))}
                    rows={20}
                    className="min-h-[460px] font-mono text-xs leading-5"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Variable className="h-4 w-4 text-amber-500" />
                  变量列表
                  <Badge variant="secondary" className="ml-auto">{draftVariables.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {draftVariables.length ? (
                  <div className="flex flex-wrap gap-2">
                    {draftVariables.map((variable) => (
                      <Badge key={variable} variant="outline" className="font-mono">{`{${variable}}`}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">无变量</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  版本
                  <Badge variant="secondary" className="ml-auto">{versionsData?.total ?? 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-2">
                {versionsLoading && <Loader2 className="h-5 w-5 animate-spin text-violet-500" />}
                {!versionsLoading && versionsData?.data.map((version) => (
                  <div key={version.id} className="rounded-lg border border-border/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold">v{version.version}</span>
                      <Badge variant={version.is_active ? 'success' : 'secondary'} className="text-[10px]">
                        {version.is_active ? '激活' : '历史'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{version.source}</Badge>
                    </div>
                    <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.updated_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {version.content_checksum.slice(0, 10)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={version.is_active || activateMutation.isPending}
                      onClick={() => activateMutation.mutate({ name: version.name, version: version.version })}
                    >
                      激活
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">元数据</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <pre className="max-h-64 overflow-auto rounded-lg border border-border/40 bg-muted/10 p-3 text-xs">
                  {JSON.stringify(selectedPrompt?.metadata ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
