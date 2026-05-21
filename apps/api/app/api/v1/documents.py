import os
import re
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.document import DocumentOut, DocumentChunkOut, ReindexRequest
from app.schemas.common import DataResponse, ListResponse
from app.services import documents as svc
from app.core.config import get_settings

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])
settings = get_settings()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf"}
MAX_FILE_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^\w\s\-.]', '_', filename)
    if not filename or filename.startswith('.'):
        filename = "unnamed_file"
    return filename


def validate_file_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext


@router.get("", response_model=ListResponse[DocumentOut])
def list_documents(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_documents(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/upload", response_model=DataResponse[DocumentOut], status_code=201)
async def upload_document(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        logger.warning("Upload rejected: no filename provided")
        raise HTTPException(status_code=400, detail="No filename provided")

    safe_filename = sanitize_filename(file.filename)
    file_ext = validate_file_extension(safe_filename)

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        logger.warning("Upload rejected: empty file '%s'", safe_filename)
        raise HTTPException(status_code=400, detail="Empty file not allowed")

    if file_size > MAX_FILE_SIZE_BYTES:
        logger.warning(
            "Upload rejected: file too large '%s' (%d bytes, max %d bytes)",
            safe_filename, file_size, MAX_FILE_SIZE_BYTES,
        )
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    upload_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    file_type = file_ext

    logger.info(
        "File uploaded: '%s' (%d bytes, type=%s) to project %s",
        safe_filename, file_size, file_type, project_id,
    )

    doc = svc.create_document(
        db=db,
        project_id=project_id,
        filename=safe_filename,
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
