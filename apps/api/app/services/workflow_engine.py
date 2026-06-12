from dataclasses import dataclass, field
from math import ceil

RUNNING_STATUSES = {"running", "planning", "retrieving_context", "generating", "evaluating"}
TERMINAL_STATUSES = {"completed", "failed"}

DEFAULT_WORKFLOW_STAGES = [
    {
        "id": "requirement_analysis",
        "label": "需求分析",
        "agent": "Requirement Analysis Agent",
        "skill": "competition-analyzer",
        "skills": ["competition-analyzer"],
        "intents": ["competition_analysis"],
        "output_types": ["analysis_report"],
        "order": 1,
        "suggestion": "继续生成创意方向，沉淀可验证的项目假设。",
    },
    {
        "id": "ideation",
        "label": "创意生成",
        "agent": "Product Agent",
        "skill": "idea-generator",
        "skills": ["idea-generator"],
        "intents": ["idea_generation"],
        "output_types": ["idea_report"],
        "order": 2,
        "suggestion": "补充调研证据，验证创意的用户痛点和差异化。",
    },
    {
        "id": "research",
        "label": "调研综合",
        "agent": "Research Agent",
        "skill": "research-synthesizer",
        "skills": ["research-synthesizer", "context-pack-builder"],
        "intents": ["research", "general_chat"],
        "output_types": ["research_report", "agent_output"],
        "order": 3,
        "suggestion": "把调研结论转成 PRD，明确用户、范围和验收标准。",
    },
    {
        "id": "product",
        "label": "PRD 撰写",
        "agent": "Product Agent",
        "skill": "prd-writer",
        "skills": ["prd-writer"],
        "intents": ["prd_generation"],
        "output_types": ["prd"],
        "order": 4,
        "suggestion": "基于 PRD 设计系统架构、数据模型和接口边界。",
    },
    {
        "id": "architecture",
        "label": "架构设计",
        "agent": "Architecture Agent",
        "skill": "architecture-designer",
        "skills": ["architecture-designer", "api-designer", "rag-builder"],
        "intents": ["architecture_design", "api_design"],
        "output_types": ["architecture", "api_doc"],
        "order": 5,
        "suggestion": "进入实现阶段，生成后端或前端代码骨架。",
    },
    {
        "id": "coding",
        "label": "代码生成",
        "agent": "Coding Agent",
        "skill": "fastapi-generator",
        "skills": ["fastapi-generator", "nextjs-generator"],
        "intents": ["backend_code", "frontend_code"],
        "output_types": ["backend_code", "frontend_code"],
        "order": 6,
        "suggestion": "运行 QA 与调试，补齐测试、风险和修复建议。",
    },
    {
        "id": "qa",
        "label": "质量检查",
        "agent": "QA Agent",
        "skill": "qa-debugger",
        "skills": ["qa-debugger"],
        "intents": ["qa_debug"],
        "output_types": ["test_report"],
        "order": 7,
        "suggestion": "整理答辩材料，把实现亮点转成可展示叙事。",
    },
    {
        "id": "pitch",
        "label": "答辩准备",
        "agent": "Pitch Agent",
        "skill": "pitch-writer",
        "skills": ["pitch-writer"],
        "intents": ["pitch"],
        "output_types": ["pitch"],
        "order": 8,
        "suggestion": "进入人工审核，检查产物完整性和演示路径。",
    },
    {
        "id": "human_review",
        "label": "人工审核",
        "agent": "",
        "skill": "",
        "skills": [],
        "intents": [],
        "output_types": [],
        "order": 9,
        "suggestion": "复核项目材料并准备提交。",
    },
]

