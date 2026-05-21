def test_create_output(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Output Test"})
    project_id = project_resp.json()["data"]["id"]

    response = client.post(f"/api/v1/projects/{project_id}/outputs", json={
        "title": "Test Output",
        "content": "# Test\nThis is test content",
        "output_type": "prd",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["title"] == "Test Output"
    assert data["output_type"] == "prd"


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
    })
    output_id = output_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{project_id}/outputs/{output_id}/download")
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]


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
