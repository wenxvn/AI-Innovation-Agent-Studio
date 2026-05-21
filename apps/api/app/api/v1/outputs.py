from fastapi import APIRouter, Depends, HTTPException
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
    output = svc.get_output(db, output_id)
    if not output or output.project_id != project_id:
        raise HTTPException(status_code=404, detail="Output not found")
    return DataResponse(data=output)


@router.patch("/{output_id}", response_model=DataResponse[OutputOut])
def update_output(project_id: str, output_id: str, body: OutputUpdate, db: Session = Depends(get_db)):
    output = svc.update_output(db, output_id, body)
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")
    return DataResponse(data=output)


@router.delete("/{output_id}")
def delete_output(project_id: str, output_id: str, db: Session = Depends(get_db)):
    ok = svc.delete_output(db, output_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Output not found")
    return {"message": "deleted"}


@router.get("/{output_id}/download")
def download_output(project_id: str, output_id: str, db: Session = Depends(get_db)):
    output = svc.get_output(db, output_id)
    if not output or output.project_id != project_id:
        raise HTTPException(status_code=404, detail="Output not found")
    filename = f"{output.title}.md"
    return Response(
        content=output.content.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
