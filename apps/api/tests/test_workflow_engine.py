import pytest
from app.services.workflow_engine import (
    build_default_workflow,
    update_workflow_from_runs,
    get_current_stage,
    get_next_stage,
    serialize_workflow_nodes,
    get_stage_by_skill,
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

    def test_get_stage_by_unknown_skill(self):
        result = get_stage_by_skill("unknown-skill")
        assert result is None

    def test_serialize_workflow_nodes(self):
        nodes = build_default_workflow()
        serialized = serialize_workflow_nodes(nodes)
        assert len(serialized) == 9
        assert all("stage_id" in n for n in serialized)
        assert all("status" in n for n in serialized)
