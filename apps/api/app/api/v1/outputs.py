from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.output import OutputCreate, OutputUpdate, OutputOut
from app.schemas.common import DataResponse, ListResponse
from app.services import outputs as svc

router = APIRouter(prefix="/projects/{project_id}/outputs", tags=["outputs"])


@router.get("", response_model=ListResponse[OutputOut])
def list_outputs(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_outputs(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("", response_model=DataResponse[OutputOut], status_code=201)
def create_output(project_id: str, body: OutputCreate, db: Session = Depends(get_db)):
    output = svc.create_output(db, project_id, body)
    return DataResponse(data=output)


@router.get("/{output_id}", response_model=DataResponse[OutputOut])
def get_output(project_id: str, output_id: str, db: Session = Depends(get_db)):
    output = svc.get_output_for_project(db, project_id, output_id)
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    return DataResponse(data=output)


@router.patch("/{output_id}", response_model=DataResponse[OutputOut])
def update_output(project_id: str, output_id: str, body: OutputUpdate, db: Session = Depends(get_db)):
    existing = svc.get_output_for_project(db, project_id, output_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Output not found")
    output = svc.update_output(db, output_id, body)
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    return DataResponse(data=output)


@router.delete("/{output_id}")
def delete_output(project_id: str, output_id: str, db: Session = Depends(get_db)):
    existing = svc.get_output_for_project(db, project_id, output_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Output not found")
    ok = svc.delete_output(db, output_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Output not found")
    return {"message": "deleted"}


@router.get("/{output_id}/download")
def download_output(
    project_id: str,
    output_id: str,
    format: str = Query("markdown", description="Export format. Currently supports markdown."),
    db: Session = Depends(get_db),
):
    return _export_output_response(db, project_id, output_id, format)


@router.get("/{output_id}/export")
def export_output(
    project_id: str,
    output_id: str,
    format: str = Query("markdown", description="Export format. Currently supports markdown."),
    db: Session = Depends(get_db),
):
    return _export_output_response(db, project_id, output_id, format)


def _export_output_response(db: Session, project_id: str, output_id: str, export_format: str) -> Response:
    output = svc.get_output_for_project(db, project_id, output_id)
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    try:
        exported = svc.build_output_export(output, export_format)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(
        content=exported.content,
        media_type=exported.media_type,
        headers={"Content-Disposition": svc.content_disposition_header(exported.filename)},
    )
