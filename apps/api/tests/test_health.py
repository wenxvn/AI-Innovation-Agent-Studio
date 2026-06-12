from app.main import API_VERSION


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert data["version"] == API_VERSION
    assert data["api"]["status"] == "online"
    assert data["database"]["status"] in {"connected", "disconnected"}
    assert data["redis"]["status"] in {"connected", "disconnected"}
    assert data["storage"]["backend"]
    assert "llm" in data
    assert "embedding" in data
    assert "origins" in data["cors"]


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "AI Innovation Agent Studio" in data["message"]
