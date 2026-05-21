import os
import yaml
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.skill import Skill
from app.schemas.skill import SkillUpdate
from typing import Optional


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


def reload_skills_from_disk(db: Session) -> list[Skill]:
    DEFAULT_SKILLS = [
        {
            "name": "competition-analyzer",
            "description": "解析比赛通知，提取赛题要求、评分标准、提交物要求",
            "version": "0.1.0",
            "trigger": ["用户上传比赛通知", "用户需要分析比赛要求"],
            "inputs": ["competition_file", "scoring_criteria"],
            "outputs": ["requirements.json", "criteria.json"],
            "tools": ["file_reader", "pdf_parser"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "idea-generator",
            "description": "根据比赛要求和用户兴趣生成多个项目方向",
            "version": "0.1.0",
            "trigger": ["用户需要项目方向", "比赛分析完成后"],
            "inputs": ["requirements", "user_preferences", "market_trends"],
            "outputs": ["project_ideas.json"],
            "tools": ["rag_search", "web_search"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": True},
            "requires_approval": False,
        },
        {
            "name": "prd-writer",
            "description": "将用户想法、赛题、调研资料转化为结构化 PRD",
            "version": "0.1.0",
            "trigger": ["用户需要产品需求文档", "用户选择了项目方向"],
            "inputs": ["project_goal", "target_users", "competition_rules", "retrieved_context"],
            "outputs": ["prd.md", "user_stories.json"],
            "tools": ["document_reader", "rag_search"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "architecture-designer",
            "description": "生成系统架构、模块划分、数据库设计、API 设计",
            "version": "0.1.0",
            "trigger": ["用户需要架构设计", "PRD 生成完成后"],
            "inputs": ["prd", "tech_stack", "constraints"],
            "outputs": ["architecture.md", "database_schema.json", "api_design.json"],
            "tools": ["diagram_generator", "code_analyzer"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "research-synthesizer",
            "description": "调研技术方案、竞品、论文，生成调研报告",
            "version": "0.1.0",
            "trigger": ["用户需要调研", "项目方向确定后"],
            "inputs": ["research_topic", "existing_docs"],
            "outputs": ["research_report.md"],
            "tools": ["rag_search", "web_search"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": True},
            "requires_approval": False,
        },
        {
            "name": "context-pack-builder",
            "description": "构建 Context Pack，整合项目状态、Memory、检索证据",
            "version": "0.1.0",
            "trigger": ["Agent 执行任务前"],
            "inputs": ["task", "project_state", "memory"],
            "outputs": ["context_pack.json"],
            "tools": ["rag_search"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "fastapi-generator",
            "description": "生成 FastAPI 后端代码骨架和配置文件",
            "version": "0.1.0",
            "trigger": ["用户需要后端代码", "架构设计完成后"],
            "inputs": ["api_design", "database_schema", "tech_stack"],
            "outputs": ["backend_files/"],
            "tools": ["file_writer", "code_formatter"],
            "permissions": {"readFiles": True, "writeFiles": True, "executeCode": False, "externalNetwork": False},
            "requires_approval": True,
        },
        {
            "name": "nextjs-generator",
            "description": "生成 Next.js 前端代码骨架和配置文件",
            "version": "0.1.0",
            "trigger": ["用户需要前端代码", "架构设计完成后"],
            "inputs": ["api_design", "ui_requirements", "tech_stack"],
            "outputs": ["frontend_files/"],
            "tools": ["file_writer", "code_formatter"],
            "permissions": {"readFiles": True, "writeFiles": True, "executeCode": False, "externalNetwork": False},
            "requires_approval": True,
        },
        {
            "name": "rag-builder",
            "description": "构建 RAG 管道，文档解析、embedding、检索",
            "version": "0.1.0",
            "trigger": ["用户需要 RAG 功能"],
            "inputs": ["documents", "embedding_config"],
            "outputs": ["rag_index"],
            "tools": ["file_reader", "embedding_generator"],
            "permissions": {"readFiles": True, "writeFiles": True, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "qa-debugger",
            "description": "质量检查和调试，验证产物正确性",
            "version": "0.1.0",
            "trigger": ["产物生成完成后"],
            "inputs": ["output", "requirements"],
            "outputs": ["qa_report.md"],
            "tools": ["code_analyzer", "test_runner"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": True, "externalNetwork": False},
            "requires_approval": True,
        },
        {
            "name": "pitch-writer",
            "description": "生成比赛答辩 PPT 和演讲稿",
            "version": "0.1.0",
            "trigger": ["用户需要答辩材料"],
            "inputs": ["project_summary", "architecture", "features"],
            "outputs": ["pitch.md", "slides.json"],
            "tools": ["document_reader"],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
        {
            "name": "api-designer",
            "description": "设计 RESTful API 和数据模型",
            "version": "0.1.0",
            "trigger": ["架构设计阶段"],
            "inputs": ["prd", "tech_stack"],
            "outputs": ["api_design.json"],
            "tools": [],
            "permissions": {"readFiles": True, "writeFiles": False, "executeCode": False, "externalNetwork": False},
            "requires_approval": False,
        },
    ]

    skills_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "skills")
    disk_skills = []
    if os.path.isdir(skills_dir):
        for entry in os.listdir(skills_dir):
            skill_md = os.path.join(skills_dir, entry, "SKILL.md")
            if os.path.isfile(skill_md):
                try:
                    with open(skill_md, "r", encoding="utf-8") as f:
                        content = f.read()
                    meta = yaml.safe_load(content) or {}
                    disk_skills.append({
                        "name": meta.get("name", entry),
                        "description": meta.get("description", ""),
                        "version": meta.get("version", "0.1.0"),
                        "trigger": meta.get("trigger", []),
                        "inputs": meta.get("inputs", []),
                        "outputs": meta.get("outputs", []),
                        "tools": meta.get("tools", []),
                        "permissions": meta.get("permissions", {}),
                        "requires_approval": meta.get("requires_approval", False),
                    })
                except Exception:
                    pass

    all_skills = {s["name"]: s for s in DEFAULT_SKILLS}
    for s in disk_skills:
        all_skills[s["name"]] = s

    for skill_data in all_skills.values():
        existing = db.scalars(select(Skill).where(Skill.name == skill_data["name"])).first()
        if existing:
            existing.description = skill_data.get("description", existing.description)
            existing.version = skill_data.get("version", existing.version)
            existing.trigger = skill_data.get("trigger", existing.trigger)
            existing.inputs = skill_data.get("inputs", existing.inputs)
            existing.outputs = skill_data.get("outputs", existing.outputs)
            existing.tools = skill_data.get("tools", existing.tools)
            existing.permissions = skill_data.get("permissions", existing.permissions)
            existing.requires_approval = skill_data.get("requires_approval", existing.requires_approval)
        else:
            skill = Skill(
                name=skill_data["name"],
                description=skill_data.get("description", ""),
                version=skill_data.get("version", "0.1.0"),
                trigger=skill_data.get("trigger", []),
                inputs=skill_data.get("inputs", []),
                outputs=skill_data.get("outputs", []),
                tools=skill_data.get("tools", []),
                permissions=skill_data.get("permissions", {}),
                requires_approval=skill_data.get("requires_approval", False),
            )
            db.add(skill)

    db.commit()
    return list(db.scalars(select(Skill).order_by(Skill.name)).all())
