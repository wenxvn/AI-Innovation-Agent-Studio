import time
import json
import asyncio
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.agent_run import AgentRun
from app.models.output import Output
from app.models.evaluation import Evaluation
from app.models.tool_call import ToolCall
from app.schemas.agent_run import AgentRunCreate
from app.services.tools import execute_tool
from app.services.llm import get_llm_provider, get_provider_status
from app.services.providers.mock_provider import MockLLMProvider, get_mock_response
from app.services.trace import create_trace_event
from app.services.intent_classifier import classify_intent
from app.prompts.agent_run import AGENT_RUN_PROMPT as FALLBACK_AGENT_RUN_PROMPT
from app.prompts.agent_run import SYSTEM_PROMPT as FALLBACK_SYSTEM_PROMPT
from app.services.prompts import AGENT_RUN_PROMPT_NAME, SYSTEM_PROMPT_NAME, get_active_prompt_content
from app.services.projects import sync_project_workflow_state
from app.core.config import get_settings
from typing import Optional

logger = logging.getLogger(__name__)
settings = get_settings()

SKILL_TO_TYPE = {
    "competition-analyzer": "analysis",
    "idea-generator": "idea_report",
    "prd-writer": "prd",
    "architecture-designer": "architecture",
    "research-synthesizer": "research_report",
    "pitch-writer": "pitch",
    "fastapi-generator": "backend_code",
    "nextjs-generator": "frontend_code",
    "qa-debugger": "test_report",
    "api-designer": "architecture",
    "rag-builder": "architecture",
    "context-pack-builder": "analysis",
}

SKILL_TO_TITLE_PREFIX = {
    "competition-analyzer": "竞赛分析",
    "idea-generator": "项目方向报告",
    "prd-writer": "PRD",
    "architecture-designer": "系统架构设计",
    "research-synthesizer": "调研分析报告",
    "pitch-writer": "答辩稿",
    "fastapi-generator": "FastAPI 代码骨架",
    "nextjs-generator": "Next.js 代码骨架",
    "qa-debugger": "测试与修复建议",
    "api-designer": "API 设计文档",
    "rag-builder": "RAG 构建方案",
    "context-pack-builder": "上下文包分析",
}

AGENT_NAME_MAP = {
    "competition-analyzer": "Research Agent",
    "idea-generator": "Product Agent",
    "prd-writer": "Product Agent",
    "architecture-designer": "Architecture Agent",
    "research-synthesizer": "Research Agent",
    "fastapi-generator": "Coding Agent",
    "nextjs-generator": "Coding Agent",
    "qa-debugger": "QA Agent",
    "pitch-writer": "Pitch Agent",
    "api-designer": "Architecture Agent",
    "rag-builder": "Coding Agent",
    "context-pack-builder": "Orchestrator Agent",
}

INSPIRATION_RUN_MODE = "inspiration_discovery"

INSPIRATION_KEYWORDS = [
    "没有idea",
    "没有 idea",
    "没idea",
    "没 idea",
    "没有想法",
    "没想法",
    "不知道做什么",
    "找灵感",
    "灵感",
    "热点",
    "小红书",
    "抖音",
    "推特",
    "twitter",
    "x/twitter",
    "论坛",
    "社交平台",
]

SOCIAL_TREND_PLATFORMS = [
    {
        "name": "小红书",
        "signals": ["高收藏笔记", "评论区痛点", "生活方式新词", "消费和学习场景"],
        "best_for": "发现高共情的真实需求、细分人群和可视化内容切入点",
    },
    {
        "name": "抖音",
        "signals": ["爆款短视频主题", "挑战话题", "直播高频问题", "评论复述率"],
        "best_for": "发现大众传播势能、强情绪场景和可演示的产品钩子",
    },
    {
        "name": "X/Twitter",
        "signals": ["技术圈讨论", "AI 工具趋势", "创作者吐槽", "开源项目传播"],
        "best_for": "发现新技术、新工作流和早期采用者需求",
    },
    {
        "name": "知乎/即刻/贴吧/Reddit 等论坛",
        "signals": ["长帖问题", "求助帖", "经验复盘", "反复出现的解决方案缺口"],
        "best_for": "验证问题深度、用户愿不愿意解释痛点以及是否已有替代方案",
    },
]


