'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  User, 
  FolderOpen, 
  Database, 
  History, 
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { memories } from '@/lib/mock-data'

const memoryTypes = [
  { id: 'user', label: 'User Memory', icon: User, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'project', label: 'Project Memory', icon: FolderOpen, color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  { id: 'semantic', label: 'Semantic Memory', icon: Database, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  { id: 'experience', label: 'Experience Memory', icon: History, color: 'text-amber-400', bgColor: 'bg-amber-500/10' }
]

export default function MemoryPage() {
  const getMemoriesByType = (type: string) => memories.filter(m => m.memoryType === type)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Memory Explorer</h1>
          <p className="text-zinc-400">查看和管理四层记忆系统</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            搜索记忆
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加记忆
          </Button>
        </div>
      </div>

      {/* Memory Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {memoryTypes.map((type) => {
          const Icon = type.icon
          const typeMemories = getMemoriesByType(type.id)
          return (
            <Card key={type.id} className="hover:border-violet-500/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-zinc-500">{typeMemories.length} 条记忆</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Memory List */}
      <div className="space-y-6">
        {memoryTypes.map((type) => {
          const Icon = type.icon
          const typeMemories = getMemoriesByType(type.id)
          
          if (typeMemories.length === 0) return null
          
          return (
            <div key={type.id}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`h-5 w-5 ${type.color}`} />
                <h2 className="text-lg font-semibold">{type.label}</h2>
                <Badge variant="secondary">{typeMemories.length}</Badge>
              </div>
              
              <div className="space-y-3">
                {typeMemories.map((memory) => (
                  <Card key={memory.id} className="hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-zinc-300 mb-3">{memory.content}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                              <span>置信度:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      memory.confidence >= 0.9 ? 'bg-emerald-400' :
                                      memory.confidence >= 0.7 ? 'bg-blue-400' : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${memory.confidence * 100}%` }}
                                  />
                                </div>
                                <span>{(memory.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                            
                            <span>•</span>
                            
                            <span>来源: {memory.metadata.source as string}</span>
                            
                            <span>•</span>
                            
                            <span>创建: {new Date(memory.createdAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3">
                            {memory.isActive ? (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                活跃
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                停用
                              </Badge>
                            )}
                            
                            {memory.isStale && (
                              <Badge variant="warning" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                过期
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Memory Structure */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>记忆系统结构</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm text-zinc-400">
            <pre className="p-4 rounded-lg bg-zinc-900 overflow-auto">
{`Memory System
├── User Memory (用户记忆)
│   ├── 偏好技术栈
│   ├── 常用语言
│   └── 项目风格
├── Project Memory (项目记忆)
│   ├── 项目目标
│   ├── 技术选型
│   └── 架构决策
├── Semantic Memory (语义记忆)
│   ├── 文档 chunks
│   ├── embedding
│   └── 来源文件
└── Experience Memory (经验记忆)
    ├── 成功 prompt
    ├── 失败 prompt
    └── Bug 修复经验`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
