"""FastAPI application entry point."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, chats, users, ws

app = FastAPI(
    title="Messenger API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — разрешаем фронтенд
_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    settings.FRONTEND_URL,
]
# Allow extra origins via env (comma-separated)
_extra = os.getenv("EXTRA_CORS_ORIGINS", "")
if _extra:
    _origins.extend([o.strip() for o in _extra.split(",") if o.strip()])
# Filter out empty/duplicate values
_origins = list({o for o in _origins if o})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
uploads = Path(settings.UPLOAD_DIR)
uploads.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads)), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(chats.router)
app.include_router(users.router)
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
