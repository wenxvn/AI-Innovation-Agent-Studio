import os
import logging
import yaml
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.skill import Skill
from app.schemas.skill import SkillUpdate
from typing import Optional

logger = logging.getLogger(__name__)

SKILLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "skills")


def list_skills(db: Session) -> list[Skill]:
    return list(db.scalars(select(Skill).order_by(Skill.name)).all())


def get_skill(db: Session, skill_name: str) -> Optional[Skill]:
    return db.scalars(select(Skill).where(Skill.name == skill_name)).first()


def update_skill(db: Session, skill_name: str, data: SkillUpdate) -> Optional[Skill]:
    skill = get_skill(db, skill_name)
    if not skill:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(skill, field, value)
    db.commit()
    db.refresh(skill)
    return skill


def _load_skill_from_yaml(skill_dir: str) -> dict | None:
    yaml_path = os.path.join(skill_dir, "skill.yaml")
    md_path = os.path.join(skill_dir, "SKILL.md")

    if not os.path.isfile(yaml_path):
        return None

    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        md_content = ""
        if os.path.isfile(md_path):
            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()

        return {
            "name": data.get("name", os.path.basename(skill_dir)),
            "display_name": data.get("display_name", data.get("name", os.path.basename(skill_dir))),
            "description": data.get("description", ""),
            "version": data.get("version", "0.1.0"),
            "category": data.get("category", "general"),
            "trigger": data.get("trigger", []),
            "inputs": data.get("inputs", []),
            "outputs": data.get("outputs", []),
            "tools": data.get("tools", []),
            "required_tools": data.get("required_tools", []),
            "permissions": data.get("permissions", {}),
            "risk_level": data.get("risk_level", "low"),
            "requires_approval": data.get("requires_approval", False),
            "is_enabled": data.get("enabled", True),
            "source": "yaml",
            "config_path": yaml_path,
            "metadata_": {"md_content": md_content[:2000] if md_content else ""},
        }
    except Exception as e:
        logger.error("Failed to load skill from %s: %s", yaml_path, e)
        return {
            "name": os.path.basename(skill_dir),
            "display_name": os.path.basename(skill_dir),
            "description": f"配置加载失败: {str(e)}",
            "version": "0.0.0",
            "category": "invalid",
            "trigger": [],
            "inputs": [],
            "outputs": [],
            "tools": [],
            "required_tools": [],
            "permissions": {},
            "risk_level": "unknown",
            "requires_approval": False,
            "is_enabled": False,
            "source": "yaml",
            "config_path": yaml_path,
            "metadata_": {"error": str(e)},
        }


def reload_skills_from_disk(db: Session) -> list[Skill]:
    disk_skills = []
    if os.path.isdir(SKILLS_DIR):
        for entry in os.listdir(SKILLS_DIR):
            skill_dir = os.path.join(SKILLS_DIR, entry)
            if os.path.isdir(skill_dir):
                skill_data = _load_skill_from_yaml(skill_dir)
                if skill_data:
                    disk_skills.append(skill_data)

    for skill_data in disk_skills:
        existing = db.scalars(select(Skill).where(Skill.name == skill_data["name"])).first()
        if existing:
            existing.display_name = skill_data.get("display_name", existing.display_name)
            existing.description = skill_data.get("description", existing.description)
            existing.version = skill_data.get("version", existing.version)
            existing.category = skill_data.get("category", existing.category)
            existing.trigger = skill_data.get("trigger", existing.trigger)
            existing.inputs = skill_data.get("inputs", existing.inputs)
            existing.outputs = skill_data.get("outputs", existing.outputs)
            existing.tools = skill_data.get("tools", existing.tools)
            existing.required_tools = skill_data.get("required_tools", existing.required_tools)
            existing.permissions = skill_data.get("permissions", existing.permissions)
            existing.risk_level = skill_data.get("risk_level", existing.risk_level)
            existing.requires_approval = skill_data.get("requires_approval", existing.requires_approval)
            existing.source = skill_data.get("source", existing.source)
            existing.config_path = skill_data.get("config_path", existing.config_path)
            if skill_data.get("metadata_"):
                existing.metadata_ = skill_data["metadata_"]
        else:
            skill = Skill(
                name=skill_data["name"],
                display_name=skill_data.get("display_name", skill_data["name"]),
                description=skill_data.get("description", ""),
                version=skill_data.get("version", "0.1.0"),
                category=skill_data.get("category", "general"),
                trigger=skill_data.get("trigger", []),
                inputs=skill_data.get("inputs", []),
                outputs=skill_data.get("outputs", []),
                tools=skill_data.get("tools", []),
                required_tools=skill_data.get("required_tools", []),
                permissions=skill_data.get("permissions", {}),
                risk_level=skill_data.get("risk_level", "low"),
                requires_approval=skill_data.get("requires_approval", False),
                is_enabled=skill_data.get("is_enabled", True),
                source=skill_data.get("source", "yaml"),
                config_path=skill_data.get("config_path", ""),
                metadata_=skill_data.get("metadata_", {}),
            )
            db.add(skill)

    db.commit()
    return list(db.scalars(select(Skill).order_by(Skill.name)).all())
