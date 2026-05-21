from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.tool_call import ToolCallOut, ToolCallApprove, ToolCallReject
from app.schemas.common import DataResponse, ListResponse
from app.services import tools as svc

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("")
def list_tools():
    items = svc.list_tools()
    return {"tools": items, "total": len(items)}


@router.get("/projects/{project_id}/calls", response_model=ListResponse[ToolCallOut])
def list_tool_calls(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_tool_calls(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/projects/{project_id}/calls/{call_id}/approve", response_model=DataResponse[ToolCallOut])
def approve_tool_call(project_id: str, call_id: str, body: ToolCallApprove, db: Session = Depends(get_db)):
    call = svc.approve_tool_call(db, call_id, body.approved_by)
    if not call:
        raise HTTPException(status_code=404, detail="Tool call not found")
    return DataResponse(data=call)


@router.post("/projects/{project_id}/calls/{call_id}/reject", response_model=DataResponse[ToolCallOut])
def reject_tool_call(project_id: str, call_id: str, body: ToolCallReject, db: Session = Depends(get_db)):
    call = svc.reject_tool_call(db, call_id, body.reason)
    if not call:
        raise HTTPException(status_code=404, detail="Tool call not found")
    return DataResponse(data=call)
