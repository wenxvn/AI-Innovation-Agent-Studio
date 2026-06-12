from pathlib import Path

import pytest

from app.api.v1 import documents as document_api
from app.models.document import Document
from app.services import documents as document_service
from app.services.providers.mock_provider import MockEmbeddingProvider


@pytest.fixture(autouse=True)
def fast_embeddings(monkeypatch):
    monkeypatch.setattr(
        document_service,
        "get_embedding_provider",
        lambda: MockEmbeddingProvider(dimension=8),
    )


@pytest.fixture
def upload_dir(monkeypatch, tmp_path):
    monkeypatch.setattr(document_api.settings, "UPLOAD_DIR", str(tmp_path))
    return tmp_path


def create_project(client) -> str:
    response = client.post("/api/v1/projects", json={"name": "Document Upload Test"})
    assert response.status_code == 201
    return response.json()["data"]["id"]


def upload_url(project_id: str) -> str:
    return f"/api/v1/projects/{project_id}/documents/upload"


def test_upload_rejects_too_large_file(client, upload_dir, monkeypatch):
    project_id = create_project(client)
    monkeypatch.setattr(document_api, "max_file_size_bytes", lambda: 4)

    response = client.post(
        upload_url(project_id),
        files={"file": ("brief.txt", b"12345", "text/plain")},
    )

    assert response.status_code == 413
    assert "File is too large" in response.json()["detail"]
    assert "4B" in response.json()["detail"]


def test_upload_rejects_invalid_extension(client, upload_dir):
    project_id = create_project(client)

    response = client.post(
        upload_url(project_id),
        files={"file": ("brief.exe", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    assert "File extension '.exe' is not supported" in response.json()["detail"]


def test_upload_rejects_empty_file(client, upload_dir):
    project_id = create_project(client)

    response = client.post(
        upload_url(project_id),
        files={"file": ("brief.txt", b"", "text/plain")},
    )

    assert response.status_code == 400
    assert "File is empty" in response.json()["detail"]


def test_upload_rejects_unknown_mime_type(client, upload_dir):
    project_id = create_project(client)

    response = client.post(
        upload_url(project_id),
        files={"file": ("brief.txt", b"hello", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "Unknown MIME type" in response.json()["detail"]


def test_parse_failure_marks_document_failed(client, upload_dir):
    project_id = create_project(client)

    response = client.post(
        upload_url(project_id),
        files={"file": ("broken.txt", b"\xff\xfe\xfa", "text/plain")},
    )

    assert response.status_code == 201
    document = response.json()["data"]
    assert document["status"] == "failed"
    assert document["embedding_status"] == "failed"
    assert document["chunk_count"] == 0
    assert "UTF-8" in document["error_message"]
    assert document["metadata_"]["parse_error"]["stage"] == "parse"

    chunks_response = client.get(f"/api/v1/projects/{project_id}/documents/{document['id']}/chunks")
    assert chunks_response.status_code == 200
    assert chunks_response.json()["total"] == 0


def test_reindex_refreshes_chunks_and_clears_error(client, db, upload_dir):
    project_id = create_project(client)

    response = client.post(
        upload_url(project_id),
        files={"file": ("brief.md", b"Original context for the project.", "text/markdown")},
    )

    assert response.status_code == 201
    document = response.json()["data"]
    assert document["status"] == "indexed"
    assert document["chunk_count"] == 1

    db_document = db.get(Document, document["id"])
    assert db_document is not None
    Path(db_document.file_path).write_text("Updated context after retry.", encoding="utf-8")

    reindex_response = client.post(f"/api/v1/projects/{project_id}/documents/{document['id']}/reindex")

    assert reindex_response.status_code == 200
    reindexed = reindex_response.json()["data"]
    assert reindexed["status"] == "indexed"
    assert reindexed["error_message"] == ""
    assert reindexed["chunk_count"] == 1

    chunks_response = client.get(f"/api/v1/projects/{project_id}/documents/{document['id']}/chunks")
    assert chunks_response.status_code == 200
    chunks = chunks_response.json()["data"]
    assert len(chunks) == 1
    assert chunks[0]["content"] == "Updated context after retry."
