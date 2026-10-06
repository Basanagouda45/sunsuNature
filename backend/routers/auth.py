# import re
# from datetime import timedelta

# from fastapi import APIRouter, Depends, HTTPException

# from db import db
# from models import (
#     SendOtpRequest,
#     VerifyOtpRequest,
#     UpdateProfileRequest,
#     AdminLoginRequest,
#     User,
#     now_utc,
#     iso_now,
# )
# from auth_utils import (
#     generate_otp,
#     create_token,
#     get_current_user,
#     verify_password,
#     OTP_TTL_SECONDS,
#     DEV_MODE,
# )

# router = APIRouter(prefix="/auth", tags=["auth"])

# PHONE_RE = re.compile(r"^[6-9]\d{9}$")


# def _user_public(user: User) -> dict:
#     return {
#         "id": user.id,
#         "phone": user.phone,
#         "email": user.email,
#         "name": user.name,
#         "is_admin": user.is_admin,
#     }


# @router.post("/send-otp")
# async def send_otp(body: SendOtpRequest):
#     phone = body.phone.strip().replace(" ", "")
#     if phone.startswith("+91"):
#         phone = phone[3:]
#     if not PHONE_RE.match(phone):
#         raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")

#     # Basic rate limiting: max 5 active OTP requests per phone
#     recent = await db.otps.count_documents({"phone": phone})
#     if recent >= 5:
#         raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

#     otp = generate_otp()
#     expires_at = now_utc() + timedelta(seconds=OTP_TTL_SECONDS)
#     await db.otps.insert_one(
#         {
#             "phone": phone,
#             "otp": otp,
#             "attempts": 0,
#             "created_at": now_utc(),
#             "expires_at": expires_at,
#         }
#     )

#     resp = {"success": True, "message": f"OTP sent to +91 {phone}", "expires_in": OTP_TTL_SECONDS}
#     # In development we return the OTP so it can be tested without an SMS provider.
#     if DEV_MODE:
#         resp["dev_otp"] = otp
#     return resp


# @router.post("/verify-otp")
# async def verify_otp(body: VerifyOtpRequest):
#     phone = body.phone.strip().replace(" ", "")
#     if phone.startswith("+91"):
#         phone = phone[3:]
#     record = await db.otps.find_one({"phone": phone}, sort=[("created_at", -1)])
#     if not record:
#         raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
#     if record.get("attempts", 0) >= 5:
#         raise HTTPException(status_code=429, detail="Too many wrong attempts. Request a new OTP.")
#     if record["otp"] != body.otp.strip():
#         await db.otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
#         raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

#     # OTP correct — clear all OTPs for this phone
#     await db.otps.delete_many({"phone": phone})

#     doc = await db.users.find_one({"phone": phone})
#     if not doc:
#         user = User(phone=phone)
#         res = await db.users.insert_one(user.to_mongo())
#         doc = await db.users.find_one({"_id": res.inserted_id})
#     user = User.from_mongo(doc)
#     token = create_token(user.id, user.is_admin)
#     return {"token": token, "user": _user_public(user)}


# @router.get("/me")
# async def me(current: User = Depends(get_current_user)):
#     return _user_public(current)


# @router.put("/profile")
# async def update_profile(body: UpdateProfileRequest, current: User = Depends(get_current_user)):
#     from bson import ObjectId

#     update = {}
#     if body.name is not None:
#         update["name"] = body.name
#     if body.email is not None:
#         update["email"] = body.email
#     if update:
#         await db.users.update_one({"_id": ObjectId(current.id)}, {"$set": update})
#     doc = await db.users.find_one({"_id": ObjectId(current.id)})
#     return _user_public(User.from_mongo(doc))


# @router.post("/admin/login")
# async def admin_login(body: AdminLoginRequest):
#     doc = await db.users.find_one({"email": body.email, "is_admin": True})
#     if not doc or not doc.get("password_hash") or not verify_password(body.password, doc["password_hash"]):
#         raise HTTPException(status_code=401, detail="Invalid admin credentials")
#     user = User.from_mongo(doc)
#     token = create_token(user.id, True)
#     return {"token": token, "user": _user_public(user)}


import re
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from db import db
from models import (
    SendOtpRequest,
    VerifyOtpRequest,
    UpdateProfileRequest,
    AdminLoginRequest,
    User,
    now_utc,
    iso_now,
)
from auth_utils import (
    generate_otp,
    create_token,
    get_current_user,
    verify_password,
    OTP_TTL_SECONDS,
    DEV_MODE,
)

router = APIRouter(prefix="/auth", tags=["auth"])

PHONE_RE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(phone: str) -> str:
    """Strips all non-digit characters and normalizes phone numbers to a 10-digit standard."""
    digits = re.sub(r"\D", "", phone)
    return digits[-10:] if len(digits) >= 10 else digits


def _user_public(user: User) -> dict:
    return {
        "id": str(user.id),
        "phone": user.phone,
        "email": user.email,
        "name": user.name,
        "is_admin": user.is_admin,
    }


@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    phone = normalize_phone(body.phone)
    if not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")

    # Basic rate limiting: max 5 active OTP requests per phone
    recent = await db.otps.count_documents({"phone": phone})
    if recent >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    otp = generate_otp()
    expires_at = now_utc() + timedelta(seconds=OTP_TTL_SECONDS)
    await db.otps.insert_one(
        {
            "phone": phone,
            "otp": otp,
            "attempts": 0,
            "created_at": now_utc(),
            "expires_at": expires_at,
        }
    )

    resp = {"success": True, "message": f"OTP sent to +91 {phone}", "expires_in": OTP_TTL_SECONDS}
    if DEV_MODE:
        resp["dev_otp"] = otp
    return resp


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest):
    phone = normalize_phone(body.phone)
    
    # 1. Verify OTP Record
    record = await db.otps.find_one({"phone": phone}, sort=[("created_at", -1)])
    if not record:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many wrong attempts. Request a new OTP.")
    if record["otp"] != body.otp.strip():
        await db.otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    # 2. OTP correct — clear active OTPs for this phone number
    await db.otps.delete_many({"phone": phone})

    # 3. Persistent User Resolution
    doc = await db.users.find_one({"phone": phone})
    if not doc:
        user = User(phone=phone)
        res = await db.users.insert_one(user.to_mongo())
        doc = await db.users.find_one({"_id": res.inserted_id})
    
    user = User.from_mongo(doc)
    token = create_token(user.id, user.is_admin)
    return {"token": token, "user": _user_public(user)}


@router.get("/me")
async def me(current: User = Depends(get_current_user)):
    return _user_public(current)


@router.put("/profile")
async def update_profile(body: UpdateProfileRequest, current: User = Depends(get_current_user)):
    update = {}
    if body.name is not None:
        update["name"] = body.name
    if body.email is not None:
        update["email"] = body.email

    query_id = ObjectId(current.id) if ObjectId.is_valid(current.id) else current.id

    if update:
        await db.users.update_one({"_id": query_id}, {"$set": update})
    
    doc = await db.users.find_one({"_id": query_id})
    return _user_public(User.from_mongo(doc))


@router.post("/admin/login")
async def admin_login(body: AdminLoginRequest):
    doc = await db.users.find_one({"email": body.email, "is_admin": True})
    if not doc or not doc.get("password_hash") or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    user = User.from_mongo(doc)
    token = create_token(user.id, True)
    return {"token": token, "user": _user_public(user)}
