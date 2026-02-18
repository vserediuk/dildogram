import re
from pydantic import field_validator
from pydantic_settings import BaseSettings


def _build_db_url(raw: str, driver: str) -> str:
    """Convert a generic postgresql:// URL to one with the given driver."""
    # Strip any existing scheme variant to a canonical form
    raw = re.sub(r'^postgres(ql)?(\+\w+)?://', 'postgresql://', raw, count=1)
    return raw.replace('postgresql://', f'postgresql+{driver}://', 1)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/messenger"
    SECRET_KEY: str = "super-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    UPLOAD_DIR: str = "uploads"
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """Always ensure the URL uses asyncpg driver."""
        return _build_db_url(v, "asyncpg")

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """Derive a sync URL (psycopg2) from the async one."""
        return _build_db_url(self.DATABASE_URL, "psycopg2")

    class Config:
        env_file = ".env"


settings = Settings()