def select_skill(user_input: str) -> str:
    input_lower = user_input.lower()
    if any(w in input_lower for w in ["比赛", "赛题", "评分", "竞赛"]):
        return "competition-analyzer"
    if any(w in input_lower for w in ["想法", "创意", "方向", "idea"]):
        return "idea-generator"
    if any(w in input_lower for w in ["prd", "需求", "产品"]):
        return "prd-writer"
    if any(w in input_lower for w in ["架构", "设计", "数据库"]):
        return "architecture-designer"
    if any(w in input_lower for w in ["调研", "研究", "对比"]):
        return "research-synthesizer"
    if any(w in input_lower for w in ["api", "接口"]):
        return "api-designer"
    if any(w in input_lower for w in ["前端", "ui", "页面"]):
        return "nextjs-generator"
    if any(w in input_lower for w in ["后端", "fastapi", "服务"]):
        return "fastapi-generator"
    if any(w in input_lower for w in ["答辩", "ppt", "演讲"]):
        return "pitch-writer"
    return "prd-writer"


def is_inspiration_discovery(user_input: str, skill_name: str, run_mode: Optional[str] = None) -> bool:
    if run_mode == INSPIRATION_RUN_MODE:
        return True
    if skill_name != "idea-generator":
        return False

    normalized = user_input.lower().replace(" ", "")
    return any(keyword.replace(" ", "") in normalized for keyword in INSPIRATION_KEYWORDS)


def build_social_trend_scan(db: Session, project_id: str, agent_run_id: str, user_input: str) -> dict:
    scan_start = time.time()
    theme_hint = user_input.strip()[:240] or "用户尚未提供明确主题"
    scan = {
        "mode": INSPIRATION_RUN_MODE,
        "theme_hint": theme_hint,
        "platforms": SOCIAL_TREND_PLATFORMS,
        "topic_selection_rules": [
            "优先选择反复出现、评论区有真实抱怨或求助的问题",
            "过滤纯娱乐、纯资讯和难以产品化的短期噪声",
            "保留能转化为 AI Agent、RAG、自动化、数据分析或协作工具的机会",
            "每个建议都需要说明目标用户、痛点、MVP 形态、验证方式和风险",
        ],
        "candidate_angles": [
            {
                "theme": "AI + 学习/考试/资料整理",
                "hotspot_logic": "小红书和论坛常出现资料过载、备考规划、笔记整理和答疑效率问题",
            },
            {
                "theme": "AI + 职场效率/副业创作",
                "hotspot_logic": "抖音和 X/Twitter 常出现自动化工作流、内容生成、简历面试和复盘模板需求",
            },
            {
                "theme": "AI + 情绪陪伴/生活决策",
                "hotspot_logic": "小红书和知乎常出现选择困难、情绪复盘、关系沟通和生活规划类高互动问题",
            },
            {
                "theme": "AI + 本地生活/消费避坑",
                "hotspot_logic": "社交平台评论区常沉淀价格比较、评价辨别、攻略生成和个性化推荐需求",
            },
        ],
        "deliverable_focus": [
            "先给出 3-5 个用于确定大体主题的追问",
            "基于已有线索假设 2-3 个主题方向",
            "按平台列出热点信号和可转化机会",
            "给出推荐优先级、MVP 范围、验证实验和下一步行动",
        ],
    }

    try:
        tc_social = ToolCall(
            project_id=project_id,
            agent_run_id=agent_run_id,
            tool_name="social_trend_scan",
            input_params={
                "query": user_input,
                "platforms": [p["name"] for p in SOCIAL_TREND_PLATFORMS],
                "mode": INSPIRATION_RUN_MODE,
            },
            output_result={
                "theme_hint": theme_hint,
                "platform_count": len(SOCIAL_TREND_PLATFORMS),
                "candidate_angle_count": len(scan["candidate_angles"]),
                "selection_rules": scan["topic_selection_rules"],
            },
            status="completed",
            permission_level="medium",
            requires_approval=False,
            latency_ms=int((time.time() - scan_start) * 1000),
        )
        db.add(tc_social)
        db.commit()
        logger.info("Tool call recorded: social_trend_scan, platforms=%d", len(SOCIAL_TREND_PLATFORMS))
    except Exception as e:
        logger.error("Failed to record social_trend_scan tool call: %s", e)

    return scan


