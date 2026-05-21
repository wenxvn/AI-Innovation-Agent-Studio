'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { api, type ProjectUpdate } from '@/lib/api-client'
import { Loader2, Save, Trash2 } from 'lucide-react'

const STAGES = [
  { value: 'ideation', label: '创意构思' },
  { value: 'research', label: '需求调研' },
  { value: 'architecture', label: '架构设计' },
  { value: 'development', label: '开发实现' },
  { value: 'testing', label: '测试验证' },
  { value: 'completed', label: '已完成' },
]

export default function SettingsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: !!projectId,
  })

  const project = projectData?.data

  const [form, setForm] = useState<ProjectUpdate>({
    name: '',
    description: '',
    goal: '',
    current_stage: '',
    tech_stack: [],
  })
  const [techInput, setTechInput] = useState('')

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        goal: project.goal,
        current_stage: project.current_stage,
        tech_stack: project.tech_stack,
      })
    }
  }, [project])

  const updateMutation = useMutation({
    mutationFn: (data: ProjectUpdate) => api.projects.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: '设置已保存', variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: '保存失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.projects.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      window.location.href = '/dashboard'
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  const handleSave = () => {
    updateMutation.mutate(form)
  }

  const addTech = () => {
    if (techInput.trim() && !form.tech_stack?.includes(techInput.trim())) {
      setForm({ ...form, tech_stack: [...(form.tech_stack || []), techInput.trim()] })
      setTechInput('')
    }
  }

  const removeTech = (tech: string) => {
    setForm({ ...form, tech_stack: form.tech_stack?.filter((t) => t !== tech) || [] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">项目设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理项目配置和元数据</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>修改项目名称、描述和目标</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>项目名称</Label>
            <Input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>项目描述</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>项目目标</Label>
            <Textarea
              value={form.goal || ''}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>项目阶段</CardTitle>
          <CardDescription>设置当前项目所处的阶段</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => (
              <Badge
                key={stage.value}
                variant={form.current_stage === stage.value ? 'accent' : 'outline'}
                className="cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={() => setForm({ ...form, current_stage: stage.value })}
              >
                {stage.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>技术栈</CardTitle>
          <CardDescription>添加或移除项目使用的技术</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="输入技术名称"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTech()}
            />
            <Button variant="outline" onClick={addTech}>添加</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.tech_stack?.map((tech) => (
              <Badge key={tech} variant="secondary" className="cursor-pointer hover:bg-error/20" onClick={() => removeTech(tech)}>
                {tech} ×
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          保存设置
        </Button>

        <Button
          variant="destructive"
          onClick={() => {
            if (confirm('确定删除此项目？此操作不可恢复。')) {
              deleteMutation.mutate()
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          删除项目
        </Button>
      </div>
    </div>
  )
}
