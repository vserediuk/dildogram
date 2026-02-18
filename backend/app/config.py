import os
from pydantic_settings import BaseSettings


def _build_db_url(raw: str, driver: str) -> str:
    """Convert a generic postgresql:// URL to one with the given driver."""
    import re
    # Strip any existing scheme variant to a canonical form
    raw = re.sub(r'^postgres(ql)?(\+\w+)?://', 'postgresql://', raw, count=1)
    return raw.replace('postgresql://', f'postgresql+{driver}://', 1)


_raw_db = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/messenger",
)


class Settings(BaseSettings):
    DATABASE_URL: str = _build_db_url(_raw_db, "asyncpg")
    DATABASE_URL_SYNC: str = os.getenv(
        "DATABASE_URL_SYNC",
        _build_db_url(_raw_db, "psycopg2"),
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    class Config:
        env_file = ".env"


settings = Settings()
