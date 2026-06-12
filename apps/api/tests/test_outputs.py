def test_create_output(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Test"})
    project_id = project_resp.json()["data"]["id"]

    response = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Test Output",
        "content": "# Test\nThis is test content",
        "output_type": "prd",
        "content_type": "markdown",
        "language": "markdown",
        "file_name": "test-output.md",
        "metadata": {"audience": "product"},
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["title"] == "Test Output"
    assert data["output_type"] == "prd"
    assert data["content_type"] == "markdown"
    assert data["language"] == "markdown"
    assert data["file_name"] == "test-output.md"
    assert data["metadata_"]["audience"] == "product"


def test_list_outputs(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output List Test"})
    project_id = project_resp.json()["data"]["id"]

    client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Output 1",
        "content": "Content 1",
    })
    client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Output 2",
        "content": "Content 2",
    })

    response = client.get(f"/api/v1/projects/{project_id}/outputs")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2


def test_download_output(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Download Test"})
    project_id = project_resp.json()["data"]["id"]

    output_resp = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Download Test",
        "content": "# Download Test Content",
        "file_name": "download-test.md",
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{project_id}/outputs/{output_id}/download")
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert response.text == "# Download Test Content"
    assert 'filename="download-test.md"' in response.headers["content-disposition"]


def test_export_output_markdown(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Export Test"})
    project_id = project_resp.json()["data"]["id"]

    output_resp = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Architecture Plan",
        "content": "## System View",
        "output_type": "architecture",
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{project_id}/outputs/{output_id}/export?format=markdown")

    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert response.text == "## System View"
    assert "Architecture-Plan.md" in response.headers["content-disposition"]


def test_export_output_rejects_unsupported_format(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Export Format Test"})
    project_id = project_resp.json()["data"]["id"]

    output_resp = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Research Report",
        "content": "# Research",
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{project_id}/outputs/{output_id}/export?format=pdf")

    assert response.status_code == 400
    assert "Unsupported export format" in response.json()["detail"]


def test_output_download_is_project_scoped(client):
    first_project_resp = client.post("/api/v1/projects", json={"name": "Output Scope A"})
    second_project_resp = client.post("/api/v1/projects", json={"name": "Output Scope B"})
    first_project_id = first_project_resp.json()["data"]["id"]
    second_project_id = second_project_resp.json()["data"]["id"]

    output_resp = client.post(f"/api/v1/projects/{first_project_id}/outputs", json={
        "title": "Scoped Output",
        "content": "# Private",
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{second_project_id}/outputs/{output_id}/download")

    assert response.status_code == 404


def test_delete_output(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Delete Test"})
    project_id = project_resp.json()["data"]["id"]

    output_resp = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "To Delete",
        "content": "Delete me",
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.delete(f"/api/v1/projects/{project_id}/outputs/{output_id}")
    assert response.status_code == 200
