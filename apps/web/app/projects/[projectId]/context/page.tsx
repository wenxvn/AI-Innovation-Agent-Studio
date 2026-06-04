'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type Memory, type Document } from '@/lib/api-client'
import { 
  Loader2, 
  Database, 
  Brain, 
  FileText, 
  Search, 
  Shield, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  BarChart3
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MEMORY_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  user: { icon: Brain, color: 'text-violet-500 bg-violet-500/10', label: '用户记忆' },
  project: { icon: Layers, color: 'text-blue-500 bg-blue-500/10', label: '项目记忆' },
  semantic: { icon: Database, color: 'text-cyan-500 bg-cyan-500/10', label: '语义记忆' },
  experience: { icon: Zap, color: 'text-amber-500 bg-amber-500/10', label: '经验记忆' },
}

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

  const memoriesByType = memories.reduce((acc, mem) => {
    const type = mem.memory_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(mem)
    return acc
  }, {} as Record<string, Memory[]>)

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Context Pack</h1>
        <p className="text-sm text-muted-foreground mt-1">项目上下文信息总览 - Agent 运行时的知识基础</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Brain className="h-6 w-6 text-violet-500" />
                </div>
                <p className="text-3xl font-bold">{memories.length}</p>
                <p className="text-sm text-muted-foreground">Memory 条目</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-3xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">文档数量</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-cyan-500" />
                </div>
                <p className="text-3xl font-bold">{totalChunks}</p>
                <p className="text-sm text-muted-foreground">可检索 Chunks</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold">
                  {memories.filter(m => m.is_active && !m.is_stale).length}
                </p>
                <p className="text-sm text-muted-foreground">活跃记忆</p>
              </CardContent>
            </Card>
          </div>

          {/* Context Pack Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-violet-500" />
                Context Pack 结构
              </CardTitle>
              <CardDescription>Agent 运行时构建的上下文包结构</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'task', label: '任务描述', icon: FileText, desc: '用户的输入和任务目标' },
                  { key: 'relevant_memory', label: '相关记忆', icon: Brain, desc: `${memories.length} 条记忆可供检索` },
                  { key: 'retrieved_evidence', label: '检索证据', icon: Search, desc: `${totalChunks} 个 chunks 可检索` },
                  { key: 'constraints', label: '约束条件', icon: Shield, desc: '任务限制和要求' },
                  { key: 'risks', label: '风险项', icon: AlertTriangle, desc: '识别的风险和注意事项' },
                  { key: 'decisions', label: '决策记录', icon: CheckCircle2, desc: '已做出的决策' },
                ].map((item) => (
                  <div key={item.key} className="p-4 rounded-lg border border-border/50 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Memory Section */}
          <Tabs defaultValue="memory">
            <TabsList>
              <TabsTrigger value="memory" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Memory ({memories.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents ({documents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memory" className="mt-4">
              {memories.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(memoriesByType).map(([type, mems]) => {
                    const config = MEMORY_TYPE_CONFIG[type] || { icon: Brain, color: 'text-gray-500 bg-gray-500/10', label: type }
                    const Icon = config.icon
                    return (
                      <Card key={type}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {config.label}
                            <Badge variant="secondary" className="ml-auto">{mems.length} 条</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {mems.map((mem) => (
                            <div key={mem.id} className={`p-3 rounded-lg border border-border/30 ${mem.is_stale ? 'opacity-60' : ''}`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant={mem.is_active ? 'success' : 'secondary'} className="text-[10px]">
                                  {mem.is_active ? '活跃' : '不活跃'}
                                </Badge>
                                {mem.is_stale && (
                                  <Badge variant="warning" className="text-[10px]">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    过期
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  可信度: {(mem.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm">{mem.content}</p>
                              <p className="text-[10px] text-muted-foreground mt-1.5">
                                创建于 {new Date(mem.created_at).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Brain className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">暂无 Memory</h3>
                    <p className="text-muted-foreground">上传文档或运行 Agent 以积累记忆信息</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.filename}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>{doc.file_type}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {doc.chunk_count} chunks
                                </span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString('zh-CN')}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={doc.status === 'indexed' ? 'success' : doc.status === 'parsed' ? 'info' : 'warning'}>
                            {doc.status}
                          </Badge>
                        </div>
                        {doc.summary && (
                          <p className="text-sm text-muted-foreground mt-3 p-3 rounded-lg bg-muted/10">
                            {doc.summary}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">暂无文档</h3>
                    <p className="text-muted-foreground">上传文档资料，Agent 可以在运行时检索相关内容</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
