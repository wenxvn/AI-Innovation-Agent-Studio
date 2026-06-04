import {
  GitBranch,
  Search,
  Brain,
  FileText,
  Settings,
  Code,
  Bug,
  Mic,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

export interface WorkflowNodeDef {
  id: string
  label: string
  agent: string
  skill: string
  icon: LucideIcon
}

export const WORKFLOW_NODES: WorkflowNodeDef[] = [
  { id: 'start', label: '开始', agent: '', skill: '', icon: GitBranch },
  { id: 'competition-analyzer', label: '竞赛分析', agent: '调研智能体', skill: 'competition-analyzer', icon: Search },
  { id: 'idea-generator', label: '创意生成', agent: '产品智能体', skill: 'idea-generator', icon: Brain },
  { id: 'prd-writer', label: 'PRD 撰写', agent: '产品智能体', skill: 'prd-writer', icon: FileText },
  { id: 'architecture-designer', label: '架构设计', agent: '架构智能体', skill: 'architecture-designer', icon: Settings },
  { id: 'research-synthesizer', label: '调研综合', agent: '调研智能体', skill: 'research-synthesizer', icon: Search },
  { id: 'fastapi-generator', label: '后端生成', agent: '代码智能体', skill: 'fastapi-generator', icon: Code },
  { id: 'nextjs-generator', label: '前端生成', agent: '代码智能体', skill: 'nextjs-generator', icon: Code },
  { id: 'qa-debugger', label: 'QA 调试', agent: '质量智能体', skill: 'qa-debugger', icon: Bug },
  { id: 'pitch-writer', label: '答辩撰写', agent: '答辩智能体', skill: 'pitch-writer', icon: Mic },
  { id: 'end', label: '完成', agent: '', skill: '', icon: CheckCircle2 },
]

export const WORKFLOW_EDGES = WORKFLOW_NODES.slice(0, -1).map((node, i) => ({
  id: `e-${node.id}-${WORKFLOW_NODES[i + 1].id}`,
  source: node.id,
  target: WORKFLOW_NODES[i + 1].id,
}))
