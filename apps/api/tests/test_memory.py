def test_create_memory(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Memory Test"})
    project_id = project_resp.json()["data"]["id"]

    response = client.post(f"/api/v1/projects/{project_id}/memory", json={
        "memory_type": "project",
        "content": "This is a test memory",
        "confidence": 0.9,
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["content"] == "This is a test memory"
    assert data["memory_type"] == "project"


def test_list_memories(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Memory List Test"})
    project_id = project_resp.json()["data"]["id"]

    client.post(f"/api/v1/projects/{project_id}/memory", json={
        "memory_type": "project",
        "content": "Memory 1",
    })
    client.post(f"/api/v1/projects/{project_id}/memory", json={
        "memory_type": "project",
        "content": "Memory 2",
    })

    response = client.get(f"/api/v1/projects/{project_id}/memory")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2


def test_delete_memory(client):
    project_resp = client.post("/api/v1/projects", json={"name": "Memory Delete Test"})
    project_id = project_resp.json()["data"]["id"]

    mem_resp = client.post(f"/api/v1/projects/{project_id}/memory", json={
        "memory_type": "project",
        "content": "To be deleted",
    })
    mem_id = mem_resp.json()["data"]["id"]

    response = client.delete(f"/api/v1/projects/{project_id}/memory/{mem_id}")
    assert response.status_code == 200
