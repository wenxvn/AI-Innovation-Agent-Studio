from fastapi import APIRouter, HTTPException
from app.schemas.common import DataResponse, ListResponse
from app.services import prompts as svc

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("")
def list_prompts():
    templates = svc.list_prompt_templates()
    return ListResponse(
        data=[t.__dict__ for t in templates],
        total=len(templates),
    )


@router.get("/stats")
def get_prompt_stats():
    stats = svc.get_prompt_stats()
    return DataResponse(data=stats)


@router.get("/{name}")
def get_prompt(name: str):
    template = svc.get_prompt_template(name)
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return DataResponse(data=template.__dict__)