WORKFLOW_STAGE_MAP = {s["id"]: s for s in DEFAULT_WORKFLOW_STAGES}
WORKFLOW_SKILL_TO_STAGE = {
    skill: s["id"]
    for s in DEFAULT_WORKFLOW_STAGES
    for skill in s.get("skills", [])
}
WORKFLOW_INTENT_TO_STAGE = {
    intent: s["id"]
    for s in DEFAULT_WORKFLOW_STAGES
    for intent in s.get("intents", [])
}
WORKFLOW_OUTPUT_TYPE_TO_STAGE = {
    output_type: s["id"]
    for s in DEFAULT_WORKFLOW_STAGES
    for output_type in s.get("output_types", [])
}
AUTOMATED_STAGE_IDS = [s["id"] for s in DEFAULT_WORKFLOW_STAGES if s.get("skills")]


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


def _as_string(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _run_metadata(run: dict) -> dict:
    metadata = run.get("metadata_")
    if isinstance(metadata, dict):
        return metadata
    metadata = run.get("metadata")
    if isinstance(metadata, dict):
        return metadata
    return {}


def resolve_workflow_stage(
    *,
    selected_skill: str | None = None,
    intent: str | None = None,
    output_type: str | None = None,
    workflow_stage: str | None = None,
) -> str | None:
    """Resolve a run to a stable workflow stage.

    The selected skill is the most explicit signal. Intent and output type are
    fallbacks so older or manually-created runs can still advance the workflow.
    """
    if selected_skill and selected_skill in WORKFLOW_SKILL_TO_STAGE:
        return WORKFLOW_SKILL_TO_STAGE[selected_skill]
    if workflow_stage and workflow_stage in WORKFLOW_STAGE_MAP:
        return workflow_stage
    if intent and intent in WORKFLOW_INTENT_TO_STAGE:
        return WORKFLOW_INTENT_TO_STAGE[intent]
    if output_type and output_type in WORKFLOW_OUTPUT_TYPE_TO_STAGE:
        return WORKFLOW_OUTPUT_TYPE_TO_STAGE[output_type]
    return None


def resolve_run_stage(run: dict) -> str | None:
    metadata = _run_metadata(run)
    generated_output = run.get("generated_output")
    output_type = metadata.get("output_type")
    if not output_type and isinstance(generated_output, dict):
        output_type = generated_output.get("type")

    return resolve_workflow_stage(
        selected_skill=run.get("selected_skill"),
        intent=metadata.get("intent"),
        output_type=output_type,
        workflow_stage=metadata.get("workflow_stage"),
    )


def _run_sort_key(run: dict) -> tuple[str, str, str]:
    return (
        _as_string(run.get("updated_at")),
        _as_string(run.get("created_at")),
        _as_string(run.get("id")),
    )


def _node_status_from_run(status: str) -> str:
    if status == "completed":
        return "success"
    if status == "failed":
        return "failed"
    if status in RUNNING_STATUSES:
        return "running"
    if status == "waiting_approval":
        return "waiting_approval"
    return "pending"


def extract_output_summary(output: dict | None, max_length: int = 180) -> str:
    if not isinstance(output, dict):
        return ""

    parts = []
    for key in ("title", "summary", "content"):
        value = output.get(key)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())

    summary = " - ".join(parts[:2]) if parts else ""
    summary = " ".join(summary.split())
    if len(summary) > max_length:
        return f"{summary[: max_length - 1].rstrip()}…"
    return summary


def update_workflow_from_runs(
    nodes: list[WorkflowNodeState],
    agent_runs: list[dict],
) -> list[WorkflowNodeState]:
    run_map: dict[str, dict] = {}
    for run in sorted(agent_runs, key=_run_sort_key, reverse=True):
        stage_id = resolve_run_stage(run)
        if stage_id and stage_id not in run_map:
            run_map[stage_id] = run

    for node in nodes:
        if node.stage_id in run_map:
            run = run_map[node.stage_id]
            node.run_id = run.get("id")
            status = run.get("status", "pending")
            node.status = _node_status_from_run(status)
            node.started_at = _as_string(run.get("created_at")) or None
            node.ended_at = _as_string(run.get("updated_at")) if status in TERMINAL_STATUSES else None
            node.latency_ms = run.get("latency_ms", 0)
            node.error_message = run.get("error_message", "")
            node.output_summary = extract_output_summary(run.get("generated_output", {}))

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


