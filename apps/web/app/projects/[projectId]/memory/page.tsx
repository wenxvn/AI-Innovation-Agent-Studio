'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { api, type Memory, type MemoryCreate } from '@/lib/api-client'
import { Plus, Loader2, Trash2, Brain, Edit } from 'lucide-react'

const MEMORY_TYPES = [
  { value: 'project', label: '项目' },
  { value: 'user', label: '用户' },
  { value: 'semantic', label: '语义' },
  { value: 'experience', label: '经验' },
]

export default function MemoryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<MemoryCreate>({ memory_type: 'project', content: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['memories', projectId],
    queryFn: () => api.memory.list(projectId),
    enabled: !!projectId,
  })

  const createMutation = useMutation({
    mutationFn: (data: MemoryCreate) => api.memory.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] })
      setDialogOpen(false)
      setForm({ memory_type: 'project', content: '' })
      toast({ title: 'Memory 已创建', variant: 'success' })
    },
    onError: (err: Error) => toast({ title: '创建失败', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.memory.delete(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', projectId] })
      toast({ title: 'Memory 已删除', variant: 'success' })
    },
  })

  const toggleStaleMutation = useMutation({
    mutationFn: ({ id, is_stale }: { id: string; is_stale: boolean }) =>
      api.memory.update(projectId, id, { is_stale }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories', projectId] }),
  })

  const memories = data?.data || []

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">管理项目的记忆和上下文信息</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="primary"><Plus className="h-4 w-4 mr-2" />新增 Memory</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增 Memory</DialogTitle>
              <DialogDescription>添加一条记忆信息到项目</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <div className="flex gap-2">
                  {MEMORY_TYPES.map((t) => (
                    <Badge
                      key={t.value}
                      variant={form.memory_type === t.value ? 'accent' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setForm({ ...form, memory_type: t.value })}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea
                  placeholder="记忆内容"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button variant="primary" onClick={() => createMutation.mutate(form)} disabled={!form.content.trim() || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && memories.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无 Memory</h3>
            <p className="text-muted-foreground">Agent 运行时会自动积累记忆</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && memories.length > 0 && (
        <div className="space-y-3">
          {memories.map((mem) => (
            <Card key={mem.id} className={mem.is_stale ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="accent" className="text-xs">{mem.memory_type}</Badge>
                      <Badge variant={mem.is_active ? 'success' : 'secondary'} className="text-xs">
                        {mem.is_active ? '活跃' : '不活跃'}
                      </Badge>
                      {mem.is_stale && <Badge variant="warning" className="text-xs">过期</Badge>}
                      <span className="text-xs text-muted-foreground">可信度: {(mem.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-sm">{mem.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(mem.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStaleMutation.mutate({ id: mem.id, is_stale: !mem.is_stale })}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-error"
                      onClick={() => { if (confirm('确定删除?')) deleteMutation.mutate(mem.id) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
