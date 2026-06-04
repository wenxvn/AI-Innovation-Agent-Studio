import pytest
from app.services.intent_classifier import rule_based_classify, classify_intent


class TestRuleBasedClassifier:
    def test_competition_analysis(self):
        result = rule_based_classify("帮我分析这个比赛的赛题要求")
        assert result.intent == "competition_analysis"
        assert result.selected_skill == "competition-analyzer"
        assert result.confidence > 0

    def test_prd_generation(self):
        result = rule_based_classify("帮我写一个 PRD 需求文档")
        assert result.intent == "prd_generation"
        assert result.selected_skill == "prd-writer"

    def test_architecture_design(self):
        result = rule_based_classify("帮我设计系统架构和数据库")
        assert result.intent == "architecture_design"
        assert result.selected_skill == "architecture-designer"

    def test_pitch(self):
        result = rule_based_classify("帮我生成答辩稿")
        assert result.intent == "pitch"
        assert result.selected_skill == "pitch-writer"

    def test_idea_generation(self):
        result = rule_based_classify("帮我生成一些创意和想法")
        assert result.intent == "idea_generation"
        assert result.selected_skill == "idea-generator"

    def test_research(self):
        result = rule_based_classify("帮我做一个调研报告")
        assert result.intent == "research"
        assert result.selected_skill == "research-synthesizer"

    def test_frontend_code(self):
        result = rule_based_classify("帮我生成前端 React 页面")
        assert result.intent == "frontend_code"
        assert result.selected_skill == "nextjs-generator"

    def test_backend_code(self):
        result = rule_based_classify("帮我写后端 FastAPI 服务")
        assert result.intent == "backend_code"
        assert result.selected_skill == "fastapi-generator"

    def test_general_chat_fallback(self):
        result = rule_based_classify("今天天气怎么样")
        assert result.intent == "general_chat"
        assert result.selected_skill == "context-pack-builder"
        assert result.confidence == 0.5


class TestIntentClassifier:
    @pytest.mark.asyncio
    async def test_classify_intent_returns_result(self):
        result = await classify_intent("帮我写 PRD")
        assert result.intent is not None
        assert result.selected_skill is not None
        assert result.confidence > 0
        assert result.reason is not None

    @pytest.mark.asyncio
    async def test_classify_intent_fallback(self):
        result = await classify_intent("xyz unknown input 12345")
        assert result.intent is not None
        assert result.selected_skill is not None
