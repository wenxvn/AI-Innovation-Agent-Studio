import logging
import os
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.common import DataResponse, ListResponse
from app.schemas.document import DocumentChunkOut, DocumentOut
from app.services import documents as svc

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])
settings = get_settings()
logger = logging.getLogger(__name__)

UPLOAD_READ_CHUNK_SIZE = 1024 * 1024
ALLOWED_MIME_TYPES_BY_EXTENSION = {
    ".txt": {"text/plain"},
    ".md": {"text/markdown", "text/x-markdown", "text/plain"},
    ".pdf": {"application/pdf", "application/x-pdf"},
}
UNKNOWN_MIME_TYPES = {"", "application/octet-stream", "binary/octet-stream", "application/unknown"}


def allowed_extensions() -> set[str]:
    return {
        ext.strip().lower()
        for ext in settings.ALLOWED_UPLOAD_EXTENSIONS.split(",")
        if ext.strip()
    }


def max_file_size_bytes() -> int:
    return settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def max_file_size_label() -> str:
    max_size = max_file_size_bytes()
    if max_size >= 1024 * 1024:
        return f"{max_size // (1024 * 1024)}MB"
    if max_size >= 1024:
        return f"{max_size // 1024}KB"
    return f"{max_size}B"


def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^\w\s\-.]', '_', filename)
    if not filename or filename.startswith('.'):
        filename = "unnamed_file"
    return filename


def normalize_mime_type(content_type: str | None) -> str:
    if not content_type:
        return ""
    return content_type.split(";", 1)[0].strip().lower()


def validate_file_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    extensions = allowed_extensions()
    if ext not in extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext or '(none)'}' is not supported. Upload one of: {', '.join(sorted(extensions))}.",
        )
    return ext


def validate_mime_type(file_ext: str, content_type: str | None) -> str:
    mime_type = normalize_mime_type(content_type)
    allowed_mimes = ALLOWED_MIME_TYPES_BY_EXTENSION.get(file_ext, set())

    if mime_type in UNKNOWN_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown MIME type for '{file_ext}' upload. "
                "Use a TXT, Markdown, or PDF file with a recognized content type."
            ),
        )

    if allowed_mimes and mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"MIME type '{mime_type}' does not match '{file_ext}'. "
                f"Allowed MIME types: {', '.join(sorted(allowed_mimes))}."
            ),
        )

    return mime_type


async def read_upload_content(file: UploadFile) -> bytes:
    content = bytearray()
    max_size = max_file_size_bytes()

    while True:
        chunk = await file.read(UPLOAD_READ_CHUNK_SIZE)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large. Maximum size is {max_file_size_label()}.",
            )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="File is empty. Upload a TXT, Markdown, or PDF file with content.",
        )

    return bytes(content)


@router.get("", response_model=ListResponse[DocumentOut])
def list_documents(project_id: str, db: Session = Depends(get_db)):
    items = svc.list_documents(db, project_id)
    return ListResponse(data=items, total=len(items))


@router.post("/upload", response_model=DataResponse[DocumentOut], status_code=201)
async def upload_document(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename:
        logger.warning("Upload rejected: no filename provided")
        raise HTTPException(status_code=400, detail="No filename provided.")

    safe_filename = sanitize_filename(file.filename)
    file_ext = validate_file_extension(safe_filename)
    mime_type = validate_mime_type(file_ext, file.content_type)
    content = await read_upload_content(file)
    file_size = len(content)

    upload_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(
        "File uploaded: '%s' (%d bytes, ext=%s, mime=%s) to project %s",
        safe_filename,
        file_size,
        file_ext,
        mime_type,
        project_id,
    )

    doc = svc.create_document(
        db=db,
        project_id=project_id,
        filename=safe_filename,
        file_path=file_path,
        file_type=file_ext,
        file_size=file_size,
        metadata={
            "content_type": mime_type,
            "original_filename": file.filename,
        },
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
