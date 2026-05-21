'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { api, type Skill } from '@/lib/api-client'
import { Loader2, RefreshCw, Wrench, Shield, FileInput, FileOutput } from 'lucide-react'

export default function SkillsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.skills.list(),
  })

  const reloadMutation = useMutation({
    mutationFn: () => api.skills.reload(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast({ title: 'Skills 已重新加载', variant: 'success' })
    },
    onError: (err: Error) => toast({ title: '加载失败', description: err.message, variant: 'destructive' }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, is_enabled }: { name: string; is_enabled: boolean }) =>
      api.skills.update(name, { is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast({ title: 'Skill 状态已更新', variant: 'success' })
    },
  })

  const skills = data?.data || []

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">管理和查看 Agent 可用技能</p>
        </div>
        <Button variant="outline" onClick={() => reloadMutation.mutate()} disabled={reloadMutation.isPending}>
          {reloadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          重新加载
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!isLoading && skills.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Wrench className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无 Skills</h3>
            <p className="text-muted-foreground mb-4">点击"重新加载"从磁盘读取 Skill 定义</p>
            <Button variant="primary" onClick={() => reloadMutation.mutate()}>重新加载</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && skills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <Card key={skill.id} className={!skill.is_enabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <Badge variant={skill.is_enabled ? 'success' : 'secondary'} className="text-xs">
                    {skill.is_enabled ? '启用' : '禁用'}
                  </Badge>
                </div>
                <CardDescription>{skill.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>版本: {skill.version}</span>
                  <span>•</span>
                  <span>作者: {skill.author}</span>
                  {skill.requires_approval && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-warning">
                        <Shield className="h-3 w-3" />
                        需审批
                      </span>
                    </>
                  )}
                </div>

                {skill.trigger && skill.trigger.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">触发条件</p>
                    <div className="flex flex-wrap gap-1">
                      {skill.trigger.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 text-xs text-muted-foreground">
                  {skill.inputs && skill.inputs.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileInput className="h-3 w-3" />
                      输入: {skill.inputs.join(', ')}
                    </span>
                  )}
                  {skill.outputs && skill.outputs.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileOutput className="h-3 w-3" />
                      输出: {skill.outputs.join(', ')}
                    </span>
                  )}
                </div>

                {skill.tools && skill.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skill.tools.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => toggleMutation.mutate({ name: skill.name, is_enabled: !skill.is_enabled })}
                >
                  {skill.is_enabled ? '禁用' : '启用'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
