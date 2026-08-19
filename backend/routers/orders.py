import random
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from db import db
from models import CheckoutInput, User, iso_now
from auth_utils import get_current_user
from services import enrich_items, compute_totals

router = APIRouter(tags=["orders"])

STATUS_FLOW = [
    "Order Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
]


def _clean(d):
    d = dict(d)
    d["id"] = str(d.pop("_id"))
    return d


async def _generate_order_number() -> str:
    for _ in range(10):
        num = "SUN" + "".join(random.choices("0123456789", k=8))
        existing = await db.orders.find_one({"order_number": num})
        if not existing:
            return num
    return "SUN" + str(int(datetime.now().timestamp()))


@router.post("/checkout")
async def checkout(body: CheckoutInput, current: User = Depends(get_current_user)):
    # 1. Validate address
    address = await db.addresses.find_one({"_id": ObjectId(body.address_id), "user_id": current.id})
    if not address:
        raise HTTPException(status_code=400, detail="Please select a valid delivery address")

    # 2. Load & enrich cart
    cart = await db.carts.find_one({"user_id": current.id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty")
    enriched = await enrich_items(cart["items"])
    in_stock_items = [it for it in enriched if it["in_stock"]]
    if not in_stock_items:
        raise HTTPException(status_code=400, detail="Items in your cart are out of stock")

    # 3. Compute totals server-side (never trust client)
    coupon_code = body.coupon_code or cart.get("coupon_code")
    totals = await compute_totals(enriched, coupon_code, current.id)
    if totals["coupon_error"]:
        raise HTTPException(status_code=400, detail=totals["coupon_error"])

    # 4. Re-verify stock atomically & decrement
    for it in in_stock_items:
        pdoc = await db.products.find_one({"_id": ObjectId(it["product_id"])})
        variant = next((v for v in pdoc.get("variants", []) if v["id"] == it["variant_id"]), None)
        if not variant or variant.get("stock", 0) < it["quantity"]:
            raise HTTPException(
                status_code=409,
                detail=f"{it['name']} ({it['weight']}) stock changed. Please review your cart.",
            )

    for it in in_stock_items:
        await db.products.update_one(
            {"_id": ObjectId(it["product_id"]), "variants.id": it["variant_id"]},
            {"$inc": {"variants.$.stock": -it["quantity"]}},
        )

    # 5. Create order
    order_number = await _generate_order_number()
    eta = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%d %b %Y")
    addr_clean = _clean(address)
    payment_status = "pending" if body.payment_method == "cod" else "pending"
    order_doc = {
        "order_number": order_number,
        "user_id": current.id,
        "items": in_stock_items,
        "address": addr_clean,
        "subtotal": totals["subtotal"],
        "discount": totals["product_discount"] + totals["coupon_discount"],
        "coupon_discount": totals["coupon_discount"],
        "coupon_code": totals["coupon_code"],
        "shipping": totals["shipping"],
        "tax": totals["tax"],
        "total": totals["total"],
        "payment_method": body.payment_method,
        "payment_status": payment_status,
        "status": "Order Placed",
        "status_history": [{"status": "Order Placed", "at": iso_now()}],
        "estimated_delivery": eta,
        "created_at": iso_now(),
    }
    res = await db.orders.insert_one(order_doc)

    # 6. Record coupon usage
    if totals["coupon_code"]:
        await db.coupons.update_one({"code": totals["coupon_code"]}, {"$inc": {"used_count": 1}})
        await db.coupon_usage.insert_one(
            {"coupon_code": totals["coupon_code"], "user_id": current.id, "order_id": str(res.inserted_id), "at": iso_now()}
        )

    # 7. Clear cart
    await db.carts.update_one(
        {"user_id": current.id}, {"$set": {"items": []}, "$unset": {"coupon_code": ""}}
    )

    doc = await db.orders.find_one({"_id": res.inserted_id})
    return _clean(doc)


@router.get("/orders")
async def list_orders(current: User = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": current.id}).sort("created_at", -1).to_list(100)
    return [_clean(d) for d in docs]


@router.get("/orders/{order_id}")
async def get_order(order_id: str, current: User = Depends(get_current_user)):
    try:
        doc = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": current.id})
    except Exception:
        doc = None
    if not doc:
        # try order_number
        doc = await db.orders.find_one({"order_number": order_id, "user_id": current.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    order = _clean(doc)
    order["status_flow"] = STATUS_FLOW
    return order


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current: User = Depends(get_current_user)):
    doc = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": current.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["status"] in ("Shipped", "Out for Delivery", "Delivered", "Cancelled"):
        raise HTTPException(status_code=400, detail=f"Order cannot be cancelled once {doc['status']}")
    # restore stock
    for it in doc.get("items", []):
        await db.products.update_one(
            {"_id": ObjectId(it["product_id"]), "variants.id": it["variant_id"]},
            {"$inc": {"variants.$.stock": it["quantity"]}},
        )
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {"status": "Cancelled"},
            "$push": {"status_history": {"status": "Cancelled", "at": iso_now()}},
        },
    )
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    return _clean(doc)
