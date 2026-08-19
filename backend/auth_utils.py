import os
import random
from datetime import timedelta

import jwt
from fastapi import Depends, HTTPException, Header
from passlib.context import CryptContext

from db import db
from models import User, now_utc, iso_now

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30
OTP_TTL_SECONDS = 300  # 5 minutes
DEV_MODE = os.environ.get("APP_ENV", "development") != "production"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_token(user_id: str, is_admin: bool = False) -> str:
    payload = {
        "sub": str(user_id),
        "is_admin": is_admin,
        "exp": now_utc() + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


async def _get_user_from_header(authorization: str) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    from bson import ObjectId

    user_id = payload.get("sub")
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    user = User.from_mongo(doc)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


async def get_current_user(authorization: str = Header(default="")) -> User:
    return await _get_user_from_header(authorization)


async def get_optional_user(authorization: str = Header(default="")):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await _get_user_from_header(authorization)
    except HTTPException:
        return None


async def get_current_admin(authorization: str = Header(default="")) -> User:
    user = await _get_user_from_header(authorization)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
