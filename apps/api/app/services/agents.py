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
from app.services.memory import get_relevant_memories
from app.services.documents import search_chunks_for_agent
from app.services.llm import get_llm_provider, get_provider_status
from app.services.providers.mock_provider import MockLLMProvider, get_mock_response
from app.services.trace import create_trace_event
from app.prompts.agent_run import SYSTEM_PROMPT, AGENT_RUN_PROMPT, EVAL_JUDGE_PROMPT, format_rubric_description
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


def build_context_pack(db: Session, project_id: str, agent_run_id: str, user_input: str, skill_name: str) -> dict:
    memory_start = time.time()
    memories = get_relevant_memories(db, project_id, user_input, top_k=3)
    memory_latency = int((time.time() - memory_start) * 1000)

    rag_start = time.time()
    chunks = search_chunks_for_agent(db, project_id, user_input, top_k=5)
    rag_latency = int((time.time() - rag_start) * 1000)

    context_pack = {
        "task": user_input,
        "selected_skill": skill_name,
        "relevant_memory": [
            {
                "id": m.id,
                "memory_type": m.memory_type,
                "content": m.content,
                "confidence": m.confidence,
            }
            for m in memories
        ],
        "retrieved_evidence": [
            {
                "source_type": "document_chunk",
                "source_id": c.id,
                "document_id": c.document_id,
                "chunk_index": c.chunk_index,
                "excerpt": c.content[:500],
                "score": 1.0,
            }
            for c in chunks
        ],
        "constraints": [],
        "risks": [],
    }

    try:
        tc_memory = ToolCall(
            project_id=project_id,
            agent_run_id=agent_run_id,
            tool_name="memory_search",
            input_params={"query": user_input, "top_k": 3, "skill": skill_name},
            output_result={"hit_count": len(memories), "memories": [m.id for m in memories]},
            status="completed",
            permission_level="low",
            requires_approval=False,
            latency_ms=memory_latency,
        )
        db.add(tc_memory)
        db.commit()
        logger.info("Tool call recorded: memory_search, hits=%d, latency=%dms", len(memories), memory_latency)
    except Exception as e:
        logger.error("Failed to record memory_search tool call: %s", e)

    try:
        tc_rag = ToolCall(
            project_id=project_id,
            agent_run_id=agent_run_id,
            tool_name="rag_search",
            input_params={"query": user_input, "top_k": 5, "skill": skill_name},
            output_result={"hit_count": len(chunks), "chunks": [c.id for c in chunks]},
            status="completed",
            permission_level="low",
            requires_approval=False,
            latency_ms=rag_latency,
        )
        db.add(tc_rag)
        db.commit()
        logger.info("Tool call recorded: rag_search, hits=%d, latency=%dms", len(chunks), rag_latency)
    except Exception as e:
        logger.error("Failed to record rag_search tool call: %s", e)

    return context_pack


def build_plan(skill_name: str) -> list[dict]:
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

    skill_name = data.selected_skill or select_skill(data.user_input)
    agent_name = data.agent_name or AGENT_NAME_MAP.get(skill_name, "Orchestrator Agent")

    logger.info("Agent run started: project=%s, skill=%s, agent=%s", project_id, skill_name, agent_name)

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
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    create_trace_event(
        db, project_id, run.id,
        event_type="run_created",
        title="Agent Run 创建",
        message=f"Skill: {skill_name}, Agent: {agent_name}, Mode: {provider_status.llm_mode}",
        status="info",
        metadata={"skill": skill_name, "agent": agent_name, "mode": provider_status.llm_mode},
    )

    try:
        create_trace_event(
            db, project_id, run.id,
            event_type="planning_completed",
            title="规划完成",
            message=f"选择 Skill: {skill_name}",
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

        context_pack = build_context_pack(db, project_id, run.id, data.user_input, skill_name)

        create_trace_event(
            db, project_id, run.id,
            event_type="context_retrieval_completed",
            title="上下文检索完成",
            message=f"Memory: {len(context_pack.get('relevant_memory', []))}, Evidence: {len(context_pack.get('retrieved_evidence', []))}",
            status="info",
            output_data={
                "memory_count": len(context_pack.get("relevant_memory", [])),
                "evidence_count": len(context_pack.get("retrieved_evidence", [])),
            },
        )

        run.status = "generating"
        run.context_pack = context_pack
        run.plan = build_plan(skill_name)
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

        prompt = AGENT_RUN_PROMPT.format(
            skill_name=skill_name,
            agent_name=agent_name,
            user_input=data.user_input,
            project_context=f"项目ID: {project_id}",
            memory_context=format_memory_context(context_pack),
            evidence_context=format_evidence_context(context_pack),
            expected_type=expected_type,
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        llm_result = await llm_provider.generate(
            messages=messages,
            response_format="json",
            temperature=0.3,
            max_tokens=4096,
            metadata={"skill_name": skill_name},
        )

        if llm_result.error and not is_mock:
            llm_provider_fallback = MockLLMProvider()
            llm_result = await llm_provider_fallback.generate(
                messages=messages,
                response_format="json",
                temperature=0.3,
                metadata={"skill_name": skill_name},
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

        new_output = Output(
            project_id=project_id,
            agent_run_id=run.id,
            output_type=output.get("type", expected_type),
            title=output_title,
            content=output.get("content", ""),
            version=1,
            created_by_agent=agent_name,
            status="completed",
            metadata_={
                "provider": llm_result.provider,
                "model": llm_result.model,
                "mode": llm_result.mode,
            },
        )
        db.add(new_output)
        db.flush()

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

        tool_call = ToolCall(
            project_id=project_id,
            agent_run_id=run.id,
            tool_name="output_writer",
            input_params={"skill": skill_name, "user_input": data.user_input, "output_type": output.get("type", expected_type)},
            output_result={"output_id": new_output.id, "title": new_output.title, "type": new_output.output_type},
            status="completed",
            permission_level="low",
            requires_approval=False,
            latency_ms=latency_ms,
        )
        db.add(tool_call)

        logger.info(
            "Tool call recorded: output_writer, output_id=%s, type=%s",
            new_output.id, new_output.output_type,
        )

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
    return run
