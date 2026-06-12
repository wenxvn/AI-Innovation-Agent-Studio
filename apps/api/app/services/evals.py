import asyncio
import concurrent.futures
import json
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.evaluation import Evaluation
from app.models.output import Output
from app.prompts.agent_run import EVAL_JUDGE_PROMPT as FALLBACK_EVAL_JUDGE_PROMPT
from app.prompts.agent_run import format_rubric_description
from app.schemas.evaluation import EvaluationUpdate
from app.services.llm import get_llm_provider
from app.services.prompts import EVAL_JUDGE_PROMPT_NAME, get_active_prompt_content
from app.services.providers.mock_provider import MockLLMProvider

DEFAULT_DIMENSIONS = {
    "correctness": "内容是否准确，事实是否正确",
    "completeness": "是否覆盖了所有必要内容",
    "feasibility": "方案是否可行、可执行",
    "innovation": "是否有创新性思考",
    "engineering_quality": "工程质量、代码或架构是否合理",
    "citation_quality": "引用来源是否充分、准确",
}


def list_evaluations(db: Session, project_id: str) -> list[Evaluation]:
    return list(
        db.scalars(
            select(Evaluation)
            .where(Evaluation.project_id == project_id)
            .order_by(Evaluation.created_at.desc())
        ).all()
    )


def get_evaluation(db: Session, eval_id: str) -> Optional[Evaluation]:
    return db.get(Evaluation, eval_id)


def update_evaluation_review(
    db: Session,
    project_id: str,
    eval_id: str,
    data: EvaluationUpdate,
) -> Optional[Evaluation]:
    eval_obj = db.get(Evaluation, eval_id)
    if not eval_obj or eval_obj.project_id != project_id:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        eval_obj.status = update_data["status"]
    if "review_note" in update_data and update_data["review_note"] is not None:
        eval_obj.review_note = update_data["review_note"]

    db.commit()
    db.refresh(eval_obj)
    return eval_obj


def _normalize_dimensions(eval_data: dict[str, Any]) -> list[dict[str, Any]]:
    dimensions = eval_data.get("dimensions", [])
    if isinstance(dimensions, list):
        normalized = []
        for item in dimensions:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            normalized.append(
                {
                    "name": name,
                    "score": float(item.get("score", 0) or 0),
                    "reason": str(item.get("reason", "")),
                }
            )
        return normalized

    rubric = eval_data.get("rubric", {})
    if isinstance(rubric, dict):
        return [
            {"name": str(name), "score": float(score or 0), "reason": ""}
            for name, score in rubric.items()
        ]

    return []


def _rubric_from_dimensions(dimensions: list[dict[str, Any]]) -> dict[str, float]:
    return {str(item["name"]): float(item.get("score", 0) or 0) for item in dimensions}


def _output_for_run(db: Session, run: AgentRun) -> dict[str, Any]:
    if run.generated_output:
        return run.generated_output

    output = db.scalars(
        select(Output)
        .where(Output.agent_run_id == run.id)
        .order_by(Output.created_at.desc())
    ).first()
    if not output:
        return {}

    return {
        "title": output.title,
        "type": output.output_type,
        "content": output.content,
        "content_type": output.content_type,
        "language": output.language,
    }


