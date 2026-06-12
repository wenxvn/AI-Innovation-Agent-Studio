from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.tool_call import (
    ToolCallOut,
    ToolCallApprove,
    ToolCallReject,
    ToolExecuteRequest,
    ToolExecutionOut,
)
from app.schemas.common import DataResponse, ListResponse
from app.services import tools as svc

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("")
def list_tools():
    items = svc.list_tools()
    return {
        "tools": items,
        "total": len(items),
        "source": "yaml",
    }


@router.get("/projects/{project_id}/calls", response_model=ListResponse[ToolCallOut])
def list_tool_calls(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_tool_calls(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/projects/{project_id}/execute", response_model=DataResponse[ToolExecutionOut])
def execute_tool(project_id: str, body: ToolExecuteRequest, db: Session = Depends(get_db)):
    try:
        result = svc.execute_tool(
            db,
            project_id=project_id,
            agent_run_id=body.agent_run_id,
            tool_name=body.tool_name,
            input_params=body.input_params,
            tool_call_id=body.tool_call_id,
        )
    except svc.ToolOwnershipError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return DataResponse(
        data=ToolExecutionOut(
            tool_call=result.tool_call,
            status=result.status,
            output_result=result.output_result,
            error_message=result.error_message,
            requires_approval=result.requires_approval,
            executed=result.executed,
            latency_ms=result.latency_ms,
        )
    )


@router.post("/projects/{project_id}/calls/{call_id}/approve", response_model=DataResponse[ToolCallOut])
def approve_tool_call(project_id: str, call_id: str, body: ToolCallApprove, db: Session = Depends(get_db)):
    call = svc.approve_tool_call(db, project_id, call_id, body.approved_by)
    if not call:
        raise HTTPException(status_code=404, detail="Tool call not found")
    return DataResponse(data=call)


@router.post("/projects/{project_id}/calls/{call_id}/reject", response_model=DataResponse[ToolCallOut])
def reject_tool_call(project_id: str, call_id: str, body: ToolCallReject, db: Session = Depends(get_db)):
    call = svc.reject_tool_call(db, project_id, call_id, body.reason)
    if not call:
        raise HTTPException(status_code=404, detail="Tool call not found")
    return DataResponse(data=call)
