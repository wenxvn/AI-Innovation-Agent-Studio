from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import DataResponse, ListResponse
from app.schemas.prompt import (
    PromptActivateRequest,
    PromptStatsOut,
    PromptTemplateCreate,
    PromptTemplateOut,
    PromptTemplateUpdate,
    PromptVersionOut,
)
from app.services import prompts as svc

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=ListResponse[PromptTemplateOut])
def list_prompts(
    include_versions: bool = Query(False),
    db: Session = Depends(get_db),
):
    templates = svc.list_prompt_templates(db, include_versions=include_versions)
    return ListResponse(data=templates, total=len(templates))


@router.post("", response_model=DataResponse[PromptTemplateOut])
def create_prompt(body: PromptTemplateCreate, db: Session = Depends(get_db)):
    try:
        template = svc.create_prompt_template(db, body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return DataResponse(data=template)


@router.get("/stats", response_model=DataResponse[PromptStatsOut])
def get_prompt_stats(db: Session = Depends(get_db)):
    return DataResponse(data=svc.get_prompt_stats(db))


@router.post("/reload", response_model=ListResponse[PromptTemplateOut])
def reload_prompts(db: Session = Depends(get_db)):
    templates = svc.sync_default_prompt_templates(db)
    return ListResponse(data=templates, total=len(templates))


@router.get("/{name}", response_model=DataResponse[PromptTemplateOut])
def get_prompt(
    name: str,
    version: int | None = Query(None),
    db: Session = Depends(get_db),
):
    template = svc.get_prompt_template(db, name, version=version)
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return DataResponse(data=template)


@router.patch("/{name}", response_model=DataResponse[PromptTemplateOut])
def update_prompt(name: str, body: PromptTemplateUpdate, db: Session = Depends(get_db)):
    template = svc.update_prompt_template(db, name, body)
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return DataResponse(data=template)


@router.get("/{name}/versions", response_model=ListResponse[PromptVersionOut])
def list_prompt_versions(name: str, db: Session = Depends(get_db)):
    versions = svc.list_prompt_versions(db, name)
    if not versions:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return ListResponse(data=versions, total=len(versions))


@router.post("/{name}/versions/{version}/activate", response_model=DataResponse[PromptTemplateOut])
def activate_prompt(
    name: str,
    version: int,
    body: PromptActivateRequest | None = None,
    db: Session = Depends(get_db),
):
    template = svc.activate_prompt_version(db, name, version, reason=body.reason if body else "")
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template version not found")
    return DataResponse(data=template)