def build_context_pack(
    db: Session,
    project_id: str,
    agent_run_id: str,
    user_input: str,
    skill_name: str,
    run_mode: Optional[str] = None,
) -> dict:
    memory_result = execute_tool(
        db,
        project_id=project_id,
        agent_run_id=agent_run_id,
        tool_name="memory_search",
        input_params={"query": user_input, "top_k": 3, "skill": skill_name},
    )
    rag_result = execute_tool(
        db,
        project_id=project_id,
        agent_run_id=agent_run_id,
        tool_name="rag_search",
        input_params={"query": user_input, "top_k": 5, "skill": skill_name},
    )

    memories = memory_result.output_result.get("memories", [])
    chunks = rag_result.output_result.get("chunks", [])

    context_pack = {
        "task": user_input,
        "selected_skill": skill_name,
        "relevant_memory": [
            {
                "id": m.get("id", ""),
                "memory_type": m.get("memory_type", "general"),
                "content": m.get("content", ""),
                "confidence": m.get("confidence", 1.0),
            }
            for m in memories
        ],
        "retrieved_evidence": [
            {
                "source_type": "document_chunk",
                "source_id": c.get("chunk_id", ""),
                "document_id": c.get("document_id", ""),
                "chunk_index": c.get("chunk_index", 0),
                "excerpt": c.get("content", "")[:500],
                "score": c.get("score", 1.0),
            }
            for c in chunks
        ],
        "constraints": [],
        "risks": [],
    }

    if is_inspiration_discovery(user_input, skill_name, run_mode):
        context_pack["social_trend_scan"] = build_social_trend_scan(db, project_id, agent_run_id, user_input)
        context_pack["constraints"].append("社媒平台热点需要结合实时搜索结果复核，避免把短期噪声误判为长期需求")
        context_pack["risks"].append("平台内容可能存在营销号、刷量和样本偏差，建议用评论区痛点和外部资料交叉验证")

    return context_pack


def build_plan(skill_name: str, run_mode: Optional[str] = None) -> list[dict]:
    if skill_name == "idea-generator" and run_mode == INSPIRATION_RUN_MODE:
        return [
            {"step": 1, "action": "提出主题澄清问题", "status": "completed"},
            {"step": 2, "action": "扫描社媒热点信号", "status": "completed"},
            {"step": 3, "action": "筛选可产品化话题", "status": "completed"},
            {"step": 4, "action": "生成项目方向和验证建议", "status": "completed"},
        ]

    plan_templates = {
        "competition-analyzer": [
            {"step": 1, "action": "解析比赛文档", "status": "completed"},
            {"step": 2, "action": "提取评分标准", "status": "completed"},
            {"step": 3, "action": "生成需求清单", "status": "completed"},
        ],
        "idea-generator": [
            {"step": 1, "action": "分析比赛要求", "status": "completed"},
            {"step": 2, "action": "调研技术趋势", "status": "completed"},
            {"step": 3, "action": "生成项目方向", "status": "completed"},
            {"step": 4, "action": "评估可行性", "status": "completed"},
        ],
        "prd-writer": [
            {"step": 1, "action": "理解项目目标", "status": "completed"},
            {"step": 2, "action": "定义用户画像", "status": "completed"},
            {"step": 3, "action": "撰写用户故事", "status": "completed"},
            {"step": 4, "action": "整理功能优先级", "status": "completed"},
        ],
        "architecture-designer": [
            {"step": 1, "action": "分析技术需求", "status": "completed"},
            {"step": 2, "action": "设计系统架构", "status": "completed"},
            {"step": 3, "action": "定义数据模型", "status": "completed"},
            {"step": 4, "action": "规划 API 接口", "status": "completed"},
        ],
    }
    return plan_templates.get(skill_name, [
        {"step": 1, "action": "分析任务需求", "status": "completed"},
        {"step": 2, "action": "执行任务", "status": "completed"},
        {"step": 3, "action": "生成结果", "status": "completed"},
    ])


