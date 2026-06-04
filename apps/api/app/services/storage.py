import os
import shutil
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageService:
    def __init__(self):
        self.backend = os.getenv("STORAGE_BACKEND", "local").lower()
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_file(self, project_id: str, filename: str, file_content: bytes) -> dict:
        project_dir = os.path.join(self.upload_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)

        file_path = os.path.join(project_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_content)

        return {
            "file_path": file_path,
            "storage_backend": "local",
            "bucket": "",
            "object_key": f"{project_id}/{filename}",
            "content_type": self._guess_content_type(filename),
            "size": len(file_content),
        }

    def delete_file(self, file_path: str) -> bool:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error("Failed to delete file %s: %s", file_path, e)
            return False

    def get_file_path(self, file_path: str) -> str | None:
        if os.path.exists(file_path):
            return file_path
        return None

    def _guess_content_type(self, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        types = {
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".pdf": "application/pdf",
            ".json": "application/json",
            ".yaml": "text/yaml",
            ".yml": "text/yaml",
            ".py": "text/x-python",
            ".ts": "text/typescript",
            ".tsx": "text/typescript",
            ".js": "text/javascript",
            ".jsx": "text/javascript",
        }
        return types.get(ext, "application/octet-stream")

    def get_storage_info(self) -> dict:
        return {
            "backend": self.backend,
            "upload_dir": self.upload_dir,
            "available": True,
        }


_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
