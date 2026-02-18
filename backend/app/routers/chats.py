"""Chat & message CRUD router."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Chat, Message, User, chat_members, ReadReceipt
from app.schemas import ChatCreate, ChatOut, MessageCreate, MessageOut, MessageStatusUpdate, UserOut
from app.security import get_current_user
from app.routers.ws import manager

router = APIRouter(prefix="/api/chats", tags=["chats"])


# ---------- helpers ----------

async def _build_chat_out(chat: Chat, db: AsyncSession) -> dict:
    """Build ChatOut dict with last_message."""
    last_msg_result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_msg = last_msg_result.scalar_one_or_none()
    data = {
        "id": chat.id,
        "chat_type": chat.chat_type,
        "title": chat.title,
        "avatar_url": chat.avatar_url,
        "created_at": chat.created_at,
        "members": [UserOut.model_validate(m) for m in chat.members],
        "last_message": MessageOut.model_validate(last_msg) if last_msg else None,
    }
    return data


# ---------- endpoints ----------

@router.post("", response_model=ChatOut, status_code=status.HTTP_201_CREATED)
async def create_chat(body: ChatCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    chat = Chat(
        chat_type=body.chat_type,
        title=body.title,
        created_by=user.id,
    )
    db.add(chat)
    await db.flush()

    # Add creator
    await db.execute(chat_members.insert().values(chat_id=chat.id, user_id=user.id))

    # Add other members
    added_member_ids = []
    for mid in body.member_ids:
        if mid != user.id:
            member = await db.execute(select(User).where(User.id == mid))
            if member.scalar_one_or_none():
                await db.execute(chat_members.insert().values(chat_id=chat.id, user_id=mid))
                added_member_ids.append(mid)

    await db.commit()

    # Notify all added members via WebSocket
    for mid in added_member_ids:
        await manager.send_to_user(mid, {
            "type": "chat_added",
            "chat_id": str(chat.id),
        })

    # Reload with members
    result = await db.execute(
        select(Chat).options(selectinload(Chat.members)).where(Chat.id == chat.id)
    )
    chat = result.scalar_one()
    return await _build_chat_out(chat, db)


@router.get("", response_model=List[ChatOut])
async def list_chats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Chat)
        .join(chat_members, chat_members.c.chat_id == Chat.id)
        .where(chat_members.c.user_id == user.id)
        .options(selectinload(Chat.members))
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().unique().all()
    out = []
    for c in chats:
        out.append(await _build_chat_out(c, db))
    return out


@router.get("/{chat_id}", response_model=ChatOut)
async def get_chat(chat_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Chat).options(selectinload(Chat.members)).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "Chat not found")
    if user.id not in [m.id for m in chat.members]:
        raise HTTPException(403, "Not a member of this chat")
    return await _build_chat_out(chat, db)


@router.post("/{chat_id}/members")
async def add_member(chat_id: uuid.UUID, member_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Chat).options(selectinload(Chat.members)).where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "Chat not found")
    if chat.chat_type != "group":
        raise HTTPException(400, "Cannot add members to a private chat")
    if user.id not in [m.id for m in chat.members]:
        raise HTTPException(403, "Not a member")

    target = await db.execute(select(User).where(User.id == member_id))
    if not target.scalar_one_or_none():
        raise HTTPException(404, "User not found")

    existing = await db.execute(
        select(chat_members).where(
            and_(chat_members.c.chat_id == chat_id, chat_members.c.user_id == member_id)
        )
    )
    if existing.first():
        raise HTTPException(400, "User already a member")

    await db.execute(chat_members.insert().values(chat_id=chat_id, user_id=member_id))
    await db.commit()

    # Notify the added user via WebSocket so they refresh their chat list
    await manager.send_to_user(member_id, {
        "type": "chat_added",
        "chat_id": str(chat_id),
    })

    return {"detail": "Member added"}


# ---------- messages ----------

@router.get("/{chat_id}/messages", response_model=List[MessageOut])
async def list_messages(
    chat_id: uuid.UUID,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Check membership
    membership = await db.execute(
        select(chat_members).where(
            and_(chat_members.c.chat_id == chat_id, chat_members.c.user_id == user.id)
        )
    )
    if not membership.first():
        raise HTTPException(403, "Not a member of this chat")

    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()
    return [MessageOut.model_validate(m) for m in reversed(messages)]


@router.post("/{chat_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: uuid.UUID,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    membership = await db.execute(
        select(chat_members).where(
            and_(chat_members.c.chat_id == chat_id, chat_members.c.user_id == user.id)
        )
    )
    if not membership.first():
        raise HTTPException(403, "Not a member of this chat")

    msg = Message(chat_id=chat_id, sender_id=user.id, content=body.content, status="sent")
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return MessageOut.model_validate(msg)


@router.patch("/{chat_id}/messages/{message_id}/status", response_model=MessageOut)
async def update_message_status(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    body: MessageStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Message).where(Message.id == message_id, Message.chat_id == chat_id))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(404, "Message not found")

    msg.status = body.status

    if body.status == "read":
        existing = await db.execute(
            select(ReadReceipt).where(ReadReceipt.message_id == message_id, ReadReceipt.user_id == user.id)
        )
        if not existing.scalar_one_or_none():
            db.add(ReadReceipt(message_id=message_id, user_id=user.id))

    await db.commit()
    await db.refresh(msg)
    return MessageOut.model_validate(msg)


@router.get("/private/{user_id}", response_model=ChatOut)
async def get_or_create_private_chat(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get existing private chat with a user, or create one."""
    # Find existing private chat with exactly these two users
    my_chats = await db.execute(
        select(chat_members.c.chat_id).where(chat_members.c.user_id == user.id)
    )
    my_chat_ids = [row[0] for row in my_chats.fetchall()]

    if my_chat_ids:
        their_chats = await db.execute(
            select(chat_members.c.chat_id).where(
                and_(
                    chat_members.c.user_id == user_id,
                    chat_members.c.chat_id.in_(my_chat_ids),
                )
            )
        )
        common_chat_ids = [row[0] for row in their_chats.fetchall()]

        for cid in common_chat_ids:
            chat_result = await db.execute(
                select(Chat).options(selectinload(Chat.members)).where(
                    Chat.id == cid, Chat.chat_type == "private"
                )
            )
            chat = chat_result.scalar_one_or_none()
            if chat:
                return await _build_chat_out(chat, db)

    # Create new private chat
    target = await db.execute(select(User).where(User.id == user_id))
    if not target.scalar_one_or_none():
        raise HTTPException(404, "User not found")

    chat = Chat(chat_type="private", created_by=user.id)
    db.add(chat)
    await db.flush()
    await db.execute(chat_members.insert().values(chat_id=chat.id, user_id=user.id))
    await db.execute(chat_members.insert().values(chat_id=chat.id, user_id=user_id))
    await db.commit()

    result = await db.execute(
        select(Chat).options(selectinload(Chat.members)).where(Chat.id == chat.id)
    )
    chat = result.scalar_one()
    return await _build_chat_out(chat, db)
