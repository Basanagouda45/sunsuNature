# from bson import ObjectId
# from fastapi import APIRouter, Depends, HTTPException

# from db import db
# from models import AddressInput, ApplyCouponInput, User
# from auth_utils import get_current_user
# from services import enrich_items, compute_totals

# router = APIRouter(tags=["commerce"])


# def _clean(d):
#     d = dict(d)
#     d["id"] = str(d.pop("_id"))
#     return d


# # ---------------- Coupons ----------------
# @router.get("/coupons")
# async def list_coupons():
#     docs = await db.coupons.find({"is_active": True}).to_list(100)
#     out = []
#     for d in docs:
#         out.append(
#             {
#                 "code": d["code"],
#                 "description": d.get("description"),
#                 "discount_type": d["discount_type"],
#                 "discount_value": d["discount_value"],
#                 "min_order": d.get("min_order", 0),
#                 "max_discount": d.get("max_discount"),
#             }
#         )
#     return out


# @router.post("/cart/apply-coupon")
# async def apply_coupon(body: ApplyCouponInput, current: User = Depends(get_current_user)):
#     code = body.code.strip().upper()
#     coupon = await db.coupons.find_one({"code": code})
#     if not coupon:
#         raise HTTPException(status_code=404, detail="Invalid coupon code")

#     cart = await db.carts.find_one({"user_id": current.id})
#     enriched = await enrich_items(cart.get("items", []) if cart else [])
#     totals = await compute_totals(enriched, code, current.id)
#     if totals["coupon_error"]:
#         raise HTTPException(status_code=400, detail=totals["coupon_error"])

#     await db.carts.update_one({"user_id": current.id}, {"$set": {"coupon_code": code}})
#     return {"items": enriched, "totals": totals}


# @router.delete("/cart/coupon")
# async def remove_coupon(current: User = Depends(get_current_user)):
#     await db.carts.update_one({"user_id": current.id}, {"$unset": {"coupon_code": ""}})
#     cart = await db.carts.find_one({"user_id": current.id})
#     enriched = await enrich_items(cart.get("items", []) if cart else [])
#     totals = await compute_totals(enriched, None, current.id)
#     return {"items": enriched, "totals": totals}


# # ---------------- Addresses ----------------
# @router.get("/addresses")
# async def list_addresses(current: User = Depends(get_current_user)):
#     docs = await db.addresses.find({"user_id": current.id}).sort("is_default", -1).to_list(50)
#     return [_clean(d) for d in docs]


# @router.post("/addresses")
# async def add_address(body: AddressInput, current: User = Depends(get_current_user)):
#     import re

#     if not re.match(r"^\d{6}$", body.pincode):
#         raise HTTPException(status_code=400, detail="Enter a valid 6-digit PIN code")
#     if not re.match(r"^[6-9]\d{9}$", body.mobile.replace("+91", "").strip()):
#         raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")

#     data = body.model_dump()
#     data["user_id"] = current.id
#     from models import iso_now

#     data["created_at"] = iso_now()
#     existing_count = await db.addresses.count_documents({"user_id": current.id})
#     if existing_count == 0:
#         data["is_default"] = True
#     if data.get("is_default"):
#         await db.addresses.update_many({"user_id": current.id}, {"$set": {"is_default": False}})
#     res = await db.addresses.insert_one(data)
#     doc = await db.addresses.find_one({"_id": res.inserted_id})
#     return _clean(doc)


# @router.put("/addresses/{address_id}")
# async def update_address(address_id: str, body: AddressInput, current: User = Depends(get_current_user)):
#     addr = await db.addresses.find_one({"_id": ObjectId(address_id), "user_id": current.id})
#     if not addr:
#         raise HTTPException(status_code=404, detail="Address not found")
#     data = body.model_dump()
#     if data.get("is_default"):
#         await db.addresses.update_many({"user_id": current.id}, {"$set": {"is_default": False}})
#     await db.addresses.update_one({"_id": ObjectId(address_id)}, {"$set": data})
#     doc = await db.addresses.find_one({"_id": ObjectId(address_id)})
#     return _clean(doc)


# @router.delete("/addresses/{address_id}")
# async def delete_address(address_id: str, current: User = Depends(get_current_user)):
#     res = await db.addresses.delete_one({"_id": ObjectId(address_id), "user_id": current.id})
#     if res.deleted_count == 0:
#         raise HTTPException(status_code=404, detail="Address not found")
#     # ensure a default exists
#     remaining = await db.addresses.find({"user_id": current.id}).to_list(50)
#     if remaining and not any(a.get("is_default") for a in remaining):
#         await db.addresses.update_one({"_id": remaining[0]["_id"]}, {"$set": {"is_default": True}})
#     return {"success": True}


# @router.put("/addresses/{address_id}/default")
# async def set_default_address(address_id: str, current: User = Depends(get_current_user)):
#     addr = await db.addresses.find_one({"_id": ObjectId(address_id), "user_id": current.id})
#     if not addr:
#         raise HTTPException(status_code=404, detail="Address not found")
#     await db.addresses.update_many({"user_id": current.id}, {"$set": {"is_default": False}})
#     await db.addresses.update_one({"_id": ObjectId(address_id)}, {"$set": {"is_default": True}})
#     return {"success": True}


