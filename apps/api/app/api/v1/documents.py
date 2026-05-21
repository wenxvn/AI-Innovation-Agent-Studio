import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.document import DocumentOut, DocumentChunkOut, ReindexRequest
from app.schemas.common import DataResponse, ListResponse
from app.services import documents as svc
from app.core.config import get_settings

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])
settings = get_settings()


@router.get("", response_model=ListResponse[DocumentOut])
def list_documents(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_documents(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/upload", response_model=DataResponse[DocumentOut], status_code=201)
async def upload_document(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    upload_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(file_path)
    file_type = os.path.splitext(file.filename)[1].lower()

    doc = svc.create_document(
        db=db,
        project_id=project_id,
        filename=file.filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
    )

    svc.parse_and_index_document(db, doc.id)
    doc = svc.get_document(db, doc.id)

    return DataResponse(data=doc)


@router.get("/{document_id}", response_model=DataResponse[DocumentOut])
def get_document(project_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = svc.get_document(db, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return DataResponse(data=doc)


@router.delete("/{document_id}")
def delete_document(project_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = svc.get_document(db, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    svc.delete_document(db, document_id)
    return {"message": "deleted"}


@router.post("/{document_id}/reindex", response_model=DataResponse[DocumentOut])
def reindex_document(project_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = svc.get_document(db, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = svc.parse_and_index_document(db, document_id)
    return DataResponse(data=doc)


@router.get("/{document_id}/chunks", response_model=ListResponse[DocumentChunkOut])
def get_chunks(project_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = svc.get_document(db, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    items = svc.get_chunks(db, document_id)
    return ListResponse(data=items, total=len(items))
