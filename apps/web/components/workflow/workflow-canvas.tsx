'use client'

import { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from 'next-themes'
import { WORKFLOW_NODES, WORKFLOW_EDGES } from './workflow-data'
import { WorkflowNode, type WorkflowNodeData } from './workflow-node'
import { WorkflowInspector } from './workflow-inspector'
import type { AgentRun } from '@/lib/api-client'

interface WorkflowCanvasProps {
  projectId: string
  runs: AgentRun[]
}

export function WorkflowCanvas({ projectId, runs }: WorkflowCanvasProps) {
  const { theme } = useTheme()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const runBySkill = useMemo(() => {
    const map = new Map<string, AgentRun>()
    runs.forEach((run) => {
      if (run.selected_skill && !map.has(run.selected_skill)) {
        map.set(run.selected_skill, run)
      }
    })
    return map
  }, [runs])

  const getNodeStatus = useCallback(
    (nodeId: string): 'pending' | 'running' | 'success' | 'failed' => {
      const run = runBySkill.get(nodeId)
      if (!run) return 'pending'
      if (run.status === 'completed') return 'success'
      if (run.status === 'failed') return 'failed'
      return 'running'
    },
    [runBySkill]
  )

  const initialNodes: Node<WorkflowNodeData>[] = useMemo(() => {
    const cols = 3
    const xSpacing = 280
    const ySpacing = 120

    return WORKFLOW_NODES.map((node, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const xOffset = row % 2 === 0 ? 0 : xSpacing / 2

      return {
        id: node.id,
        type: 'workflowNode',
        position: {
          x: col * xSpacing + xOffset + 50,
          y: row * ySpacing + 50,
        },
        data: {
          label: node.label,
          agent: node.agent,
          skill: node.skill,
          icon: node.icon,
          status: getNodeStatus(node.id),
          run: node.skill ? runBySkill.get(node.skill) : undefined,
          isSelected: selectedNodeId === node.id,
        },
      }
    })
  }, [runBySkill, getNodeStatus, selectedNodeId])

  const initialEdges: Edge[] = useMemo(
    () =>
      WORKFLOW_EDGES.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      })),
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useMemo(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const nodeTypes: NodeTypes = useMemo(() => ({ workflowNode: WorkflowNode }), [])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
    },
    []
  )

  const selectedNode = selectedNodeId
    ? WORKFLOW_NODES.find((n) => n.id === selectedNodeId)
    : null
  const selectedRun = selectedNode?.skill
    ? runBySkill.get(selectedNode.skill)
    : undefined

  const isDark = theme === 'dark'

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange}
          onEdgesChange={onEdgesChange as OnEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className={isDark ? 'bg-zinc-950' : 'bg-zinc-50'}
        >
          <Background
            color={isDark ? '#333' : '#ddd'}
            gap={20}
            size={1}
          />
          <Controls
            className={isDark ? '!bg-zinc-800 !border-zinc-700 !text-white' : ''}
          />
          <MiniMap
            nodeColor={(node) => {
              const status = getNodeStatus(node.id)
              if (status === 'success') return '#22c55e'
              if (status === 'failed') return '#ef4444'
              if (status === 'running') return '#3b82f6'
              return isDark ? '#52525b' : '#d4d4d8'
            }}
            maskColor={isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
            className={isDark ? '!bg-zinc-800 !border-zinc-700' : ''}
          />
        </ReactFlow>
      </div>

      {selectedNodeId && selectedNode && (
        <div className="w-96 border-l border-border/50 bg-card/50 overflow-auto">
          <WorkflowInspector
            projectId={projectId}
            nodeId={selectedNodeId}
            nodeLabel={selectedNode.label}
            run={selectedRun}
          />
        </div>
      )}
    </div>
  )
}
