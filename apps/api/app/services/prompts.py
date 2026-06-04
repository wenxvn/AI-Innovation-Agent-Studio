import os
import re
from typing import Optional
from pathlib import Path
from dataclasses import dataclass, asdict

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


@dataclass
class PromptTemplate:
    name: str
    title: str
    description: str
    content: str
    category: str
    variables: list[str]
    version: str
    is_active: bool


def _extract_variables(content: str) -> list[str]:
    return list(set(re.findall(r'\{(\w+)\}', content)))


def _categorize_prompt(name: str) -> str:
    categories = {
        "system": "系统提示词",
        "agent": "Agent 提示词",
        "eval": "评估提示词",
        "intent": "意图识别",
        "skill": "技能相关",
        "rag": "RAG 检索",
        "workflow": "工作流",
    }
    for key, label in categories.items():
        if key in name.lower():
            return label
    return "其他"


def _generate_title(name: str) -> str:
    title_map = {
        "SYSTEM_PROMPT": "系统提示词",
        "AGENT_RUN_PROMPT": "Agent 运行提示词",
        "EVAL_JUDGE_PROMPT": "评估裁判提示词",
    }
    return title_map.get(name, name.replace("_", " ").title())


def _generate_description(name: str) -> str:
    desc_map = {
        "SYSTEM_PROMPT": "Agent 系统级提示词，定义了 Agent 的基本行为和输出格式要求",
        "AGENT_RUN_PROMPT": "Agent 运行时的主提示词，包含任务信息、上下文和输出要求",
        "EVAL_JUDGE_PROMPT": "用于 LLM Judge 评估的提示词，包含评估维度和评分规则",
    }
    return desc_map.get(name, f"提示词模板: {name}")


def list_prompt_templates() -> list[PromptTemplate]:
    templates = []

    try:
        from app.prompts.agent_run import SYSTEM_PROMPT, AGENT_RUN_PROMPT, EVAL_JUDGE_PROMPT

        prompt_items = [
            ("SYSTEM_PROMPT", SYSTEM_PROMPT),
            ("AGENT_RUN_PROMPT", AGENT_RUN_PROMPT),
            ("EVAL_JUDGE_PROMPT", EVAL_JUDGE_PROMPT),
        ]

        for name, content in prompt_items:
            templates.append(PromptTemplate(
                name=name,
                title=_generate_title(name),
                description=_generate_description(name),
                content=content,
                category=_categorize_prompt(name),
                variables=_extract_variables(content),
                version="1.0.0",
                is_active=True,
            ))
    except ImportError:
        pass

    if PROMPTS_DIR.exists():
        for py_file in PROMPTS_DIR.glob("*.py"):
            if py_file.name.startswith("_"):
                continue
            try:
                module_name = f"app.prompts.{py_file.stem}"
                import importlib
                module = importlib.import_module(module_name)
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, str) and len(attr) > 50 and not attr_name.startswith("_"):
                        full_name = f"{py_file.stem}.{attr_name}"
                        templates.append(PromptTemplate(
                            name=full_name,
                            title=_generate_title(attr_name),
                            description=_generate_description(attr_name),
                            content=attr,
                            category=_categorize_prompt(attr_name),
                            variables=_extract_variables(attr),
                            version="1.0.0",
                            is_active=True,
                        ))
            except Exception:
                continue

    return templates


def get_prompt_template(name: str) -> Optional[PromptTemplate]:
    templates = list_prompt_templates()
    for t in templates:
        if t.name == name:
            return t
    return None


def get_prompt_stats() -> dict:
    templates = list_prompt_templates()
    categories = {}
    for t in templates:
        if t.category not in categories:
            categories[t.category] = 0
        categories[t.category] += 1

    return {
        "total": len(templates),
        "active": sum(1 for t in templates if t.is_active),
        "categories": categories,
        "total_variables": sum(len(t.variables) for t in templates),
    }
