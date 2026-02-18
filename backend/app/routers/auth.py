"""Auth router: register, login (password), SMS OTP flow."""

import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, SMSCode
from app.schemas import (
    RegisterRequest, LoginPasswordRequest, RequestSMSCode,
    VerifySMSCode, TokenResponse, UserOut,
)
from app.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.phone == body.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = User(
        phone=body.phone,
        display_name=body.display_name or body.phone,
        password_hash=hash_password(body.password) if body.password else None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login_password(body: LoginPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/sms/request")
async def request_sms_code(body: RequestSMSCode, db: AsyncSession = Depends(get_db)):
    """Simulate sending an SMS code (prints to console)."""
    code = "".join(random.choices(string.digits, k=6))
    sms = SMSCode(
        phone=body.phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(sms)
    await db.commit()
    # In production this would go through an SMS gateway
    print(f"[SMS] Code for {body.phone}: {code}")
    return {"detail": "SMS code sent", "code_for_dev": code}


@router.post("/sms/verify", response_model=TokenResponse)
async def verify_sms_code(body: VerifySMSCode, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SMSCode)
        .where(
            SMSCode.phone == body.phone,
            SMSCode.code == body.code,
            SMSCode.is_used == False,
            SMSCode.expires_at > datetime.now(timezone.utc),
        )
        .order_by(SMSCode.created_at.desc())
    )
    sms = result.scalar_one_or_none()
    if not sms:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    sms.is_used = True

    # Find or create user
    user_result = await db.execute(select(User).where(User.phone == body.phone))
    user = user_result.scalar_one_or_none()
    if not user:
        user = User(phone=body.phone, display_name=body.phone)
        db.add(user)

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
