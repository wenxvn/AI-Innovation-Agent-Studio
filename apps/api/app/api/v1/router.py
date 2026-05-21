from fastapi import APIRouter
from app.api.v1 import projects, documents, memory, skills, agents, tools, evals, outputs, runtime, rag, trace

router = APIRouter(prefix="/api/v1")

router.include_router(projects.router)
router.include_router(documents.router)
router.include_router(memory.router)
router.include_router(skills.router)
router.include_router(agents.router)
router.include_router(tools.router)
router.include_router(evals.router)
router.include_router(outputs.router)
router.include_router(runtime.router)
router.include_router(rag.router)
router.include_router(trace.router)
