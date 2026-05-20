'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  Copy, 
  History, 
  RefreshCw, 
  Edit,
  Clock,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { outputs } from '@/lib/mock-data'

export default function OutputsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Outputs</h1>
          <p className="text-zinc-400">系统生成的所有产物</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出全部
          </Button>
          <Button variant="primary" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新生成
          </Button>
        </div>
      </div>

      {/* Output Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { type: 'prd', label: 'PRD 文档', count: 1 },
          { type: 'architecture', label: '架构文档', count: 1 },
          { type: 'pitch', label: '答辩材料', count: 1 },
          { type: 'code', label: '代码骨架', count: 0 }
        ].map((category) => (
          <Card key={category.type} className="hover:border-violet-500/30 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-violet-400 mx-auto mb-2" />
              <p className="text-sm font-medium">{category.label}</p>
              <p className="text-xs text-zinc-500">{category.count} 个</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Output List */}
      <div className="space-y-4">
        {outputs.map((output) => (
          <Card key={output.id} className="hover:border-zinc-700 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <FileText className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{output.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="accent" className="text-xs">
                        {output.type}
                      </Badge>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {output.createdByAgent}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(output.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    v{output.version}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => toggleExpand(output.id)}
                  >
                    {expandedId === output.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {expandedId === output.id && (
              <CardContent>
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">
                    {output.content}
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State for Code */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>代码骨架</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">暂无生成的代码骨架</p>
            <p className="text-sm text-zinc-500 mb-4">
              完成架构设计后，Coding Agent 将自动生成前后端代码骨架
            </p>
            <Button variant="primary" size="sm">
              生成代码骨架
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>导出选项</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { format: 'Markdown', description: '标准 Markdown 格式', icon: FileText },
              { format: 'DOCX', description: 'Microsoft Word 文档', icon: FileText },
              { format: 'PPT 大纲', description: 'PowerPoint 演示大纲', icon: FileText },
              { format: 'GitHub README', description: 'GitHub 项目文档', icon: FileText }
            ].map((format) => {
              const Icon = format.icon
              return (
                <Button key={format.format} variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-violet-400" />
                    <span className="font-medium">{format.format}</span>
                  </div>
                  <p className="text-xs text-zinc-500 text-left">{format.description}</p>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
