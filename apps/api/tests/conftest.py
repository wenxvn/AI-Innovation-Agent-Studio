import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.core.config import get_settings

settings = get_settings()

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", settings.DATABASE_URL)

try:
    connect_args = {"check_same_thread": False} if TEST_DATABASE_URL.startswith("sqlite") else {"connect_timeout": 2}
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    engine.connect().close()
    USE_REAL_DB = True
except Exception:
    engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    USE_REAL_DB = False


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db):
    return db


@pytest.fixture(scope="function")
def test_project(db):
    from app.models.project import Project
    project = Project(
        name="Test Project",
        description="A test project",
        goal="Test goal",
        status="active",
        current_stage="ideation",
        tech_stack=["Python", "FastAPI"],
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture(scope="function")
def client(db):
    return TestClient(app)
