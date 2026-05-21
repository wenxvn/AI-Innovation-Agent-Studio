def test_create_project(client):
    response = client.post("/api/v1/projects", json={
        "name": "Test Project",
        "description": "A test project",
        "goal": "Testing",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert "id" in data


def test_list_projects(client):
    client.post("/api/v1/projects", json={"name": "Project 1"})
    client.post("/api/v1/projects", json={"name": "Project 2"})

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["data"]) >= 2


def test_get_project(client):
    create_resp = client.post("/api/v1/projects", json={"name": "Get Test"})
    project_id = create_resp.json()["data"]["id"]

    response = client.get(f"/api/v1/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Get Test"


def test_get_project_not_found(client):
    response = client.get("/api/v1/projects/nonexistent")
    assert response.status_code == 404


def test_update_project(client):
    create_resp = client.post("/api/v1/projects", json={"name": "Old Name"})
    project_id = create_resp.json()["data"]["id"]

    response = client.patch(f"/api/v1/projects/{project_id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New Name"


def test_delete_project(client):
    create_resp = client.post("/api/v1/projects", json={"name": "Delete Test"})
    project_id = create_resp.json()["data"]["id"]

    response = client.delete(f"/api/v1/projects/{project_id}")
    assert response.status_code == 200

    get_resp = client.get(f"/api/v1/projects/{project_id}")
    assert get_resp.status_code == 404
