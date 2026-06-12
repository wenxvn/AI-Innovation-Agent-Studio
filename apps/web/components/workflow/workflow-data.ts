import {
  Search,
  Brain,
  FileText,
  Settings,
  Code,
  Bug,
  Mic,
  UserCheck,
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
  { id: 'requirement_analysis', label: '需求分析', agent: '需求分析智能体', skill: 'competition-analyzer', icon: Search },
  { id: 'ideation', label: '创意生成', agent: '产品智能体', skill: 'idea-generator', icon: Brain },
  { id: 'research', label: '调研综合', agent: '调研智能体', skill: 'research-synthesizer', icon: Search },
  { id: 'product', label: 'PRD 撰写', agent: '产品智能体', skill: 'prd-writer', icon: FileText },
  { id: 'architecture', label: '架构设计', agent: '架构智能体', skill: 'architecture-designer', icon: Settings },
  { id: 'coding', label: '代码生成', agent: '代码智能体', skill: 'fastapi-generator', icon: Code },
  { id: 'qa', label: '质量检查', agent: '质量智能体', skill: 'qa-debugger', icon: Bug },
  { id: 'pitch', label: '答辩准备', agent: '答辩智能体', skill: 'pitch-writer', icon: Mic },
  { id: 'human_review', label: '人工审核', agent: '项目负责人', skill: '', icon: UserCheck },
]

export const WORKFLOW_EDGES = WORKFLOW_NODES.slice(0, -1).map((node, i) => ({
  id: `e-${node.id}-${WORKFLOW_NODES[i + 1].id}`,
  source: node.id,
  target: WORKFLOW_NODES[i + 1].id,
}))
