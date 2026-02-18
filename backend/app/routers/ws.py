"""WebSocket manager for real-time messaging."""

import json
import uuid
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, async_session
from app.models import Message, Chat, chat_members, ReadReceipt, User
from app.schemas import MessageOut, UserOut
from app.security import get_ws_user

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id -> set of WebSocket connections (supports multiple devices)
        self.active: Dict[uuid.UUID, Set[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, ws: WebSocket):
        await ws.accept()
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(ws)

    def disconnect(self, user_id: uuid.UUID, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: uuid.UUID, data: dict):
        conns = self.active.get(user_id, set())
        dead = []
        for ws in list(conns):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.discard(ws)

    async def broadcast_to_chat(self, chat_member_ids: list[uuid.UUID], data: dict, exclude: uuid.UUID = None):
        for uid in chat_member_ids:
            if uid != exclude:
                await self.send_to_user(uid, data)

    def is_online(self, user_id: uuid.UUID) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    async with async_session() as db:
        user = await get_ws_user(websocket, db)
        if not user:
            await websocket.close(code=4001, reason="Unauthorized")
            return

        await manager.connect(user.id, websocket)
        # Notify contacts that user is online
        await _broadcast_presence(user.id, True, db)

        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                await _handle_ws_message(user, data, db)
        except WebSocketDisconnect:
            manager.disconnect(user.id, websocket)
            # Update last_seen
            result = await db.execute(select(User).where(User.id == user.id))
            u = result.scalar_one_or_none()
            if u:
                from datetime import datetime, timezone as tz
                u.last_seen = datetime.now(tz.utc)
                await db.commit()
            await _broadcast_presence(user.id, False, db)
        except Exception:
            manager.disconnect(user.id, websocket)


async def _handle_ws_message(user: User, data: dict, db: AsyncSession):
    """
    Incoming WebSocket messages:
      { "type": "message", "chat_id": "...", "content": "..." }
      { "type": "typing",  "chat_id": "..." }
      { "type": "read",    "chat_id": "...", "message_id": "..." }
    """
    msg_type = data.get("type")

    if msg_type == "message":
        chat_id = uuid.UUID(data["chat_id"])
        content = data.get("content", "").strip()
        if not content:
            return

        # Verify membership
        membership = await db.execute(
            select(chat_members).where(
                and_(chat_members.c.chat_id == chat_id, chat_members.c.user_id == user.id)
            )
        )
        if not membership.first():
            return

        # Save message
        msg = Message(chat_id=chat_id, sender_id=user.id, content=content, status="sent")
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

        # Get chat members
        members_result = await db.execute(
            select(chat_members.c.user_id).where(chat_members.c.chat_id == chat_id)
        )
        member_ids = [row[0] for row in members_result.fetchall()]

        sender_out = UserOut.model_validate(user)
        msg_out = MessageOut(
            id=msg.id,
            chat_id=msg.chat_id,
            sender_id=msg.sender_id,
            sender=sender_out,
            content=msg.content,
            status=msg.status if isinstance(msg.status, str) else msg.status.value,
            created_at=msg.created_at,
        )

        payload = {
            "type": "new_message",
            "message": msg_out.model_dump(mode="json"),
        }

        # Send to all members including sender (for multi-device sync)
        for uid in member_ids:
            await manager.send_to_user(uid, payload)

        # Mark as delivered for online members
        for uid in member_ids:
            if uid != user.id and manager.is_online(uid):
                msg.status = "delivered"
                await db.commit()
                await manager.send_to_user(user.id, {
                    "type": "status_update",
                    "message_id": str(msg.id),
                    "chat_id": str(chat_id),
                    "status": "delivered",
                })
                break

    elif msg_type == "typing":
        chat_id = uuid.UUID(data["chat_id"])
        members_result = await db.execute(
            select(chat_members.c.user_id).where(chat_members.c.chat_id == chat_id)
        )
        member_ids = [row[0] for row in members_result.fetchall()]
        await manager.broadcast_to_chat(member_ids, {
            "type": "typing",
            "chat_id": str(chat_id),
            "user_id": str(user.id),
        }, exclude=user.id)

    elif msg_type == "read":
        chat_id = uuid.UUID(data["chat_id"])
        message_id = uuid.UUID(data["message_id"])

        result = await db.execute(
            select(Message).where(Message.id == message_id, Message.chat_id == chat_id)
        )
        msg = result.scalar_one_or_none()
        if not msg:
            return

        # Add read receipt
        existing = await db.execute(
            select(ReadReceipt).where(ReadReceipt.message_id == message_id, ReadReceipt.user_id == user.id)
        )
        if not existing.scalar_one_or_none():
            db.add(ReadReceipt(message_id=message_id, user_id=user.id))

        msg.status = "read"
        await db.commit()

        # Notify sender
        if msg.sender_id:
            await manager.send_to_user(msg.sender_id, {
                "type": "status_update",
                "message_id": str(message_id),
                "chat_id": str(chat_id),
                "status": "read",
            })


async def _broadcast_presence(user_id: uuid.UUID, online: bool, db: AsyncSession):
    """Notify all chat partners about presence change."""
    result = await db.execute(
        select(chat_members.c.chat_id).where(chat_members.c.user_id == user_id)
    )
    chat_ids = [row[0] for row in result.fetchall()]

    notified: set[uuid.UUID] = set()
    for cid in chat_ids:
        members_result = await db.execute(
            select(chat_members.c.user_id).where(chat_members.c.chat_id == cid)
        )
        for row in members_result.fetchall():
            uid = row[0]
            if uid != user_id and uid not in notified:
                notified.add(uid)
                await manager.send_to_user(uid, {
                    "type": "presence",
                    "user_id": str(user_id),
                    "online": online,
                })
