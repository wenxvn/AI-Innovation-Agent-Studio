'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type PromptTemplate } from '@/lib/api-client'
import {
  Loader2,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Code,
  Variable,
  Layers,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  '系统提示词': Zap,
  'Agent 提示词': Code,
  '评估提示词': CheckCircle2,
  '意图识别': Layers,
  '技能相关': FileText,
  'RAG 检索': Variable,
  '工作流': Layers,
  '其他': FileText,
}

export default function PromptsPage() {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null)
  const [copiedName, setCopiedName] = useState<string | null>(null)

  const { data: promptsData, isLoading: promptsLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.prompts.list(),
  })

  const { data: statsData } = useQuery({
    queryKey: ['prompt-stats'],
    queryFn: () => api.prompts.stats(),
  })

  const prompts = promptsData?.data || []
  const stats = statsData?.data

  const handleCopy = (content: string, name: string) => {
    navigator.clipboard.writeText(content)
    setCopiedName(name)
    toast({ title: '已复制到剪贴板', variant: 'success' })
    setTimeout(() => setCopiedName(null), 2000)
  }

  const promptsByCategory = prompts.reduce((acc, p) => {
    const cat = p.category || '其他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, PromptTemplate[]>)

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">提示词管理</h1>
        <p className="text-sm text-muted-foreground mt-1">系统内置的提示词模板，用于智能体运行、评估等场景</p>
      </div>

      {promptsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!promptsLoading && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.total || prompts.length}</p>
                <p className="text-xs text-muted-foreground">提示词模板</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.active || prompts.filter(p => p.is_active).length}</p>
                <p className="text-xs text-muted-foreground">活跃模板</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Layers className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{Object.keys(promptsByCategory).length}</p>
                <p className="text-xs text-muted-foreground">分类数量</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Variable className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.total_variables || prompts.reduce((sum, p) => sum + p.variables.length, 0)}</p>
                <p className="text-xs text-muted-foreground">变量总数</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-500" />
                提示词分类
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => {
                  const Icon = CATEGORY_ICONS[category] || FileText
                  return (
                    <div key={category} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/10 border border-border/30 hover:border-violet-500/30 transition-colors">
                      <Icon className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">{category}</span>
                      <Badge variant="secondary" className="text-xs">{categoryPrompts.length}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Templates */}
          {prompts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无提示词模板</h3>
                <p className="text-muted-foreground">系统会在后端启动时自动加载内置的提示词模板</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => {
                const Icon = CATEGORY_ICONS[category] || FileText
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-violet-500" />
                      <h2 className="text-lg font-semibold">{category}</h2>
                      <Badge variant="secondary" className="text-xs">{categoryPrompts.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {categoryPrompts.map((prompt) => {
                        const isExpanded = expandedPrompt === prompt.name
                        return (
                          <Card key={prompt.name} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-violet-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium">{prompt.title}</p>
                                      <Badge variant={prompt.is_active ? 'success' : 'secondary'} className="text-[10px]">
                                        {prompt.is_active ? '活跃' : '未激活'}
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px]">v{prompt.version}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
                                    {prompt.variables.length > 0 && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <Variable className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">变量:</span>
                                        {prompt.variables.slice(0, 4).map((v) => (
                                          <Badge key={v} variant="secondary" className="text-[10px]">{`{${v}}`}</Badge>
                                        ))}
                                        {prompt.variables.length > 4 && (
                                          <span className="text-[10px] text-muted-foreground">+{prompt.variables.length - 4}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleCopy(prompt.content, prompt.name)}
                                    title="复制内容"
                                  >
                                    {copiedName === prompt.name ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setExpandedPrompt(isExpanded ? null : prompt.name)}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 border-t border-border/30 pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">提示词内容</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {prompt.content.length} 字符
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {prompt.content.split('\n').length} 行
                                      </Badge>
                                    </div>
                                  </div>
                                  <pre className="text-sm whitespace-pre-wrap p-4 rounded-lg bg-muted/10 border border-border/30 max-h-96 overflow-auto font-mono">
                                    {prompt.content}
                                  </pre>

                                  {prompt.variables.length > 0 && (
                                    <div className="mt-4">
                                      <p className="text-sm font-medium mb-2">变量列表</p>
                                      <div className="flex flex-wrap gap-2">
                                        {prompt.variables.map((v) => (
                                          <div key={v} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                            <Variable className="h-3 w-3 text-violet-500" />
                                            <span className="text-xs font-mono text-violet-400">{`{${v}}`}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
