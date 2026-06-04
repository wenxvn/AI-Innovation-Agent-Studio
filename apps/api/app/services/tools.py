import os
import logging
import yaml
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.tool_call import ToolCall
from typing import Optional

logger = logging.getLogger(__name__)

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "tools", "registry.yaml")

BUILTIN_TOOLS = [
    {
        "name": "rag_search",
        "display_name": "RAG Search",
        "category": "retrieval",
        "description": "在项目文档中检索相关信息",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 10,
    },
    {
        "name": "memory_search",
        "display_name": "Memory Search",
        "category": "retrieval",
        "description": "搜索项目记忆库中的相关信息",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 10,
    },
    {
        "name": "output_writer",
        "display_name": "Output Writer",
        "category": "generation",
        "description": "保存 Agent 生成的产物",
        "risk_level": "low",
        "requires_approval": False,
        "timeout_seconds": 30,
    },
    {
        "name": "file_writer",
        "display_name": "File Writer",
        "category": "file",
        "description": "写入本地文件系统",
        "risk_level": "high",
        "requires_approval": True,
        "timeout_seconds": 30,
    },
    {
        "name": "code_executor",
        "display_name": "Code Executor",
        "category": "execution",
        "description": "执行代码片段",
        "risk_level": "high",
        "requires_approval": True,
        "timeout_seconds": 60,
    },
]


def _load_registry_from_yaml() -> list[dict]:
    try:
        abs_path = os.path.abspath(REGISTRY_PATH)
        if not os.path.isfile(abs_path):
            logger.warning("Tool registry YAML not found at %s, using builtin tools", abs_path)
            return []

        with open(abs_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        tools = data.get("tools", [])
        return [
            {
                "name": t.get("name", ""),
                "display_name": t.get("display_name", t.get("name", "")),
                "category": t.get("category", "general"),
                "description": t.get("description", ""),
                "risk_level": t.get("risk_level", "low"),
                "requires_approval": t.get("requires_approval", False),
                "timeout_seconds": t.get("timeout_seconds", 30),
            }
            for t in tools
        ]
    except Exception as e:
        logger.error("Failed to load tool registry YAML: %s", e)
        return []


def list_tools() -> list[dict]:
    yaml_tools = _load_registry_from_yaml()
    if yaml_tools:
        return yaml_tools
    return BUILTIN_TOOLS


def list_tool_calls(db: Session, project_id: str) -> list[ToolCall]:
    return list(
        db.scalars(
            select(ToolCall)
            .where(ToolCall.project_id == project_id)
            .order_by(ToolCall.created_at.desc())
        ).all()
    )


def approve_tool_call(db: Session, call_id: str, approved_by: str = "user") -> Optional[ToolCall]:
    call = db.get(ToolCall, call_id)
    if not call:
        return None
    call.status = "approved"
    call.approved_by = approved_by
    db.commit()
    db.refresh(call)
    return call


def reject_tool_call(db: Session, call_id: str, reason: str = "") -> Optional[ToolCall]:
    call = db.get(ToolCall, call_id)
    if not call:
        return None
    call.status = "rejected"
    call.error_message = reason
    db.commit()
    db.refresh(call)
    return call
