from pydantic import BaseModel
from typing import Any, Generic, TypeVar, Optional

T = TypeVar("T")


class DataResponse(BaseModel, Generic[T]):
    data: T
    message: str = "ok"


class ListResponse(BaseModel, Generic[T]):
    data: list[T]
    total: int
    message: str = "ok"


class ErrorResponse(BaseModel):
    error: dict[str, Any]


class ErrorDetail(BaseModel):
    code: str
    message: str


class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 20
