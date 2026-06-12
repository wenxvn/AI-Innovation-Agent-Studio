import hashlib
import re
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prompt_template import PromptTemplate
from app.prompts.agent_run import AGENT_RUN_PROMPT, EVAL_JUDGE_PROMPT, SYSTEM_PROMPT
from app.schemas.prompt import PromptTemplateCreate, PromptTemplateUpdate

DEFAULT_SOURCE_PATH = "apps/api/app/prompts/agent_run.py"
SYSTEM_PROMPT_NAME = "agent_run.SYSTEM_PROMPT"
AGENT_RUN_PROMPT_NAME = "agent_run.AGENT_RUN_PROMPT"
EVAL_JUDGE_PROMPT_NAME = "agent_run.EVAL_JUDGE_PROMPT"


def _extract_variables(content: str) -> list[str]:
    return sorted(set(re.findall(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}", content)))


def _content_checksum(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _default_prompt_items() -> list[dict[str, Any]]:
    return [
        {
            "name": SYSTEM_PROMPT_NAME,
            "constant_name": "SYSTEM_PROMPT",
            "title": "系统提示词",
            "description": "Agent 系统级提示词，定义基础行为、证据使用和输出格式。",
            "category": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "name": AGENT_RUN_PROMPT_NAME,
            "constant_name": "AGENT_RUN_PROMPT",
            "title": "Agent 运行提示词",
            "description": "Agent 运行时的主提示词，注入项目上下文、记忆、证据和输出要求。",
            "category": "agent",
            "content": AGENT_RUN_PROMPT,
        },
        {
            "name": EVAL_JUDGE_PROMPT_NAME,
            "constant_name": "EVAL_JUDGE_PROMPT",
            "title": "评估裁判提示词",
            "description": "用于 LLM Judge 评估生成产物的提示词。",
            "category": "evaluation",
            "content": EVAL_JUDGE_PROMPT,
        },
    ]


def _next_version(existing: list[PromptTemplate]) -> int:
    if not existing:
        return 1
    return max(item.version for item in existing) + 1


def _deactivate_prompt_versions(db: Session, name: str) -> None:
    for item in db.scalars(select(PromptTemplate).where(PromptTemplate.name == name)).all():
        item.is_active = False


def _new_template_version(
    *,
    name: str,
    title: str,
    description: str,
    content: str,
    category: str,
    version: int,
    is_active: bool,
    source: str,
    source_path: str = "",
    metadata: Optional[dict[str, Any]] = None,
) -> PromptTemplate:
    return PromptTemplate(
        name=name,
        title=title,
        description=description,
        content=content,
        category=category,
        variables=_extract_variables(content),
        version=version,
        is_active=is_active,
        source=source,
        source_path=source_path,
        content_checksum=_content_checksum(content),
        metadata_=metadata or {},
    )


def list_prompt_templates(db: Session, include_versions: bool = False) -> list[PromptTemplate]:
    items = list(
        db.scalars(
            select(PromptTemplate).order_by(PromptTemplate.name.asc(), PromptTemplate.version.desc())
        ).all()
    )
    if include_versions:
        return items

    grouped: dict[str, list[PromptTemplate]] = {}
    for item in items:
        grouped.setdefault(item.name, []).append(item)

    selected = []
    for versions in grouped.values():
        active = next((item for item in versions if item.is_active), None)
        selected.append(active or versions[0])

    return sorted(selected, key=lambda item: item.name)


def get_prompt_template(db: Session, name: str, version: Optional[int] = None) -> Optional[PromptTemplate]:
    stmt = select(PromptTemplate).where(PromptTemplate.name == name)
    if version is not None:
        return db.scalars(stmt.where(PromptTemplate.version == version)).first()

    active = db.scalars(stmt.where(PromptTemplate.is_active.is_(True))).first()
    if active:
        return active
    return db.scalars(stmt.order_by(PromptTemplate.version.desc())).first()


def list_prompt_versions(db: Session, name: str) -> list[PromptTemplate]:
    return list(
        db.scalars(
            select(PromptTemplate)
            .where(PromptTemplate.name == name)
            .order_by(PromptTemplate.version.desc())
        ).all()
    )


def create_prompt_template(db: Session, data: PromptTemplateCreate) -> PromptTemplate:
    existing = list_prompt_versions(db, data.name)
    if existing:
        raise ValueError("Prompt template already exists")

    template = _new_template_version(
        name=data.name,
        title=data.title,
        description=data.description,
        content=data.content,
        category=data.category,
        version=1,
        is_active=data.is_active,
        source="api",
        metadata={**data.metadata, "user_edited": True},
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def update_prompt_template(
    db: Session,
    name: str,
    data: PromptTemplateUpdate,
) -> Optional[PromptTemplate]:
    current = get_prompt_template(db, name)
    if not current:
        return None

    existing = list_prompt_versions(db, name)
    update_data = data.model_dump(exclude_unset=True)
    metadata = dict(current.metadata_ or {})
    metadata.pop("default", None)
    if current.source != "api":
        metadata["base_source"] = current.source
    metadata.update(update_data.get("metadata") or {})
    metadata.update(
        {
            "user_edited": True,
            "parent_version": current.version,
            "parent_checksum": current.content_checksum,
        }
    )

    if data.activate:
        _deactivate_prompt_versions(db, name)

    template = _new_template_version(
        name=name,
        title=update_data.get("title", current.title),
        description=update_data.get("description", current.description),
        content=update_data.get("content", current.content),
        category=update_data.get("category", current.category),
        version=_next_version(existing),
        is_active=data.activate,
        source="api",
        metadata=metadata,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def activate_prompt_version(
    db: Session,
    name: str,
    version: int,
    reason: str = "",
) -> Optional[PromptTemplate]:
    template = get_prompt_template(db, name, version)
    if not template:
        return None

    _deactivate_prompt_versions(db, name)
    template.is_active = True
    if reason:
        metadata = dict(template.metadata_ or {})
        metadata["activation_reason"] = reason
        template.metadata_ = metadata

    db.commit()
    db.refresh(template)
    return template


def sync_default_prompt_templates(db: Session) -> list[PromptTemplate]:
    for item in _default_prompt_items():
        name = item["name"]
        checksum = _content_checksum(item["content"])
        existing = list_prompt_versions(db, name)
        active = next((row for row in existing if row.is_active), None)
        same_content = next((row for row in existing if row.content_checksum == checksum), None)

        default_metadata = {
            "default": True,
            "constant_name": item["constant_name"],
            "module": "app.prompts.agent_run",
        }

        if same_content:
            if same_content.source == "default":
                same_content.title = item["title"]
                same_content.description = item["description"]
                same_content.category = item["category"]
                same_content.variables = _extract_variables(item["content"])
                same_content.source_path = DEFAULT_SOURCE_PATH
                same_content.metadata_ = default_metadata
            if not active:
                same_content.is_active = True
            continue

        should_activate = active is None or active.source == "default"
        if should_activate and active:
            active.is_active = False

        template = _new_template_version(
            name=name,
            title=item["title"],
            description=item["description"],
            content=item["content"],
            category=item["category"],
            version=_next_version(existing),
            is_active=should_activate,
            source="default",
            source_path=DEFAULT_SOURCE_PATH,
            metadata=default_metadata,
        )
        db.add(template)

    db.commit()
    return list_prompt_templates(db)


def get_prompt_stats(db: Session) -> dict[str, Any]:
    current = list_prompt_templates(db)
    all_versions = list_prompt_templates(db, include_versions=True)
    categories: dict[str, int] = {}
    for template in current:
        categories[template.category] = categories.get(template.category, 0) + 1

    return {
        "total": len(current),
        "active": sum(1 for template in current if template.is_active),
        "total_versions": len(all_versions),
        "categories": categories,
        "total_variables": sum(len(template.variables or []) for template in current),
    }


def get_active_prompt_content(db: Session, name: str, fallback: str) -> str:
    template = get_prompt_template(db, name)
    if not template:
        return fallback
    return template.content
