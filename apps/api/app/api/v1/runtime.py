from fastapi import APIRouter
from app.services.llm import get_provider_status
from app.schemas.common import DataResponse

router = APIRouter(prefix="/runtime", tags=["runtime"])


@router.get("/providers")
def get_providers():
    status = get_provider_status()
    return DataResponse(data=status.model_dump())


@router.get("/status")
def get_status():
    status = get_provider_status()
    return DataResponse(data={
        "llm": {
            "provider": status.llm_provider,
            "model": status.llm_model,
            "mode": status.llm_mode,
            "configured": status.llm_configured,
        },
        "embedding": {
            "provider": status.embedding_provider,
            "model": status.embedding_model,
            "mode": status.embedding_mode,
            "configured": status.embedding_configured,
        },
    })
