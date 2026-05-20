'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Zap, 
  Search, 
  Plus, 
  Settings, 
  Shield, 
  Lock, 
  Unlock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { skills } from '@/lib/mock-data'

export default function SkillsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Skill Registry</h1>
          <p className="text-zinc-400">管理和使用 12 个内置技能</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            搜索技能
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加技能
          </Button>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <Card key={skill.id} className="hover:border-violet-500/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Zap className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{skill.name}</CardTitle>
                    <p className="text-xs text-zinc-500">v{skill.version}</p>
                  </div>
                </div>
                <Badge variant="accent" className="text-xs">
                  {skill.requiresApproval ? '需审批' : '自动'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400 mb-4">{skill.description}</p>
              
              {/* Triggers */}
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-2">触发条件</p>
                <div className="flex flex-wrap gap-1">
                  {skill.trigger.slice(0, 2).map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                  {skill.trigger.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{skill.trigger.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Inputs/Outputs */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">输入</p>
                  <div className="space-y-1">
                    {skill.inputs.slice(0, 2).map((input, i) => (
                      <p key={i} className="text-xs text-zinc-400 truncate">• {input}</p>
                    ))}
                    {skill.inputs.length > 2 && (
                      <p className="text-xs text-zinc-500">+{skill.inputs.length - 2} 更多</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">输出</p>
                  <div className="space-y-1">
                    {skill.outputs.slice(0, 2).map((output, i) => (
                      <p key={i} className="text-xs text-zinc-400 truncate">• {output}</p>
                    ))}
                    {skill.outputs.length > 2 && (
                      <p className="text-xs text-zinc-500">+{skill.outputs.length - 2} 更多</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tools */}
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-2">使用工具</p>
                <div className="flex flex-wrap gap-1">
                  {skill.tools.map((tool, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Permissions */}
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">权限</p>
                <div className="flex flex-wrap gap-2">
                  <div className={`flex items-center gap-1 text-xs ${
                    skill.permissions.readFiles ? 'text-emerald-400' : 'text-zinc-600'
                  }`}>
                    {skill.permissions.readFiles ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    读文件
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    skill.permissions.writeFiles ? 'text-emerald-400' : 'text-zinc-600'
                  }`}>
                    {skill.permissions.writeFiles ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    写文件
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    skill.permissions.executeCode ? 'text-emerald-400' : 'text-zinc-600'
                  }`}>
                    {skill.permissions.executeCode ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    执行代码
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    skill.permissions.externalNetwork ? 'text-emerald-400' : 'text-zinc-600'
                  }`}>
                    {skill.permissions.externalNetwork ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    外部网络
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  配置
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Shield className="h-4 w-4 mr-2" />
                  权限
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skill Definition */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Skill 定义格式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm text-zinc-400">
            <pre className="p-4 rounded-lg bg-zinc-900 overflow-auto">
{`name: prd-writer
description: 将用户想法、赛题、调研资料转化为结构化 PRD
version: 0.1.0
trigger:
  - 用户需要产品需求文档
  - 用户选择了项目方向
inputs:
  - project_goal
  - target_users
  - competition_rules
  - retrieved_context
outputs:
  - prd.md
  - user_stories.json
  - feature_priority_table.json
tools:
  - document_reader
  - rag_search
  - citation_checker
permissions:
  read_files: true
  write_files: false
  execute_code: false
  external_network: false
requires_approval: false`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
