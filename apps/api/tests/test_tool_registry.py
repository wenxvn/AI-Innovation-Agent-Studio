import pytest
from app.services.tools import list_tools, _load_registry_from_yaml


class TestToolRegistry:
    def test_list_tools_returns_tools(self):
        tools = list_tools()
        assert len(tools) > 0
        assert all("name" in t for t in tools)

    def test_list_tools_has_required_fields(self):
        tools = list_tools()
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
            assert "risk_level" in tool
            assert "requires_approval" in tool

    def test_load_registry_from_yaml(self):
        tools = _load_registry_from_yaml()
        if tools:
            assert len(tools) > 0
            rag_tool = next((t for t in tools if t["name"] == "rag_search"), None)
            assert rag_tool is not None
            assert rag_tool["risk_level"] == "low"
            assert rag_tool["requires_approval"] is False

    def test_high_risk_tools_require_approval(self):
        tools = list_tools()
        high_risk = [t for t in tools if t.get("risk_level") == "high"]
        for tool in high_risk:
            assert tool["requires_approval"] is True

    def test_rag_search_tool_exists(self):
        tools = list_tools()
        names = [t["name"] for t in tools]
        assert "rag_search" in names
        assert "memory_search" in names
        assert "output_writer" in names
