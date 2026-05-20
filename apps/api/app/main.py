from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Innovation Agent Studio API",
    description="智创工坊后端 API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "AI Innovation Agent Studio API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/v1/projects")
async def list_projects():
    return {
        "projects": [
            {
                "id": "demo-project-001",
                "name": "面向高校 AI 创新竞赛的多智能体项目孵化平台",
                "status": "active",
                "progress": 65
            }
        ]
    }


@app.get("/api/v1/projects/{project_id}")
async def get_project(project_id: str):
    return {
        "id": project_id,
        "name": "面向高校 AI 创新竞赛的多智能体项目孵化平台",
        "description": "一个工程级 AI Agent 平台",
        "status": "active",
        "current_stage": "Architecture Design",
        "progress": 65
    }


@app.get("/api/v1/skills")
async def list_skills():
    return {
        "skills": [
            {"name": "competition-analyzer", "version": "0.1.0"},
            {"name": "idea-generator", "version": "0.1.0"},
            {"name": "prd-writer", "version": "0.1.0"},
            {"name": "architecture-designer", "version": "0.1.0"},
        ]
    }


@app.get("/api/v1/tools")
async def list_tools():
    return {
        "tools": [
            {"name": "File Tool", "permission_level": "high"},
            {"name": "RAG Search Tool", "permission_level": "low"},
            {"name": "Web Search Tool", "permission_level": "medium"},
        ]
    }
