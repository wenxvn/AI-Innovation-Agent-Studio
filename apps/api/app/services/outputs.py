import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.output import Output
from app.schemas.output import OutputCreate, OutputUpdate


EXPORT_FORMAT_ALIASES = {
    "md": "markdown",
    "markdown": "markdown",
}

EXPORT_FORMATS = {
    "markdown": {
        "extension": "md",
        "media_type": "text/markdown; charset=utf-8",
    },
}


@dataclass(frozen=True)
class OutputExport:
    content: bytes
    filename: str
    media_type: str


def list_outputs(db: Session, project_id: str) -> list[Output]:
    return list(
        db.scalars(
            select(Output)
            .where(Output.project_id == project_id)
            .order_by(Output.created_at.desc())
        ).all()
    )


def get_output(db: Session, output_id: str) -> Optional[Output]:
    return db.get(Output, output_id)


def get_output_for_project(db: Session, project_id: str, output_id: str) -> Optional[Output]:
    output = db.get(Output, output_id)
    if not output or output.project_id != project_id:
        return None
    return output


def create_output(db: Session, project_id: str, data: OutputCreate) -> Output:
    output = Output(
        project_id=project_id,
        output_type=data.output_type,
        title=data.title,
        content=data.content,
        content_type=data.content_type,
        language=data.language,
        file_name=data.file_name,
        created_by_agent=data.created_by_agent,
        version=1,
        status=data.status,
        metadata_=data.metadata,
    )
    db.add(output)
    db.commit()
    db.refresh(output)
    return output


def update_output(db: Session, output_id: str, data: OutputUpdate) -> Optional[Output]:
    output = db.get(Output, output_id)
    if not output:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")
    if "content" in update_data and update_data["content"] != output.content:
        output.version += 1
    for field, value in update_data.items():
        setattr(output, field, value)
    db.commit()
    db.refresh(output)
    return output


def delete_output(db: Session, output_id: str) -> bool:
    output = db.get(Output, output_id)
    if not output:
        return False
    db.delete(output)
    db.commit()
    return True


def build_output_export(output: Output, export_format: str = "markdown") -> OutputExport:
    normalized = EXPORT_FORMAT_ALIASES.get(export_format.lower())
    if not normalized:
        supported = ", ".join(sorted(EXPORT_FORMATS))
        raise ValueError(f"Unsupported export format '{export_format}'. Supported formats: {supported}")

    config = EXPORT_FORMATS[normalized]
    content = (output.content or "").encode("utf-8")
    filename = build_export_filename(output, config["extension"])
    return OutputExport(
        content=content,
        filename=filename,
        media_type=config["media_type"],
    )


def build_export_filename(output: Output, extension: str) -> str:
    source_name = output.file_name or output.title or "output"
    name = _clean_filename(source_name)
    if not name:
        name = "output"

    suffix = f".{extension}"
    if name.lower().endswith(suffix):
        return name

    name_without_extension = re.sub(r"\.[A-Za-z0-9]{1,8}$", "", name)
    return f"{name_without_extension}{suffix}"


def content_disposition_header(filename: str) -> str:
    ascii_fallback = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-._")
    if not ascii_fallback:
        ascii_fallback = "output.md"
    encoded = quote(filename)
    return f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'


def _clean_filename(value: str) -> str:
    name = value.replace("\\", "/").split("/")[-1]
    name = re.sub(r"[\x00-\x1f\x7f]+", "", name).strip()
    name = re.sub(r'[<>:"|?*]+', "-", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip(". ")
