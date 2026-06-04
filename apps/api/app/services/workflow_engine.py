import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_WORKFLOW_STAGES = [
    {"id": "requirement_analysis", "label": "需求分析", "agent": "Requirement Analysis Agent", "skill": "competition-analyzer", "order": 1},
    {"id": "ideation", "label": "创意生成", "agent": "Product Agent", "skill": "idea-generator", "order": 2},
    {"id": "research", "label": "调研综合", "agent": "Research Agent", "skill": "research-synthesizer", "order": 3},
    {"id": "product", "label": "PRD 撰写", "agent": "Product Agent", "skill": "prd-writer", "order": 4},
    {"id": "architecture", "label": "架构设计", "agent": "Architecture Agent", "skill": "architecture-designer", "order": 5},
    {"id": "coding", "label": "代码生成", "agent": "Coding Agent", "skill": "fastapi-generator", "order": 6},
    {"id": "qa", "label": "质量检查", "agent": "QA Agent", "skill": "qa-debugger", "order": 7},
    {"id": "pitch", "label": "答辩准备", "agent": "Pitch Agent", "skill": "pitch-writer", "order": 8},
    {"id": "human_review", "label": "人工审核", "agent": "", "skill": "", "order": 9},
]

WORKFLOW_STAGE_MAP = {s["id"]: s for s in DEFAULT_WORKFLOW_STAGES}
WORKFLOW_SKILL_TO_STAGE = {s["skill"]: s["id"] for s in DEFAULT_WORKFLOW_STAGES if s["skill"]}


@dataclass
class WorkflowNodeState:
    stage_id: str
    label: str
    agent: str
    skill: str
    order: int
    status: str = "pending"
    run_id: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    latency_ms: int = 0
    error_message: str = ""
    output_summary: str = ""


@dataclass
class WorkflowRun:
    project_id: str
    run_id: str
    nodes: list[WorkflowNodeState] = field(default_factory=list)
    current_stage: str = ""
    status: str = "idle"
    created_at: str = ""
    updated_at: str = ""


def build_default_workflow() -> list[WorkflowNodeState]:
    return [
        WorkflowNodeState(
            stage_id=s["id"],
            label=s["label"],
            agent=s["agent"],
            skill=s["skill"],
            order=s["order"],
        )
        for s in DEFAULT_WORKFLOW_STAGES
    ]


def update_workflow_from_runs(
    nodes: list[WorkflowNodeState],
    agent_runs: list[dict],
) -> list[WorkflowNodeState]:
    run_map: dict[str, dict] = {}
    for run in agent_runs:
        skill = run.get("selected_skill", "")
        if skill and skill not in run_map:
            run_map[skill] = run

    for node in nodes:
        if node.skill and node.skill in run_map:
            run = run_map[node.skill]
            node.run_id = run.get("id")
            status = run.get("status", "pending")
            if status == "completed":
                node.status = "success"
            elif status == "failed":
                node.status = "failed"
            elif status in ("running", "planning", "retrieving_context", "generating", "evaluating"):
                node.status = "running"
            elif status == "waiting_approval":
                node.status = "waiting_approval"
            else:
                node.status = "pending"
            node.started_at = run.get("created_at")
            node.ended_at = run.get("updated_at") if status in ("completed", "failed") else None
            node.latency_ms = run.get("latency_ms", 0)
            node.error_message = run.get("error_message", "")
            output = run.get("generated_output", {})
            if isinstance(output, dict):
                node.output_summary = output.get("title", "")[:100]

    return nodes


def get_current_stage(nodes: list[WorkflowNodeState]) -> str:
    for node in reversed(nodes):
        if node.status in ("success", "running", "failed", "waiting_approval"):
            return node.stage_id
    return nodes[0].stage_id if nodes else ""


def get_next_stage(nodes: list[WorkflowNodeState]) -> str | None:
    for node in nodes:
        if node.status == "pending":
            return node.stage_id
    return None


def get_stage_by_skill(skill_name: str) -> dict | None:
    stage_id = WORKFLOW_SKILL_TO_STAGE.get(skill_name)
    if stage_id:
        return WORKFLOW_STAGE_MAP.get(stage_id)
    return None


def serialize_workflow_nodes(nodes: list[WorkflowNodeState]) -> list[dict]:
    return [
        {
            "stage_id": n.stage_id,
            "label": n.label,
            "agent": n.agent,
            "skill": n.skill,
            "order": n.order,
            "status": n.status,
            "run_id": n.run_id,
            "started_at": n.started_at,
            "ended_at": n.ended_at,
            "latency_ms": n.latency_ms,
            "error_message": n.error_message,
            "output_summary": n.output_summary,
        }
        for n in nodes
    ]
