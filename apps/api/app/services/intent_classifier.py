import json
import logging
from dataclasses import dataclass
from app.services.llm import get_llm_provider
from app.services.providers.mock_provider import MockLLMProvider

logger = logging.getLogger(__name__)

INTENT_MAP = {
    "competition_analysis": {
        "selected_skill": "competition-analyzer",
        "workflow_stage": "requirement_analysis",
        "output_type": "analysis_report",
    },
    "idea_generation": {
        "selected_skill": "idea-generator",
        "workflow_stage": "ideation",
        "output_type": "idea_report",
    },
    "research": {
        "selected_skill": "research-synthesizer",
        "workflow_stage": "research",
        "output_type": "research_report",
    },
    "prd_generation": {
        "selected_skill": "prd-writer",
        "workflow_stage": "product",
        "output_type": "prd",
    },
    "architecture_design": {
        "selected_skill": "architecture-designer",
        "workflow_stage": "architecture",
        "output_type": "architecture",
    },
    "api_design": {
        "selected_skill": "api-designer",
        "workflow_stage": "architecture",
        "output_type": "api_doc",
    },
    "backend_code": {
        "selected_skill": "fastapi-generator",
        "workflow_stage": "coding",
        "output_type": "backend_code",
    },
    "frontend_code": {
        "selected_skill": "nextjs-generator",
        "workflow_stage": "coding",
        "output_type": "frontend_code",
    },
    "qa_debug": {
        "selected_skill": "qa-debugger",
        "workflow_stage": "qa",
        "output_type": "test_report",
    },
    "pitch": {
        "selected_skill": "pitch-writer",
        "workflow_stage": "pitch",
        "output_type": "pitch",
    },
    "general_chat": {
        "selected_skill": "context-pack-builder",
        "workflow_stage": "general",
        "output_type": "agent_output",
    },
}

INTENT_CLASSIFIER_PROMPT = """你是一个意图分类器。根据用户的输入，判断用户想要执行的任务类型。

可选的 intent 类型：
- competition_analysis: 分析比赛、赛题、评分标准
- idea_generation: 生成项目创意、方向、点子
- research: 调研、研究、对比分析
- prd_generation: 撰写产品需求文档 PRD
- architecture_design: 设计系统架构、数据库设计
- api_design: 设计 API 接口
- backend_code: 生成后端代码
- frontend_code: 生成前端代码
- qa_debug: 质量检查、调试、测试
- pitch: 生成答辩稿、PPT、演讲稿
- general_chat: 一般对话、其他任务

用户输入: {user_input}

请返回 JSON 格式：
{{
  "intent": "intent类型",
  "confidence": 0.0到1.0的置信度,
  "reason": "选择该意图的原因"
}}

只返回 JSON，不要添加其他文字。"""


@dataclass
class IntentResult:
    intent: str
    selected_skill: str
    workflow_stage: str
    output_type: str
    confidence: float
    reason: str


def rule_based_classify(user_input: str) -> IntentResult:
    input_lower = user_input.lower()

    rules = [
        (["比赛", "赛题", "评分", "竞赛", "competition"], "competition_analysis"),
        (["想法", "创意", "方向", "idea", "点子"], "idea_generation"),
        (["prd", "需求文档", "产品需求", "需求"], "prd_generation"),
        (["架构", "系统设计", "数据库设计", "microservice"], "architecture_design"),
        (["调研", "研究", "对比分析", "竞品", "research"], "research"),
        (["前端", "ui", "页面", "react", "next.js", "组件"], "frontend_code"),
        (["后端", "fastapi", "服务端", "api开发", "backend"], "backend_code"),
        (["api", "接口设计", "restful", "endpoint"], "api_design"),
        (["测试", "debug", "调试", "bug", "质量"], "qa_debug"),
        (["答辩", "ppt", "演讲", "presentation", "pitch"], "pitch"),
    ]

    for keywords, intent in rules:
        if any(w in input_lower for w in keywords):
            mapping = INTENT_MAP[intent]
            return IntentResult(
                intent=intent,
                selected_skill=mapping["selected_skill"],
                workflow_stage=mapping["workflow_stage"],
                output_type=mapping["output_type"],
                confidence=0.75,
                reason=f"关键词匹配: {[w for w in keywords if w in input_lower][:2]}",
            )

    mapping = INTENT_MAP["general_chat"]
    return IntentResult(
        intent="general_chat",
        selected_skill=mapping["selected_skill"],
        workflow_stage=mapping["workflow_stage"],
        output_type=mapping["output_type"],
        confidence=0.5,
        reason="未匹配到特定意图，使用通用处理",
    )


async def llm_classify(user_input: str) -> IntentResult | None:
    try:
        llm_provider = get_llm_provider()
        if isinstance(llm_provider, MockLLMProvider):
            return None

        prompt = INTENT_CLASSIFIER_PROMPT.format(user_input=user_input)
        messages = [
            {"role": "system", "content": "你是一个精确的意图分类器，只返回 JSON。"},
            {"role": "user", "content": prompt},
        ]

        result = await llm_provider.generate(
            messages=messages,
            response_format="json",
            temperature=0.1,
            max_tokens=500,
            metadata={"task": "intent_classification"},
        )

        if result.error:
            logger.warning("LLM intent classification failed: %s", result.error)
            return None

        raw_text = result.content.strip()
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        parsed = json.loads(raw_text)
        intent = parsed.get("intent", "general_chat")

        if intent not in INTENT_MAP:
            logger.warning("Unknown intent from LLM: %s, falling back to general_chat", intent)
            intent = "general_chat"

        mapping = INTENT_MAP[intent]
        return IntentResult(
            intent=intent,
            selected_skill=mapping["selected_skill"],
            workflow_stage=mapping["workflow_stage"],
            output_type=mapping["output_type"],
            confidence=float(parsed.get("confidence", 0.8)),
            reason=parsed.get("reason", "LLM 分类"),
        )
    except Exception as e:
        logger.error("LLM intent classification error: %s", e)
        return None


async def classify_intent(user_input: str) -> IntentResult:
    llm_result = await llm_classify(user_input)
    if llm_result:
        logger.info(
            "Intent classified by LLM: intent=%s, skill=%s, confidence=%.2f",
            llm_result.intent, llm_result.selected_skill, llm_result.confidence,
        )
        return llm_result

    rule_result = rule_based_classify(user_input)
    logger.info(
        "Intent classified by rules: intent=%s, skill=%s, confidence=%.2f",
        rule_result.intent, rule_result.selected_skill, rule_result.confidence,
    )
    return rule_result
