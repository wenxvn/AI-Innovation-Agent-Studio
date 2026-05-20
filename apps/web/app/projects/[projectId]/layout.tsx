'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  MessageSquare, 
  GitBranch, 
  FileText, 
  Database, 
  Brain, 
  Wrench, 
  BarChart3, 
  FolderOpen,
  Settings,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { demoProject } from '@/lib/mock-data'

const navItems = [
  { href: '/projects/[projectId]', label: 'Overview', icon: FolderOpen },
  { href: '/projects/[projectId]/chat', label: 'Chat', icon: MessageSquare },
  { href: '/projects/[projectId]/workflow', label: 'Workflow', icon: GitBranch },
  { href: '/projects/[projectId]/context', label: 'Context', icon: Database },
  { href: '/projects/[projectId]/memory', label: 'Memory', icon: Brain },
  { href: '/projects/[projectId]/skills', label: 'Skills', icon: Wrench },
  { href: '/projects/[projectId]/tools', label: 'Tools', icon: Wrench },
  { href: '/projects/[projectId]/evals', label: 'Evals', icon: BarChart3 },
  { href: '/projects/[projectId]/outputs', label: 'Outputs', icon: FileText },
]

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const projectId = 'demo-project-001'

  const getHref = (href: string) => href.replace('[projectId]', projectId)
  const isActive = (href: string) => {
    const fullHref = getHref(href)
    if (href === '/projects/[projectId]') {
      return pathname === fullHref
    }
    return pathname.startsWith(fullHref)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">返回</span>
            </Link>
            <div className="h-4 w-px bg-zinc-700" />
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-violet-400" />
              <span className="font-bold">智创工坊</span>
            </Link>
            <Badge variant="accent" className="ml-2">
              {demoProject.currentStage}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>模型: GPT-4</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                运行中
              </span>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left Sidebar */}
        <aside className="w-48 border-r border-border/50 p-4 flex flex-col">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-zinc-300 truncate mb-1">
              {demoProject.name}
            </h2>
            <p className="text-xs text-zinc-500">
              {demoProject.progress}% 完成
            </p>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={getHref(item.href)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active 
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="pt-4 border-t border-border/50">
            <div className="text-xs text-zinc-600">
              <p>12 次运行</p>
              <p>3 个产物</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