import re
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from db import db
from models import AddressInput, ApplyCouponInput, User, iso_now
from auth_utils import get_current_user
from services import enrich_items, compute_totals

router = APIRouter(tags=["commerce"])


def _clean(d: dict) -> dict:
    """Helper to convert MongoDB _id to string for clean JSON responses."""
    if not d:
        return {}
    d = dict(d)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d


def _to_object_id(id_str: str) -> ObjectId:
    """Safely cast string to ObjectId, raising 400 on invalid format."""
    if not ObjectId.is_valid(id_str):
        raise HTTPException(status_code=400, detail="Invalid address ID format")
    return ObjectId(id_str)


# ---------------- Coupons ----------------
@router.get("/coupons")
async def list_coupons():
    docs = await db.coupons.find({"is_active": True}).to_list(100)
    out = []
    for d in docs:
        out.append(
            {
                "code": d["code"],
                "description": d.get("description"),
                "discount_type": d["discount_type"],
                "discount_value": d["discount_value"],
                "min_order": d.get("min_order", 0),
                "max_discount": d.get("max_discount"),
            }
        )
    return out


@router.post("/cart/apply-coupon")
async def apply_coupon(body: ApplyCouponInput, current: User = Depends(get_current_user)):
    user_id = str(current.id)
    code = body.code.strip().upper()
    
    coupon = await db.coupons.find_one({"code": code})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")

    cart = await db.carts.find_one({"user_id": user_id})
    enriched = await enrich_items(cart.get("items", []) if cart else [])
    totals = await compute_totals(enriched, code, user_id)
    if totals["coupon_error"]:
        raise HTTPException(status_code=400, detail=totals["coupon_error"])

    await db.carts.update_one({"user_id": user_id}, {"$set": {"coupon_code": code}})
    return {"items": enriched, "totals": totals}


@router.delete("/cart/coupon")
async def remove_coupon(current: User = Depends(get_current_user)):
    user_id = str(current.id)
    await db.carts.update_one({"user_id": user_id}, {"$unset": {"coupon_code": ""}})
    
    cart = await db.carts.find_one({"user_id": user_id})
    enriched = await enrich_items(cart.get("items", []) if cart else [])
    totals = await compute_totals(enriched, None, user_id)
    return {"items": enriched, "totals": totals}


# ---------------- Addresses ----------------
@router.get("/addresses")
async def list_addresses(current: User = Depends(get_current_user)):
    user_id = str(current.id)
    docs = await db.addresses.find({"user_id": user_id}).sort("is_default", -1).to_list(50)
    return [_clean(d) for d in docs]


@router.post("/addresses")
async def add_address(body: AddressInput, current: User = Depends(get_current_user)):
    user_id = str(current.id)

    if not re.match(r"^\d{6}$", body.pincode):
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit PIN code")
    if not re.match(r"^[6-9]\d{9}$", body.mobile.replace("+91", "").strip()):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")

    data = body.model_dump()
    data["user_id"] = user_id
    data["created_at"] = iso_now()

    # Check if this is the user's first address
    existing_count = await db.addresses.count_documents({"user_id": user_id})
    if existing_count == 0:
        data["is_default"] = True

    # Reset default flags if this new address is set as default
    if data.get("is_default"):
        await db.addresses.update_many({"user_id": user_id}, {"$set": {"is_default": False}})

    res = await db.addresses.insert_one(data)
    doc = await db.addresses.find_one({"_id": res.inserted_id})
    return _clean(doc)


@router.put("/addresses/{address_id}")
async def update_address(address_id: str, body: AddressInput, current: User = Depends(get_current_user)):
    user_id = str(current.id)
    obj_id = _to_object_id(address_id)

    addr = await db.addresses.find_one({"_id": obj_id, "user_id": user_id})
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    data = body.model_dump()
    data["user_id"] = user_id  # Ensure user_id is never overwritten or removed

    if data.get("is_default"):
        await db.addresses.update_many({"user_id": user_id}, {"$set": {"is_default": False}})

    await db.addresses.update_one({"_id": obj_id}, {"$set": data})
    doc = await db.addresses.find_one({"_id": obj_id})
    return _clean(doc)


@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current: User = Depends(get_current_user)):
    user_id = str(current.id)
    obj_id = _to_object_id(address_id)

    res = await db.addresses.delete_one({"_id": obj_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")

    # Ensure at least one remaining address is marked as default
    remaining = await db.addresses.find({"user_id": user_id}).to_list(50)
    if remaining and not any(a.get("is_default") for a in remaining):
        await db.addresses.update_one({"_id": remaining[0]["_id"]}, {"$set": {"is_default": True}})

    return {"success": True}


@router.put("/addresses/{address_id}/default")
async def set_default_address(address_id: str, current: User = Depends(get_current_user)):
    user_id = str(current.id)
    obj_id = _to_object_id(address_id)

    addr = await db.addresses.find_one({"_id": obj_id, "user_id": user_id})
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    await db.addresses.update_many({"user_id": user_id}, {"$set": {"is_default": False}})
    await db.addresses.update_one({"_id": obj_id}, {"$set": {"is_default": True}})
    return {"success": True}