def get_recommended_next_stage(nodes: list[WorkflowNodeState]) -> str | None:
    automated_nodes = [n for n in nodes if n.stage_id in AUTOMATED_STAGE_IDS]
    if not automated_nodes:
        return None

    failed_node = next((n for n in automated_nodes if n.status == "failed"), None)
    if failed_node:
        return failed_node.stage_id

    max_success_order = max(
        (n.order for n in automated_nodes if n.status == "success"),
        default=0,
    )
    for node in automated_nodes:
        if node.order > max_success_order and node.status == "pending":
            return node.stage_id
    return None


def calculate_project_progress(nodes: list[WorkflowNodeState]) -> int:
    automated_nodes = [n for n in nodes if n.stage_id in AUTOMATED_STAGE_IDS]
    max_order = max((n.order for n in automated_nodes), default=0)
    if not max_order:
        return 0

    max_success_order = max(
        (n.order for n in automated_nodes if n.status == "success"),
        default=0,
    )
    return min(100, ceil((max_success_order / max_order) * 100))


def get_workflow_status(nodes: list[WorkflowNodeState]) -> str:
    if any(n.status in ("running", "waiting_approval") for n in nodes):
        return "running"
    if any(n.status == "failed" for n in nodes):
        return "needs_attention"
    if calculate_project_progress(nodes) >= 100:
        return "completed"
    if any(n.status == "success" for n in nodes):
        return "active"
    return "idle"


def get_workflow_suggestion(nodes: list[WorkflowNodeState]) -> str:
    failed_node = next((n for n in nodes if n.status == "failed"), None)
    if failed_node:
        return f"优先处理「{failed_node.label}」失败节点：{failed_node.error_message or '查看运行日志并重新执行。'}"

    next_stage = get_recommended_next_stage(nodes)
    if next_stage:
        stage = WORKFLOW_STAGE_MAP[next_stage]
        return f"下一步建议运行「{stage['label']}」：{stage.get('suggestion', '')}"

    return "所有自动化阶段已完成，建议进入人工审核并准备最终提交。"


def get_stage_by_skill(skill_name: str) -> dict | None:
    stage_id = WORKFLOW_SKILL_TO_STAGE.get(skill_name)
    if stage_id:
        return WORKFLOW_STAGE_MAP.get(stage_id)
    return None


def summarize_run(run: dict | None) -> dict | None:
    if not run:
        return None
    metadata = _run_metadata(run)
    output = run.get("generated_output", {})
    output_type = metadata.get("output_type")
    if not output_type and isinstance(output, dict):
        output_type = output.get("type", "")

    return {
        "id": run.get("id", ""),
        "stage_id": resolve_run_stage(run) or "",
        "agent_name": run.get("agent_name", ""),
        "selected_skill": run.get("selected_skill", ""),
        "intent": metadata.get("intent", ""),
        "output_type": output_type or "",
        "status": run.get("status", ""),
        "latency_ms": run.get("latency_ms", 0),
        "output_summary": extract_output_summary(output),
        "error_message": run.get("error_message", ""),
        "created_at": _as_string(run.get("created_at")),
        "updated_at": _as_string(run.get("updated_at")),
    }


def build_workflow_status(project_id: str, agent_runs: list[dict]) -> dict:
    nodes = update_workflow_from_runs(build_default_workflow(), agent_runs)
    recent_run = next(iter(sorted(agent_runs, key=_run_sort_key, reverse=True)), None)

    return {
        "project_id": project_id,
        "nodes": serialize_workflow_nodes(nodes),
        "current_stage": get_current_stage(nodes),
        "status": get_workflow_status(nodes),
        "progress": calculate_project_progress(nodes),
        "recent_run": summarize_run(recent_run),
        "failed_nodes": [
            node
            for node in serialize_workflow_nodes(nodes)
            if node["status"] == "failed"
        ],
        "next_stage": get_recommended_next_stage(nodes),
        "next_suggestion": get_workflow_suggestion(nodes),
    }


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
