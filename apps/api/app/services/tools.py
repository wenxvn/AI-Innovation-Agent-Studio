from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.tool_call import ToolCall
from typing import Optional


DEFAULT_TOOLS = [
    {
        "name": "File Tool",
        "description": "读写本地文件系统",
        "permission_level": "high",
        "requires_approval": True,
        "timeout_seconds": 30,
    },
    {
        "name": "RAG Search Tool",
        "description": "在项目文档中检索相关信息",
        "permission_level": "low",
        "requires_approval": False,
        "timeout_seconds": 10,
    },
    {
        "name": "Report Generator Tool",
        "description": "生成结构化报告文档",
        "permission_level": "low",
        "requires_approval": False,
        "timeout_seconds": 60,
    },
    {
        "name": "Eval Tool",
        "description": "评估生成产物质量",
        "permission_level": "low",
        "requires_approval": False,
        "timeout_seconds": 15,
    },
    {
        "name": "Web Search Tool",
        "description": "搜索互联网信息",
        "permission_level": "medium",
        "requires_approval": False,
        "timeout_seconds": 20,
    },
    {
        "name": "Code Executor Tool",
        "description": "执行代码片段",
        "permission_level": "high",
        "requires_approval": True,
        "timeout_seconds": 60,
    },
    {
        "name": "Database Tool",
        "description": "查询和修改数据库",
        "permission_level": "high",
        "requires_approval": True,
        "timeout_seconds": 30,
    },
]


def list_tools() -> list[dict]:
    return DEFAULT_TOOLS


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