def _rule_based_eval(output: dict[str, Any], evidence_count: int = 0) -> dict[str, Any]:
    content = str(output.get("content", "") or "")
    content_len = len(content)

    completeness = min(95, max(50, content_len // 20))
    correctness = 80 if content_len > 200 else 60
    feasibility = 78
    innovation = 70
    engineering_quality = 75
    citation_quality = 85 if evidence_count > 0 else 50

    rubric = {
        "correctness": correctness,
        "completeness": completeness,
        "feasibility": feasibility,
        "innovation": innovation,
        "engineering_quality": engineering_quality,
        "citation_quality": citation_quality,
    }
    score = round(sum(rubric.values()) / len(rubric), 1)

    has_sections = content.count("#") >= 3
    has_list = content.count("-") >= 5 or content.count("1.") >= 2

    strengths = ["内容已生成"]
    if content_len > 500:
        strengths.append("内容较丰富")
    if has_sections:
        strengths.append("结构清晰")
    if has_list:
        strengths.append("条理明确")

    weaknesses = []
    if evidence_count == 0:
        weaknesses.append("缺少证据引用")
    if content_len < 300:
        weaknesses.append("内容偏短，论证还不充分")

    dimensions = [
        {
            "name": name,
            "score": value,
            "reason": f"基于规则的{DEFAULT_DIMENSIONS.get(name, name)}评估",
        }
        for name, value in rubric.items()
    ]

    return {
        "overall_score": score,
        "mode": "rule_based",
        "provider": "rule",
        "model": "rule-based-eval-v1",
        "dimensions": dimensions,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "risks": ["未经过 LLM 深度评估"],
        "action_items": ["补充关键证据、假设来源和验收标准"] if evidence_count == 0 else [],
        "score": score,
        "rubric": rubric,
        "result": "pass" if score >= 70 else "fail",
        "feedback": f"基于规则评估，总分 {score}。{'整体质量良好。' if score >= 80 else '建议继续补充证据和细节。'}",
    }


async def _llm_judge_eval(
    db: Session,
    output: dict[str, Any],
    user_input: str = "",
    evidence_count: int = 0,
) -> dict[str, Any] | None:
    llm = get_llm_provider()
    if isinstance(llm, MockLLMProvider):
        return None

    try:
        prompt_template = get_active_prompt_content(
            db,
            EVAL_JUDGE_PROMPT_NAME,
            FALLBACK_EVAL_JUDGE_PROMPT,
        )
        prompt = prompt_template.format(
            rubric_description=format_rubric_description(DEFAULT_DIMENSIONS),
            output_title=output.get("title", ""),
            output_type=output.get("type", ""),
            output_content=str(output.get("content", "") or "")[:3000],
            user_input=user_input,
            evidence_count=evidence_count,
        )

        messages = [
            {
                "role": "system",
                "content": "你是专业的 AI 输出质量评估专家。请返回有效 JSON。",
            },
            {"role": "user", "content": prompt},
        ]

        result = await llm.generate(
            messages=messages,
            response_format="json",
            temperature=0.1,
            max_tokens=2000,
        )

        if result.error:
            return None

        eval_data: dict[str, Any] = {}
        if result.raw and isinstance(result.raw, dict) and "overall_score" in result.raw:
            eval_data = result.raw
        elif result.content:
            try:
                eval_data = json.loads(result.content)
            except json.JSONDecodeError:
                return None

        if not eval_data or "overall_score" not in eval_data:
            return None

        dimensions = _normalize_dimensions(eval_data)
        rubric = _rubric_from_dimensions(dimensions)
        score = float(eval_data["overall_score"])

        eval_data["mode"] = "llm_judge"
        eval_data["provider"] = result.provider
        eval_data["model"] = result.model
        eval_data["score"] = score
        eval_data["overall_score"] = score
        eval_data["result"] = "pass" if score >= 70 else "fail"
        eval_data["dimensions"] = dimensions
        eval_data["rubric"] = rubric

        feedback_parts = [f"LLM 评估完成，总分 {score}。"]
        if eval_data.get("strengths"):
            feedback_parts.append(f"优点: {', '.join(eval_data['strengths'][:3])}。")
        if eval_data.get("action_items"):
            feedback_parts.append(f"建议: {eval_data['action_items'][0]}。")
        eval_data["feedback"] = " ".join(feedback_parts)

        return eval_data
    except Exception:
        return None


def _build_evaluation(eval_data: dict[str, Any], project_id: str, agent_run_id: str) -> Evaluation:
    dimensions = _normalize_dimensions(eval_data)
    rubric = eval_data.get("rubric")
    if not isinstance(rubric, dict) or not rubric:
        rubric = _rubric_from_dimensions(dimensions)

    return Evaluation(
        project_id=project_id,
        agent_run_id=agent_run_id,
        score=float(eval_data.get("overall_score", eval_data.get("score", 0)) or 0),
        rubric=rubric,
        result=str(eval_data.get("result", "pending")),
        feedback=str(eval_data.get("feedback", "")),
        risks=eval_data.get("risks", []) or [],
        status="pending",
        review_note="",
        metadata_={
            "mode": eval_data.get("mode", "rule_based"),
            "provider": eval_data.get("provider", "rule"),
            "model": eval_data.get("model", ""),
            "strengths": eval_data.get("strengths", []),
            "weaknesses": eval_data.get("weaknesses", []),
            "action_items": eval_data.get("action_items", []),
            "dimensions": dimensions,
        },
    )


async def _run_evaluation_async(
    db: Session,
    project_id: str,
    agent_run_id: str,
    mode: str = "auto",
) -> Optional[Evaluation]:
    run = db.get(AgentRun, agent_run_id)
    if not run or run.project_id != project_id:
        return None

    existing = db.scalars(
        select(Evaluation).where(Evaluation.agent_run_id == agent_run_id)
    ).first()
    if existing:
        return existing

    output = _output_for_run(db, run)
    user_input = run.user_input or ""
    context_pack = run.context_pack or {}
    evidence_count = len(context_pack.get("retrieved_evidence", []))

    eval_data = None
    if mode in ("auto", "llm"):
        eval_data = await _llm_judge_eval(db, output, user_input, evidence_count)

    if eval_data is None:
        eval_data = _rule_based_eval(output, evidence_count)

    eval_obj = _build_evaluation(eval_data, project_id, agent_run_id)
    db.add(eval_obj)
    db.commit()
    db.refresh(eval_obj)
    return eval_obj


def run_evaluation(
    db: Session,
    project_id: str,
    agent_run_id: str,
    mode: str = "auto",
) -> Optional[Evaluation]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _run_evaluation_async(db, project_id, agent_run_id, mode))
            return future.result(timeout=60)

    return asyncio.run(_run_evaluation_async(db, project_id, agent_run_id, mode))
