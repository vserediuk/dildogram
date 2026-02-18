"""User profile router: view, update, avatar upload."""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User, chat_members
from app.schemas import UserOut, UserUpdate
from app.security import get_current_user
from app.routers.ws import manager

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(
            or_(
                User.phone.ilike(f"%{q}%"),
                User.username.ilike(f"%{q}%"),
                User.display_name.ilike(f"%{q}%"),
            )
        ).limit(20)
    )
    users = result.scalars().all()
    return [UserOut.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.username is not None:
        existing = await db.execute(select(User).where(User.username == body.username, User.id != user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Username already taken")
        user.username = body.username
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.bio is not None:
        user.bio = body.bio

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, "Only JPEG, PNG or WebP images allowed")
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5 MB)")

    upload_dir = Path(settings.UPLOAD_DIR) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = upload_dir / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    user.avatar_url = f"/uploads/avatars/{filename}"
    await db.commit()
    await db.refresh(user)

    # Notify all chat partners to refresh (so they see the new avatar)
    result = await db.execute(select(chat_members.c.chat_id).where(chat_members.c.user_id == user.id))
    chat_ids = [row[0] for row in result.fetchall()]
    notified: set = set()
    for cid in chat_ids:
        members_result = await db.execute(
            select(chat_members.c.user_id).where(chat_members.c.chat_id == cid)
        )
        for row in members_result.fetchall():
            uid = row[0]
            if uid != user.id and uid not in notified:
                notified.add(uid)
                await manager.send_to_user(uid, {
                    "type": "avatar_updated",
                    "user_id": str(user.id),
                    "avatar_url": user.avatar_url,
                })

    return UserOut.model_validate(user)
