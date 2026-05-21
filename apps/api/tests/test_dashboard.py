def test_dashboard_stats(client):
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "project_count" in data
    assert "agent_run_count" in data
    assert "output_count" in data
    assert "avg_score" in data


def test_dashboard_stats_with_projects(client):
    client.post("/api/v1/projects", json={"name": "Stats Test 1"})
    client.post("/api/v1/projects", json={"name": "Stats Test 2"})

    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["project_count"] >= 2
    assert data["active_project_count"] >= 2


def test_tools_list(client):
    response = client.get("/api/v1/tools")
    assert response.status_code == 200
    data = response.json()
    assert "tools" in data
    assert data["total"] > 0


def test_skills_list(client):
    response = client.get("/api/v1/skills")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
