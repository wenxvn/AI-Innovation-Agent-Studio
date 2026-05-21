'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, AlertCircle, Loader2, type LucideIcon } from 'lucide-react'
import type { AgentRun } from '@/lib/api-client'

export interface WorkflowNodeData {
  label: string
  agent: string
  skill: string
  icon: LucideIcon
  status: 'pending' | 'running' | 'success' | 'failed'
  run?: AgentRun
  isSelected: boolean
}

const STATUS_CONFIG = {
  pending: {
    border: 'border-border/50',
    bg: 'bg-muted/20',
    badge: 'secondary' as const,
    label: '待执行',
    Icon: Clock,
  },
  running: {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    badge: 'warning' as const,
    label: '执行中',
    Icon: Loader2,
  },
  success: {
    border: 'border-success/50',
    bg: 'bg-success/10',
    badge: 'success' as const,
    label: '已完成',
    Icon: CheckCircle2,
  },
  failed: {
    border: 'border-error/50',
    bg: 'bg-error/10',
    badge: 'destructive' as const,
    label: '失败',
    Icon: AlertCircle,
  },
}

function WorkflowNodeComponent({ data }: NodeProps<WorkflowNodeData>) {
  const { label, agent, icon: NodeIcon, status, run, isSelected } = data
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.Icon

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all cursor-pointer ${config.border} ${config.bg} ${isSelected ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/20' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          <NodeIcon className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{label}</p>
          {agent && <p className="text-[10px] text-muted-foreground truncate">{agent}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={config.badge} className="text-[10px] px-1.5 py-0">
            <StatusIcon className={`h-2.5 w-2.5 mr-0.5 ${status === 'running' ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
          {run && (
            <span className="text-[10px] text-muted-foreground">
              {run.latency_ms}ms
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500" />
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
