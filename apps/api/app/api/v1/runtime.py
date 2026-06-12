from fastapi import APIRouter
from app.core.version import API_VERSION
from app.services.llm import get_provider_status
from app.services.runtime_status import build_runtime_diagnostics
from app.schemas.common import DataResponse

router = APIRouter(prefix="/runtime", tags=["runtime"])


@router.get("/providers")
def get_providers():
    status = get_provider_status()
    return DataResponse(data=status.model_dump())


@router.get("/status")
def get_status():
    return DataResponse(data=build_runtime_diagnostics(API_VERSION))