def format_memory_context(context_pack: dict) -> str:
    memories = context_pack.get("relevant_memory", [])
    if not memories:
        return "暂无相关记忆。"
    parts = []
    for m in memories:
        parts.append(f"- [{m.get('memory_type', 'general')}] {m.get('content', '')}")
    return "\n".join(parts)


def format_evidence_context(context_pack: dict) -> str:
    evidence = context_pack.get("retrieved_evidence", [])
    if not evidence:
        return "暂无检索到的文档证据。"
    parts = []
    for e in evidence:
        parts.append(f"- [来源: {e.get('document_id', 'unknown')}] {e.get('excerpt', '')[:300]}")
    return "\n".join(parts)


def format_trend_context(context_pack: dict) -> str:
    scan = context_pack.get("social_trend_scan")
    if not scan:
        return "暂无社媒热点扫描。"

    parts = [
        f"- 运行模式: {scan.get('mode', INSPIRATION_RUN_MODE)}",
        f"- 主题线索: {scan.get('theme_hint', '用户尚未提供明确主题')}",
        "- 平台扫描重点:",
    ]

    for platform in scan.get("platforms", []):
        signals = "、".join(platform.get("signals", []))
        parts.append(f"  - {platform.get('name')}: {platform.get('best_for')}；关注 {signals}")

    candidate_angles = scan.get("candidate_angles", [])
    if candidate_angles:
        parts.append("- 可先验证的热点角度:")
        for angle in candidate_angles:
            parts.append(f"  - {angle.get('theme')}: {angle.get('hotspot_logic')}")

    rules = scan.get("topic_selection_rules", [])
    if rules:
        parts.append("- 话题筛选规则:")
        parts.extend(f"  - {rule}" for rule in rules)

    return "\n".join(parts)


