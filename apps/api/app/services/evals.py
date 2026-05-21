import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.evaluation import Evaluation
from app.models.agent_run import AgentRun
from app.models.output import Output
from app.services.llm import get_llm_provider
from app.services.providers.mock_provider import MockLLMProvider
from app.prompts.agent_run import EVAL_JUDGE_PROMPT, format_rubric_description
from app.core.config import get_settings
from typing import Optional
import json

settings = get_settings()

DEFAULT_DIMENSIONS = {
    "correctness": "内容是否准确、事实是否正确",
    "completeness": "是否覆盖了所有必要内容",
    "feasibility": "方案是否可行、可执行",
    "innovation": "是否有创新性思考",
    "engineering_quality": "工程质量、代码/架构是否合理",
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


def _rule_based_eval(output: dict, user_input: str = "", evidence_count: int = 0) -> dict:
    content = output.get("content", "")
    content_len = len(content)

    completeness = min(95, max(50, content_len // 20))
    correctness = 80 if content_len > 200 else 60
    feasibility = 78
    innovation = 70
    engineering_quality = 75
    citation_quality = 85 if evidence_count > 0 else 50

    dimensions = {
        "correctness": correctness,
        "completeness": completeness,
        "feasibility": feasibility,
        "innovation": innovation,
        "engineering_quality": engineering_quality,
        "citation_quality": citation_quality,
    }
    score = round(sum(dimensions.values()) / len(dimensions), 1)

    has_sections = content.count("#") >= 3
    has_list = content.count("-") >= 5 or content.count("1.") >= 2

    strengths = ["内容已生成"]
    if content_len > 500:
        strengths.append("内容丰富")
    if has_sections:
        strengths.append("结构清晰")
    if has_list:
        strengths.append("条理分明")

    weaknesses = []
    if evidence_count == 0:
        weaknesses.append("缺少证据引用")
    if content_len < 300:
        weaknesses.append("内容较简略")

    return {
        "overall_score": score,
        "mode": "rule_based",
        "provider": "rule",
        "model": "rule-based-eval-v1",
        "dimensions": [
            {"name": k, "score": v, "reason": f"基于规则的{k}评估"}
            for k, v in dimensions.items()
        ],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "risks": ["未经过 LLM 深度评估"] if not isinstance(get_llm_provider(), type(None)) else [],
        "action_items": ["建议配置 LLM API Key 以获得更准确的评估"] if evidence_count == 0 else [],
        "score": score,
        "rubric": dimensions,
        "result": "pass" if score >= 70 else "fail",
        "feedback": f"基于规则评估，总分 {score}。{'整体质量良好。' if score >= 80 else '建议进一步完善。'}",
    }


async def _llm_judge_eval(output: dict, user_input: str = "", evidence_count: int = 0) -> dict | None:
    llm = get_llm_provider()
    if isinstance(llm, MockLLMProvider):
        return None

    try:
        prompt = EVAL_JUDGE_PROMPT.format(
            rubric_description=format_rubric_description(DEFAULT_DIMENSIONS),
            output_title=output.get("title", ""),
            output_type=output.get("type", ""),
            output_content=output.get("content", "")[:3000],
            user_input=user_input,
            evidence_count=evidence_count,
        )

        messages = [
            {"role": "system", "content": "你是一个专业的 AI 输出评估专家。请返回有效的 JSON 格式评估结果。"},
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

        eval_data = {}
        if result.raw and isinstance(result.raw, dict) and "overall_score" in result.raw:
            eval_data = result.raw
        elif result.content:
            try:
                eval_data = json.loads(result.content)
            except json.JSONDecodeError:
                return None

        if not eval_data or "overall_score" not in eval_data:
            return None

        eval_data["mode"] = "llm_judge"
        eval_data["provider"] = result.provider
        eval_data["model"] = result.model
        eval_data["score"] = eval_data["overall_score"]
        eval_data["result"] = "pass" if eval_data["overall_score"] >= 70 else "fail"
        eval_data["rubric"] = {
            d["name"]: d["score"]
            for d in eval_data.get("dimensions", [])
        }
        eval_data["feedback"] = f"LLM 评估完成，总分 {eval_data['overall_score']}。"
        if eval_data.get("strengths"):
            eval_data["feedback"] += f" 优点: {', '.join(eval_data['strengths'][:3])}。"
        if eval_data.get("action_items"):
            eval_data["feedback"] += f" 建议: {eval_data['action_items'][0]}。"

        return eval_data
    except Exception:
        return None


async def _run_evaluation_async(db: Session, project_id: str, agent_run_id: str, mode: str = "auto") -> Optional[Evaluation]:
    run = db.get(AgentRun, agent_run_id)
    if not run or run.project_id != project_id:
        return None

    existing = db.scalars(
        select(Evaluation).where(Evaluation.agent_run_id == agent_run_id)
    ).first()
    if existing:
        return existing

    output = run.generated_output or {}
    user_input = run.user_input or ""
    context_pack = run.context_pack or {}
    evidence_count = len(context_pack.get("retrieved_evidence", []))

    eval_data = None

    if mode in ("auto", "llm"):
        eval_data = await _llm_judge_eval(output, user_input, evidence_count)

    if eval_data is None:
        eval_data = _rule_based_eval(output, user_input, evidence_count)

    eval_obj = Evaluation(
        project_id=project_id,
        agent_run_id=agent_run_id,
        score=eval_data.get("overall_score", eval_data.get("score", 0)),
        rubric=eval_data.get("rubric", eval_data.get("dimensions", {})),
        result=eval_data.get("result", "pending"),
        feedback=eval_data.get("feedback", ""),
        risks=eval_data.get("risks", []),
        metadata_={
            "mode": eval_data.get("mode", "rule_based"),
            "provider": eval_data.get("provider", "rule"),
            "model": eval_data.get("model", ""),
            "strengths": eval_data.get("strengths", []),
            "weaknesses": eval_data.get("weaknesses", []),
            "action_items": eval_data.get("action_items", []),
            "dimensions": eval_data.get("dimensions", []),
        },
    )
    db.add(eval_obj)
    db.commit()
    db.refresh(eval_obj)
    return eval_obj


def run_evaluation(db: Session, project_id: str, agent_run_id: str, mode: str = "auto") -> Optional[Evaluation]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _run_evaluation_async(db, project_id, agent_run_id, mode))
            return future.result(timeout=60)
    else:
        return asyncio.run(_run_evaluation_async(db, project_id, agent_run_id, mode))
