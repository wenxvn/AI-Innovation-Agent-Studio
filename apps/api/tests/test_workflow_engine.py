import pytest
from app.services.workflow_engine import (
    build_workflow_status,
    build_default_workflow,
    calculate_project_progress,
    update_workflow_from_runs,
    get_current_stage,
    get_next_stage,
    serialize_workflow_nodes,
    get_stage_by_skill,
    resolve_workflow_stage,
)


class TestWorkflowEngine:
    def test_build_default_workflow(self):
        nodes = build_default_workflow()
        assert len(nodes) == 9
        assert nodes[0].stage_id == "requirement_analysis"
        assert nodes[-1].stage_id == "human_review"

    def test_update_workflow_from_runs(self):
        nodes = build_default_workflow()
        runs = [
            {
                "id": "run-1",
                "selected_skill": "prd-writer",
                "status": "completed",
                "created_at": "2026-05-27T10:00:00",
                "updated_at": "2026-05-27T10:01:00",
                "latency_ms": 5000,
                "error_message": "",
                "generated_output": {"title": "PRD 文档"},
            }
        ]
        updated = update_workflow_from_runs(nodes, runs)
        prd_node = next(n for n in updated if n.skill == "prd-writer")
        assert prd_node.status == "success"
        assert prd_node.run_id == "run-1"
        assert prd_node.output_summary == "PRD 文档"
        assert calculate_project_progress(updated) == 50

    def test_update_workflow_from_alias_skill(self):
        nodes = build_default_workflow()
        runs = [
            {
                "id": "run-frontend",
                "selected_skill": "nextjs-generator",
                "status": "completed",
                "created_at": "2026-05-27T10:00:00",
                "updated_at": "2026-05-27T10:02:00",
                "latency_ms": 2500,
                "error_message": "",
                "generated_output": {"title": "Next.js 页面", "type": "frontend_code"},
                "metadata_": {"intent": "frontend_code", "output_type": "frontend_code"},
            }
        ]

        updated = update_workflow_from_runs(nodes, runs)
        coding_node = next(n for n in updated if n.stage_id == "coding")
        assert coding_node.status == "success"
        assert coding_node.run_id == "run-frontend"
        assert calculate_project_progress(updated) == 75

    def test_resolve_workflow_stage_from_intent_and_output_type(self):
        assert resolve_workflow_stage(intent="api_design") == "architecture"
        assert resolve_workflow_stage(output_type="test_report") == "qa"

    def test_update_workflow_failed_run(self):
        nodes = build_default_workflow()
        runs = [
            {
                "id": "run-2",
                "selected_skill": "architecture-designer",
                "status": "failed",
                "created_at": "2026-05-27T10:00:00",
                "updated_at": "2026-05-27T10:01:00",
                "latency_ms": 3000,
                "error_message": "Connection timeout",
                "generated_output": {},
            }
        ]
        updated = update_workflow_from_runs(nodes, runs)
        arch_node = next(n for n in updated if n.skill == "architecture-designer")
        assert arch_node.status == "failed"
        assert arch_node.error_message == "Connection timeout"
        assert calculate_project_progress(updated) == 0

    def test_get_current_stage_empty(self):
        nodes = build_default_workflow()
        assert get_current_stage(nodes) == "requirement_analysis"

    def test_get_current_stage_with_run(self):
        nodes = build_default_workflow()
        runs = [
            {
                "id": "run-1",
                "selected_skill": "prd-writer",
                "status": "completed",
                "created_at": "",
                "updated_at": "",
                "latency_ms": 0,
                "error_message": "",
                "generated_output": {},
            }
        ]
        nodes = update_workflow_from_runs(nodes, runs)
        assert get_current_stage(nodes) == "product"

    def test_get_next_stage(self):
        nodes = build_default_workflow()
        assert get_next_stage(nodes) == "requirement_analysis"

    def test_get_next_stage_after_completion(self):
        nodes = build_default_workflow()
        runs = [
            {
                "id": "run-1",
                "selected_skill": "competition-analyzer",
                "status": "completed",
                "created_at": "",
                "updated_at": "",
                "latency_ms": 0,
                "error_message": "",
                "generated_output": {},
            }
        ]
        nodes = update_workflow_from_runs(nodes, runs)
        assert get_next_stage(nodes) == "ideation"

    def test_get_stage_by_skill(self):
        result = get_stage_by_skill("prd-writer")
        assert result is not None
        assert result["id"] == "product"

    def test_get_stage_by_alias_skill(self):
        result = get_stage_by_skill("api-designer")
        assert result is not None
        assert result["id"] == "architecture"

    def test_get_stage_by_unknown_skill(self):
        result = get_stage_by_skill("unknown-skill")
        assert result is None

    def test_serialize_workflow_nodes(self):
        nodes = build_default_workflow()
        serialized = serialize_workflow_nodes(nodes)
        assert len(serialized) == 9
        assert all("stage_id" in n for n in serialized)
        assert all("status" in n for n in serialized)

    def test_build_workflow_status_summary(self):
        status = build_workflow_status("project-1", [
            {
                "id": "run-1",
                "selected_skill": "prd-writer",
                "status": "completed",
                "created_at": "2026-05-27T10:00:00",
                "updated_at": "2026-05-27T10:01:00",
                "latency_ms": 5000,
                "error_message": "",
                "generated_output": {"title": "PRD 文档", "content": "核心需求"},
                "metadata_": {"intent": "prd_generation", "output_type": "prd"},
            }
        ])

        assert status["current_stage"] == "product"
        assert status["progress"] == 50
        assert status["recent_run"]["id"] == "run-1"
        assert status["recent_run"]["output_summary"] == "PRD 文档 - 核心需求"
        assert status["failed_nodes"] == []
        assert status["next_stage"] == "architecture"
