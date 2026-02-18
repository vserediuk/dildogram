"""Pydantic schemas for request / response validation."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    password: Optional[str] = Field(None, min_length=6)
    display_name: Optional[str] = None


class LoginPasswordRequest(BaseModel):
    phone: str
    password: str


class RequestSMSCode(BaseModel):
    phone: str


class VerifySMSCode(BaseModel):
    phone: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- User / Profile ----------

class UserOut(BaseModel):
    id: uuid.UUID
    phone: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None


# ---------- Chat ----------

class ChatCreate(BaseModel):
    chat_type: str = "private"  # "private" | "group"
    title: Optional[str] = None
    member_ids: List[uuid.UUID] = []


class ChatOut(BaseModel):
    id: uuid.UUID
    chat_type: str
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    members: List[UserOut] = []
    last_message: Optional[MessageOut] = None

    class Config:
        from_attributes = True


# ---------- Message ----------

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class MessageOut(BaseModel):
    id: uuid.UUID
    chat_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    sender: Optional[UserOut] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageStatusUpdate(BaseModel):
    status: str  # "delivered" | "read"


# ---------- resolve forward refs ----------

ChatOut.model_rebuild()
