'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Bot, 
  User, 
  Wrench, 
  FileText, 
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agent?: string
  skill?: string
  toolCalls?: Array<{
    name: string
    status: 'pending' | 'completed' | 'failed'
  }>
}

const demoMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: '我想参加一个人工智能创新赛道比赛，希望做一个工程级 Agent 项目。技术栈希望使用 Python 后端、TypeScript 前端、RAG、Memory、Tool Calling、Skill Registry、Eval 和 Trace。',
    timestamp: '2026-05-19 14:00:00'
  },
  {
    id: '2',
    role: 'assistant',
    content: '我已收到您的需求。作为 Orchestrator Agent，我将分析您的目标并规划项目方向。\n\n**分析结果：**\n- 目标：参加 AI 创新竞赛，构建工程级 Agent 平台\n- 技术栈：Python + TypeScript + RAG + Memory + Tool Calling\n- 核心特性：多智能体协作、上下文工程、长期记忆、工具调用、评估追踪\n\n**推荐下一步：**\n1. 进行赛题解析和需求分析\n2. 调研现有 Agent 框架\n3. 生成项目方向建议',
    timestamp: '2026-05-19 14:01:00',
    agent: 'Orchestrator Agent',
    skill: 'competition-analyzer',
    toolCalls: [
      { name: 'file_reader', status: 'completed' },
      { name: 'rag_search', status: 'completed' }
    ]
  },
  {
    id: '3',
    role: 'user',
    content: '好的，请帮我进行赛题解析和需求分析。',
    timestamp: '2026-05-19 14:05:00'
  },
  {
    id: '4',
    role: 'assistant',
    content: '我将调用 Requirement Analysis Agent 进行赛题解析。\n\n**赛题解析结果：**\n\n**比赛要求：**\n- 构建工程级 AI Agent 平台\n- 支持多智能体协作\n- 具备完整的上下文工程、记忆系统、工具调用能力\n- 需要有可观测性和评估机制\n\n**评分标准：**\n- 创新性 (25%)\n- 工程质量 (30%)\n- 技术深度 (20%)\n- 实用价值 (15%)\n- 答辩表现 (10%)\n\n**提交物要求：**\n- 源代码\n- 技术文档\n- 答辩 PPT\n- Demo 演示',
    timestamp: '2026-05-19 14:10:00',
    agent: 'Requirement Analysis Agent',
    skill: 'competition-analyzer',
    toolCalls: [
      { name: 'pdf_parser', status: 'completed' },
      { name: 'document_reader', status: 'completed' }
    ]
  },
  {
    id: '5',
    role: 'user',
    content: '很好，请帮我生成几个项目方向。',
    timestamp: '2026-05-19 14:15:00'
  },
  {
    id: '6',
    role: 'assistant',
    content: '我将调用 Research Agent 和 Idea Generator 进行调研和方向生成。\n\n**调研结果：**\n- LangGraph: LangChain 团队开发的状态图框架\n- CrewAI: 多智能体协作框架\n- AutoGen: 微软的多智能体对话框架\n\n**推荐项目方向：**\n\n**方向 1：智创工坊 - AI Innovation Agent Studio**\n- 定位：面向高校 AI 创新竞赛的多智能体工程平台\n- 核心特性：Skill Registry + Context Engineering + Memory + Eval\n- 创新点：工程化管理而非简单聊天\n\n**方向 2：AI 科研助手**\n- 定位：辅助科研论文写作和实验设计\n- 核心特性：文献检索 + 实验设计 + 论文生成\n\n**方向 3：智能代码审查系统**\n- 定位：自动化代码审查和质量评估\n- 核心特性：代码分析 + 安全检测 + 重构建议\n\n**推荐：方向 1 - 智创工坊**\n原因：最符合比赛要求，技术栈完整，创新性高',
    timestamp: '2026-05-19 14:20:00',
    agent: 'Research Agent',
    skill: 'research-synthesizer',
    toolCalls: [
      { name: 'web_search', status: 'completed' },
      { name: 'rag_search', status: 'completed' }
    ]
  }
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(demoMessages)
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: String(messages.length + 1),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }
    
    setMessages([...messages, userMessage])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Agent Chat</h1>
            <p className="text-sm text-zinc-500">
              与多个 Agent 协作完成项目
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              在线
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-violet-400" />
              </div>
            )}
            
            <div className={`max-w-[70%] ${
              message.role === 'user' ? 'order-1' : ''
            }`}>
              <Card className={`${
                message.role === 'user' 
                  ? 'bg-violet-500/10 border-violet-500/30' 
                  : ''
              }`}>
                <CardContent className="p-4">
                  {/* Agent Info */}
                  {message.agent && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
                      <Badge variant="accent" className="text-xs">
                        {message.agent}
                      </Badge>
                      {message.skill && (
                        <Badge variant="secondary" className="text-xs">
                          {message.skill}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={i} className="font-semibold mt-2">{line.replace(/\*\*/g, '')}</p>
                      }
                      if (line.startsWith('- ')) {
                        return <p key={i} className="ml-4 text-zinc-300">{line}</p>
                      }
                      if (line.match(/^\d+\. /)) {
                        return <p key={i} className="ml-4 text-zinc-300">{line}</p>
                      }
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                  
                  {/* Tool Calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-2">工具调用：</p>
                      <div className="flex flex-wrap gap-2">
                        {message.toolCalls.map((tool, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 text-xs">
                            <Wrench className="h-3 w-3 text-zinc-400" />
                            <span>{tool.name}</span>
                            {tool.status === 'completed' && (
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/50">
                    <Clock className="h-3 w-3 text-zinc-600" />
                    <span className="text-xs text-zinc-600">
                      {new Date(message.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入消息..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-violet-500 focus:outline-none text-sm"
            />
          </div>
          <Button variant="primary" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-zinc-500">快速操作：</span>
          <Button variant="ghost" size="sm" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            生成 PRD
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            生成架构
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            生成代码
          </Button>
        </div>
      </div>
    </div>
  )
}
