'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { api, type Skill } from '@/lib/api-client'
import {
  Loader2,
  Cog,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Code,
  Shield,
  Layers,
  GitBranch,
  Database,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRight,
} from 'lucide-react'

const SKILL_ICONS: Record<string, React.ElementType> = {
  'competition-analyzer': Target,
  'idea-generator': Zap,
  'research-synthesizer': Database,
  'prd-writer': FileText,
  'architecture-designer': Layers,
  'api-designer': Code,
  'rag-builder': Database,
  'context-pack-builder': Brain,
  'fastapi-generator': Code,
  'nextjs-generator': Code,
  'qa-debugger': Shield,
  'pitch-writer': FileText,
}

const RISK_COLORS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
}

export default function SkillsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.skills.list(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ name, is_enabled }: { name: string; is_enabled: boolean }) =>
      api.skills.update(name, { is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast({ title: '技能已更新', variant: 'success' })
    },
  })

  const reloadMutation = useMutation({
    mutationFn: () => api.skills.reload(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast({ title: '技能已重新加载', variant: 'success' })
    },
  })

  const skills = skillsData?.data || []

  const enabledCount = skills.filter((s) => s.is_enabled).length

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">技能</h1>
          <p className="text-sm text-muted-foreground mt-1">项目可用的 Agent 技能</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reloadMutation.mutate()}
          disabled={reloadMutation.isPending}
        >
          {reloadMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          重新加载
        </Button>
      </div>

      {skillsLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {!skillsLoading && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Cog className="h-6 w-6 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">{skills.length}</p>
                <p className="text-xs text-muted-foreground">技能总数</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">已启用</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Shield className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{skills.filter(s => s.requires_approval).length}</p>
                <p className="text-xs text-muted-foreground">需要审批</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Wrench className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{skills.filter(s => s.risk_level === 'high').length}</p>
                <p className="text-xs text-muted-foreground">高风险</p>
              </CardContent>
            </Card>
          </div>

          {/* Skills List */}
          {skills.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Cog className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无技能</h3>
                <p className="text-muted-foreground">请检查 skills 目录是否包含技能配置文件</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => {
                const isExpanded = expandedSkill === skill.name
                const Icon = SKILL_ICONS[skill.name] || Cog

                return (
                  <Card key={skill.id} className={`hover:shadow-md transition-shadow ${!skill.is_enabled ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg ${skill.is_enabled ? 'bg-violet-500/10' : 'bg-muted/20'} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-5 w-5 ${skill.is_enabled ? 'text-violet-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{skill.display_name || skill.name}</p>
                              <Badge variant="outline" className="text-[10px]">v{skill.version}</Badge>
                              <Badge variant={RISK_COLORS[skill.risk_level] || 'secondary'} className="text-[10px]">
                                {skill.risk_level}
                              </Badge>
                              {skill.requires_approval && (
                                <Badge variant="warning" className="text-[10px]">
                                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                                  需审批
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                            {skill.trigger && skill.trigger.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Zap className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] text-muted-foreground">触发: {skill.trigger[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateMutation.mutate({
                                name: skill.name,
                                is_enabled: !skill.is_enabled,
                              })
                            }
                            title={skill.is_enabled ? '禁用' : '启用'}
                          >
                            {skill.is_enabled ? (
                              <ToggleRight className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setExpandedSkill(isExpanded ? null : skill.name)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 border-t border-border/30 pt-4 space-y-4">
                          {/* Description */}
                          <div>
                            <p className="text-sm font-medium mb-1">描述</p>
                            <p className="text-sm text-muted-foreground">{skill.description}</p>
                          </div>

                          {/* Trigger */}
                          {skill.trigger && skill.trigger.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                触发条件
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {skill.trigger.map((t, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inputs & Outputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {skill.inputs && skill.inputs.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <ArrowRight className="h-4 w-4 text-blue-500" />
                                  输入
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {skill.inputs.map((input, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{input}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {skill.outputs && skill.outputs.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-emerald-500" />
                                  输出
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {skill.outputs.map((output, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{output}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Tools */}
                          {skill.tools && skill.tools.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-violet-500" />
                                依赖工具
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {skill.tools.map((tool, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Wrench className="h-3 w-3 mr-1" />
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Permissions */}
                          {skill.permissions && Object.keys(skill.permissions).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-amber-500" />
                                权限
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(skill.permissions).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/10">
                                    {value ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-xs">{key}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {skill.author && <span>作者: {skill.author}</span>}
                            {skill.source && <span>来源: {skill.source}</span>}
                            {skill.category && <span>分类: {skill.category}</span>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