def rule_based_eval(output: dict, context_pack: dict) -> dict:
    content = output.get("content", "")
    evidence = context_pack.get("retrieved_evidence", [])

    content_len = len(content)
    completeness = min(95, max(50, content_len // 20))
    correctness = 80 if content_len > 200 else 60
    feasibility = 78
    innovation = 70
    engineering_quality = 75

    has_evidence_ref = any(e.get("excerpt", "")[:20] in content for e in evidence) if evidence else False
    citation_quality = 85 if has_evidence_ref else 50

    dimensions = {
        "correctness": correctness,
        "completeness": completeness,
        "feasibility": feasibility,
        "innovation": innovation,
        "engineering_quality": engineering_quality,
        "citation_quality": citation_quality,
    }
    score = sum(dimensions.values()) / len(dimensions)

    return {
        "overall_score": round(score, 1),
        "mode": "rule_based",
        "provider": "rule",
        "model": "rule-based-eval-v1",
        "dimensions": [
            {"name": k, "score": v, "reason": f"基于规则的{k}评估"}
            for k, v in dimensions.items()
        ],
        "strengths": ["内容已生成", "结构完整"] if content_len > 500 else ["内容已生成"],
        "weaknesses": ["缺少证据引用"] if not has_evidence_ref else [],
        "risks": ["未经过 LLM 深度评估"],
        "action_items": ["建议配置 LLM API Key 以获得更准确的评估"],
        "score": round(score, 1),
        "rubric": dimensions,
        "result": "pass" if score >= 70 else "fail",
        "feedback": f"基于规则评估，总分 {round(score, 1)}。{'建议配置 LLM 以获得更精确评估。' if score < 80 else '整体质量良好。'}",
    }


async def _run_agent_async(db: Session, project_id: str, data: AgentRunCreate) -> AgentRun:
    start_time = time.time()

    intent_result = await classify_intent(data.user_input)
    skill_name = data.selected_skill or intent_result.selected_skill
    agent_name = data.agent_name or AGENT_NAME_MAP.get(skill_name, "Orchestrator Agent")
    requested_run_mode = data.run_mode or ""
    run_mode = (
        INSPIRATION_RUN_MODE
        if is_inspiration_discovery(data.user_input, skill_name, requested_run_mode)
        else requested_run_mode or "standard"
    )

    logger.info("Agent run started: project=%s, skill=%s, agent=%s, mode=%s", project_id, skill_name, agent_name, run_mode)

    provider_status = get_provider_status()
    llm_provider = get_llm_provider()
    is_mock = isinstance(llm_provider, MockLLMProvider)

    run = AgentRun(
        project_id=project_id,
        agent_name=agent_name,
        status="planning",
        user_input=data.user_input,
        selected_skill=skill_name,
        metadata_={
            "provider": provider_status.llm_provider,
            "model": provider_status.llm_model,
            "mode": provider_status.llm_mode,
            "intent": intent_result.intent,
            "intent_confidence": intent_result.confidence,
            "intent_reason": intent_result.reason,
            "workflow_stage": intent_result.workflow_stage,
            "output_type": intent_result.output_type,
            "run_mode": run_mode,
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    create_trace_event(
        db, project_id, run.id,
        event_type="run_created",
        title="Agent Run 创建",
        message=f"Skill: {skill_name}, Agent: {agent_name}, Mode: {provider_status.llm_mode}, Run Mode: {run_mode}",
        status="info",
        metadata={"skill": skill_name, "agent": agent_name, "mode": provider_status.llm_mode, "run_mode": run_mode},
    )

    create_trace_event(
        db, project_id, run.id,
        event_type="intent_classified",
        title="意图识别完成",
        message=f"Intent: {intent_result.intent}, Skill: {skill_name}, Confidence: {intent_result.confidence:.2f}",
        status="info",
        metadata={
            "intent": intent_result.intent,
            "selected_skill": skill_name,
            "workflow_stage": intent_result.workflow_stage,
            "output_type": intent_result.output_type,
            "confidence": intent_result.confidence,
            "reason": intent_result.reason,
        },
    )

    try:
        create_trace_event(
            db, project_id, run.id,
            event_type="planning_completed",
            title="规划完成",
            message=f"选择 Skill: {skill_name}, Workflow Stage: {intent_result.workflow_stage}",
            status="info",
        )

        run.status = "retrieving_context"
        db.commit()

        create_trace_event(
            db, project_id, run.id,
            event_type="context_retrieval_started",
            title="开始检索上下文",
            message="检索相关 Memory 和文档证据",
            status="info",
        )

        context_pack = build_context_pack(db, project_id, run.id, data.user_input, skill_name, run_mode)

        create_trace_event(
            db, project_id, run.id,
            event_type="context_retrieval_completed",
            title="上下文检索完成",
            message=f"Memory: {len(context_pack.get('relevant_memory', []))}, Evidence: {len(context_pack.get('retrieved_evidence', []))}, Trend Scan: {bool(context_pack.get('social_trend_scan'))}",
            status="info",
            output_data={
                "memory_count": len(context_pack.get("relevant_memory", [])),
                "evidence_count": len(context_pack.get("retrieved_evidence", [])),
                "has_social_trend_scan": bool(context_pack.get("social_trend_scan")),
            },
        )

        run.status = "generating"
        run.context_pack = context_pack
        run.plan = build_plan(skill_name, run_mode)
        db.commit()

        create_trace_event(
            db, project_id, run.id,
            event_type="generation_started",
            title="开始生成",
            message=f"Provider: {provider_status.llm_provider}, Model: {provider_status.llm_model}",
            status="info",
            metadata={"provider": provider_status.llm_provider, "model": provider_status.llm_model},
        )

        expected_type = SKILL_TO_TYPE.get(skill_name, "document")

        agent_prompt_template = get_active_prompt_content(
            db,
            AGENT_RUN_PROMPT_NAME,
            FALLBACK_AGENT_RUN_PROMPT,
        )
        system_prompt = get_active_prompt_content(
            db,
            SYSTEM_PROMPT_NAME,
            FALLBACK_SYSTEM_PROMPT,
        )

        prompt = agent_prompt_template.format(
            skill_name=skill_name,
            agent_name=agent_name,
            user_input=data.user_input,
            project_context=f"项目ID: {project_id}",
            memory_context=format_memory_context(context_pack),
            evidence_context=format_evidence_context(context_pack),
            trend_context=format_trend_context(context_pack),
            expected_type=expected_type,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        llm_result = await llm_provider.generate(
            messages=messages,
            response_format="json",
            temperature=0.3,
            max_tokens=4096,
            metadata={"skill_name": skill_name, "run_mode": run_mode},
        )

        if llm_result.error and not is_mock:
            llm_provider_fallback = MockLLMProvider()
            llm_result = await llm_provider_fallback.generate(
                messages=messages,
                response_format="json",
                temperature=0.3,
                metadata={"skill_name": skill_name, "run_mode": run_mode},
            )

        output = {}
        if llm_result.raw and isinstance(llm_result.raw, dict) and "title" in llm_result.raw:
            output = llm_result.raw
        elif llm_result.content:
            try:
                output = json.loads(llm_result.content)
            except json.JSONDecodeError:
                output = {
                    "title": f"{skill_name} 产物",
                    "type": expected_type,
                    "content": llm_result.content,
                }
        else:
            mock_data = get_mock_response(skill_name, data.user_input)
            output = mock_data

        output["mode"] = llm_result.mode
        output["provider"] = llm_result.provider
        output["model"] = llm_result.model

        create_trace_event(
            db, project_id, run.id,
            event_type="generation_completed",
            title="生成完成",
            message=f"Title: {output.get('title', 'Untitled')}, Mode: {llm_result.mode}",
            status="success",
            latency_ms=llm_result.latency_ms,
            output_data={"title": output.get("title", ""), "type": output.get("type", ""), "mode": llm_result.mode, "provider": llm_result.provider},
        )

        run.status = "evaluating"
        run.generated_output = output
        db.commit()

        create_trace_event(
            db, project_id, run.id,
            event_type="eval_started",
            title="开始评估",
            message="基于规则的评估",
            status="info",
        )

        eval_result = rule_based_eval(output, context_pack)
        run.eval_result = eval_result

        create_trace_event(
            db, project_id, run.id,
            event_type="eval_completed",
            title="评估完成",
            message=f"Score: {eval_result.get('overall_score', 0)}, Result: {eval_result.get('result', 'pending')}",
            status="success",
            output_data={"score": eval_result.get("overall_score", 0), "result": eval_result.get("result", "")},
        )

        token_usage_dict = {
            "prompt_tokens": llm_result.token_usage.input_tokens,
            "completion_tokens": llm_result.token_usage.output_tokens,
            "total_tokens": llm_result.token_usage.total_tokens,
        }

        latency_ms = int((time.time() - start_time) * 1000)

        run.token_usage = token_usage_dict
        run.latency_ms = latency_ms
        run.cost = token_usage_dict["total_tokens"] * 0.000002 if not is_mock else 0
        run.status = "completed"
        db.commit()

        output_title = output.get("title", "")
        if not output_title or output_title == "Untitled":
            prefix = SKILL_TO_TITLE_PREFIX.get(skill_name, "Agent 输出")
            summary = data.user_input[:50].strip()
            output_title = f"{prefix} - {summary}"

        output_execution = execute_tool(
            db,
            project_id=project_id,
            agent_run_id=run.id,
            tool_name="output_writer",
            input_params={
                "skill": skill_name,
                "user_input": data.user_input,
                "output_type": output.get("type", expected_type),
                "title": output_title,
                "content": output.get("content", ""),
                "created_by_agent": agent_name,
                "status": "completed",
                "metadata": {
                    "provider": llm_result.provider,
                    "model": llm_result.model,
                    "mode": llm_result.mode,
                    "run_mode": run_mode,
                },
            },
        )
        if output_execution.status != "completed":
            raise RuntimeError(output_execution.error_message or "Output writer failed")

        output_id = output_execution.output_result.get("output_id", "")
        new_output = db.get(Output, output_id)
        if not new_output:
            raise RuntimeError("Output writer did not persist an output")

        logger.info(
            "Output created: id=%s, type=%s, title=%s, project=%s",
            new_output.id, new_output.output_type, new_output.title, project_id,
        )

        new_eval = Evaluation(
            project_id=project_id,
            agent_run_id=run.id,
            score=eval_result.get("overall_score", eval_result.get("score", 0)),
            rubric=eval_result.get("rubric", eval_result.get("dimensions", {})),
            result=eval_result.get("result", "pending"),
            feedback=eval_result.get("feedback", ""),
            risks=eval_result.get("risks", []),
            metadata_={
                "mode": eval_result.get("mode", "rule_based"),
                "provider": eval_result.get("provider", "rule"),
                "strengths": eval_result.get("strengths", []),
                "weaknesses": eval_result.get("weaknesses", []),
                "action_items": eval_result.get("action_items", []),
            },
        )
        db.add(new_eval)

        create_trace_event(
            db, project_id, run.id,
            event_type="output_saved",
            title="产物保存",
            message=f"Output ID: {new_output.id}, Type: {new_output.output_type}",
            status="success",
            output_data={"output_id": new_output.id, "output_type": new_output.output_type},
        )

        db.commit()
        db.refresh(run)

        create_trace_event(
            db, project_id, run.id,
            event_type="run_completed",
            title="Agent Run 完成",
            message=f"Total latency: {latency_ms}ms, Tokens: {token_usage_dict['total_tokens']}",
            status="success",
            latency_ms=latency_ms,
            output_data={"latency_ms": latency_ms, "tokens": token_usage_dict["total_tokens"]},
        )

        synced_project = sync_project_workflow_state(db, project_id)
        if synced_project:
            create_trace_event(
                db, project_id, run.id,
                event_type="workflow_updated",
                title="工作流已更新",
                message=f"Stage: {synced_project.current_stage}, Progress: {synced_project.progress}%",
                status="success",
                output_data={
                    "current_stage": synced_project.current_stage,
                    "progress": synced_project.progress,
                },
            )

        logger.info(
            "Agent run completed: project=%s, run=%s, skill=%s, latency=%dms, tokens=%d, output=%s",
            project_id, run.id, skill_name, latency_ms, token_usage_dict["total_tokens"], new_output.id,
        )

    except Exception as e:
        run.status = "failed"
        run.error_message = str(e)
        db.commit()

        logger.error("Agent run failed: project=%s, run=%s, error=%s", project_id, run.id, str(e))

        create_trace_event(
            db, project_id, run.id,
            event_type="run_failed",
            title="Agent Run 失败",
            message=str(e),
            status="error",
            error_data={"message": str(e)},
        )

        try:
            synced_project = sync_project_workflow_state(db, project_id)
            if synced_project:
                create_trace_event(
                    db, project_id, run.id,
                    event_type="workflow_updated",
                    title="工作流已更新",
                    message=f"Stage: {synced_project.current_stage}, Progress: {synced_project.progress}%",
                    status="info",
                    output_data={
                        "current_stage": synced_project.current_stage,
                        "progress": synced_project.progress,
                    },
                )
        except Exception as sync_error:
            logger.error("Failed to sync workflow after agent failure: %s", sync_error)

    return run


def create_agent_run(db: Session, project_id: str, data: AgentRunCreate) -> AgentRun:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _run_agent_async(db, project_id, data))
            return future.result(timeout=120)
    else:
        return asyncio.run(_run_agent_async(db, project_id, data))


def list_agent_runs(db: Session, project_id: str) -> list[AgentRun]:
    return list(
        db.scalars(
            select(AgentRun)
            .where(AgentRun.project_id == project_id)
            .order_by(AgentRun.created_at.desc())
        ).all()
    )


def get_agent_run(db: Session, run_id: str) -> Optional[AgentRun]:
    return db.get(AgentRun, run_id)


def approve_agent_run(db: Session, run_id: str) -> Optional[AgentRun]:
    run = db.get(AgentRun, run_id)
    if not run:
        return None
    if run.status == "waiting_approval":
        run.status = "completed"
        db.commit()
        db.refresh(run)
        sync_project_workflow_state(db, run.project_id)
    return run


def reject_agent_run(db: Session, run_id: str) -> Optional[AgentRun]:
    run = db.get(AgentRun, run_id)
    if not run:
        return None
    if run.status == "waiting_approval":
        run.status = "failed"
        run.error_message = "Rejected by user"
        db.commit()
        db.refresh(run)
        sync_project_workflow_state(db, run.project_id)
    return run
