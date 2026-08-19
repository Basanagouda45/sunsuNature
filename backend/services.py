"""Shared pricing / cart enrichment logic used by cart, coupons and checkout."""
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId

from db import db

FREE_SHIPPING_THRESHOLD = 999.0
SHIPPING_CHARGE = 49.0
GST_RATE = 0.0  # GST assumed inclusive in listed price


async def get_settings_value() -> dict:
    doc = await db.settings.find_one({"key": "app"})
    return (doc or {}).get("value", {}) if doc else {}


async def enrich_items(raw_items: List[dict]) -> List[dict]:
    """raw_items: [{product_id, variant_id, quantity}] -> enriched with live product data."""
    enriched = []
    for it in raw_items:
        try:
            pdoc = await db.products.find_one({"_id": ObjectId(it["product_id"])})
        except Exception:
            pdoc = None
        if not pdoc or not pdoc.get("is_active", True):
            continue
        variant = next((v for v in pdoc.get("variants", []) if v["id"] == it["variant_id"]), None)
        if not variant:
            continue
        stock = variant.get("stock", 0)
        qty = min(it["quantity"], stock) if stock > 0 else 0
        enriched.append(
            {
                "product_id": str(pdoc["_id"]),
                "slug": pdoc["slug"],
                "name": pdoc["name"],
                "image": (pdoc.get("images") or [None])[0],
                "category_slug": pdoc.get("category_slug"),
                "variant_id": variant["id"],
                "weight": variant["weight"],
                "price": variant["price"],
                "mrp": variant["mrp"],
                "quantity": it["quantity"],
                "available_stock": stock,
                "in_stock": stock > 0,
                "line_total": round(variant["price"] * it["quantity"], 2),
            }
        )
    return enriched


def _coupon_valid(coupon: dict, items: List[dict], subtotal: float, user_id: str, user_usage: int):
    """Returns (ok: bool, error: str|None, discount: float)."""
    if not coupon or not coupon.get("is_active", True):
        return False, "Invalid coupon code", 0.0

    expiry = coupon.get("expiry")
    if expiry:
        try:
            exp_dt = datetime.fromisoformat(expiry)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp_dt:
                return False, "This coupon has expired", 0.0
        except Exception:
            pass

    usage_limit = coupon.get("usage_limit")
    if usage_limit is not None and coupon.get("used_count", 0) >= usage_limit:
        return False, "This coupon has reached its usage limit", 0.0

    per_user = coupon.get("per_user_limit")
    if per_user is not None and user_usage >= per_user:
        return False, "You have already used this coupon", 0.0

    if subtotal < coupon.get("min_order", 0):
        return False, f"Minimum order value is ₹{int(coupon['min_order'])}", 0.0

    applicable_cats = coupon.get("applicable_categories", [])
    applicable_prods = coupon.get("applicable_products", [])
    eligible_subtotal = subtotal
    if applicable_cats or applicable_prods:
        eligible = [
            it
            for it in items
            if (it["category_slug"] in applicable_cats) or (it["product_id"] in applicable_prods)
        ]
        if not eligible:
            return False, "Coupon not applicable to these products", 0.0
        eligible_subtotal = sum(it["line_total"] for it in eligible)

    if coupon["discount_type"] == "percentage":
        discount = eligible_subtotal * (coupon["discount_value"] / 100.0)
        max_disc = coupon.get("max_discount")
        if max_disc:
            discount = min(discount, max_disc)
    else:
        discount = coupon["discount_value"]

    discount = round(min(discount, subtotal), 2)
    return True, None, discount


async def compute_totals(items: List[dict], coupon_code: Optional[str], user_id: Optional[str]):
    subtotal = round(sum(it["line_total"] for it in items if it["in_stock"]), 2)
    mrp_total = round(sum(it["mrp"] * it["quantity"] for it in items if it["in_stock"]), 2)
    product_discount = round(mrp_total - subtotal, 2)

    discount = 0.0
    coupon_error = None
    applied_code = None

    if coupon_code:
        coupon = await db.coupons.find_one({"code": coupon_code.upper()})
        user_usage = 0
        if user_id:
            user_usage = await db.coupon_usage.count_documents(
                {"coupon_code": coupon_code.upper(), "user_id": user_id}
            )
        ok, err, disc = _coupon_valid(coupon, items, subtotal, user_id, user_usage)
        if ok:
            discount = disc
            applied_code = coupon_code.upper()
        else:
            coupon_error = err

    settings = await get_settings_value()
    threshold = settings.get("free_shipping_threshold", FREE_SHIPPING_THRESHOLD)
    ship_charge = settings.get("shipping_charge", SHIPPING_CHARGE)

    after_discount = subtotal - discount
    shipping = 0.0 if (after_discount >= threshold or subtotal == 0) else ship_charge
    tax = round(after_discount * GST_RATE, 2)
    total = round(after_discount + shipping + tax, 2)

    return {
        "subtotal": subtotal,
        "mrp_total": mrp_total,
        "product_discount": product_discount,
        "coupon_discount": discount,
        "coupon_code": applied_code,
        "coupon_error": coupon_error,
        "shipping": shipping,
        "free_shipping_threshold": threshold,
        "tax": tax,
        "total": total,
        "item_count": sum(it["quantity"] for it in items if it["in_stock"]),
    }
