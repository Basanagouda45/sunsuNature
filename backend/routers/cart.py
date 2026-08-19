from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from db import db
from models import CartItemInput, UpdateQtyInput, WishlistInput, User
from auth_utils import get_current_user
from services import enrich_items, compute_totals

router = APIRouter(tags=["cart"])


async def _get_or_create_cart(user_id: str) -> dict:
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        cart = {"user_id": user_id, "items": []}
        await db.carts.insert_one(cart)
    return cart


async def _cart_response(user_id: str, coupon_code=None):
    cart = await _get_or_create_cart(user_id)
    enriched = await enrich_items(cart.get("items", []))
    if coupon_code is None:
        coupon_code = cart.get("coupon_code")
    totals = await compute_totals(enriched, coupon_code, user_id)
    # if coupon became invalid, drop it
    if totals["coupon_error"] and cart.get("coupon_code"):
        await db.carts.update_one({"user_id": user_id}, {"$unset": {"coupon_code": ""}})
    return {"items": enriched, "totals": totals}


@router.get("/cart")
async def get_cart(current: User = Depends(get_current_user)):
    return await _cart_response(current.id)


@router.post("/cart/items")
async def add_to_cart(body: CartItemInput, current: User = Depends(get_current_user)):
    if body.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    pdoc = await db.products.find_one({"_id": ObjectId(body.product_id)})
    if not pdoc:
        raise HTTPException(status_code=404, detail="Product not found")
    variant = next((v for v in pdoc.get("variants", []) if v["id"] == body.variant_id), None)
    if not variant:
        raise HTTPException(status_code=400, detail="Selected variant is unavailable")
    if variant.get("stock", 0) < 1:
        raise HTTPException(status_code=400, detail="This item is out of stock")

    cart = await _get_or_create_cart(current.id)
    items = cart.get("items", [])
    existing = next(
        (i for i in items if i["product_id"] == body.product_id and i["variant_id"] == body.variant_id),
        None,
    )
    new_qty = (existing["quantity"] if existing else 0) + body.quantity
    if new_qty > variant["stock"]:
        raise HTTPException(status_code=400, detail=f"Only {variant['stock']} in stock")
    if existing:
        existing["quantity"] = new_qty
    else:
        items.append({"product_id": body.product_id, "variant_id": body.variant_id, "quantity": body.quantity})
    await db.carts.update_one({"user_id": current.id}, {"$set": {"items": items}})
    return await _cart_response(current.id)


@router.put("/cart/items")
async def update_qty(body: UpdateQtyInput, current: User = Depends(get_current_user)):
    cart = await _get_or_create_cart(current.id)
    items = cart.get("items", [])
    if body.quantity <= 0:
        items = [i for i in items if not (i["product_id"] == body.product_id and i["variant_id"] == body.variant_id)]
    else:
        item = next(
            (i for i in items if i["product_id"] == body.product_id and i["variant_id"] == body.variant_id), None
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item not in cart")
        pdoc = await db.products.find_one({"_id": ObjectId(body.product_id)})
        variant = next((v for v in (pdoc.get("variants", []) if pdoc else []) if v["id"] == body.variant_id), None)
        if variant and body.quantity > variant.get("stock", 0):
            raise HTTPException(status_code=400, detail=f"Only {variant['stock']} in stock")
        item["quantity"] = body.quantity
    await db.carts.update_one({"user_id": current.id}, {"$set": {"items": items}})
    return await _cart_response(current.id)


@router.delete("/cart/items")
async def remove_item(product_id: str, variant_id: str, current: User = Depends(get_current_user)):
    cart = await _get_or_create_cart(current.id)
    items = [
        i for i in cart.get("items", []) if not (i["product_id"] == product_id and i["variant_id"] == variant_id)
    ]
    await db.carts.update_one({"user_id": current.id}, {"$set": {"items": items}})
    return await _cart_response(current.id)


@router.delete("/cart")
async def clear_cart(current: User = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current.id}, {"$set": {"items": []}, "$unset": {"coupon_code": ""}}
    )
    return await _cart_response(current.id)


@router.post("/cart/merge")
async def merge_cart(items: list[CartItemInput], current: User = Depends(get_current_user)):
    """Merge guest cart (stored locally) into server cart on login."""
    cart = await _get_or_create_cart(current.id)
    server_items = cart.get("items", [])
    for gi in items:
        existing = next(
            (i for i in server_items if i["product_id"] == gi.product_id and i["variant_id"] == gi.variant_id),
            None,
        )
        if existing:
            existing["quantity"] += gi.quantity
        else:
            server_items.append(
                {"product_id": gi.product_id, "variant_id": gi.variant_id, "quantity": gi.quantity}
            )
    await db.carts.update_one({"user_id": current.id}, {"$set": {"items": server_items}})
    return await _cart_response(current.id)


# ---------------- Wishlist ----------------
@router.get("/wishlist")
async def get_wishlist(current: User = Depends(get_current_user)):
    wl = await db.wishlists.find_one({"user_id": current.id})
    ids = wl.get("product_ids", []) if wl else []
    obj_ids = []
    for pid in ids:
        try:
            obj_ids.append(ObjectId(pid))
        except Exception:
            pass
    docs = await db.products.find({"_id": {"$in": obj_ids}}).to_list(200)

    def clean(d):
        d = dict(d)
        d["id"] = str(d.pop("_id"))
        return d

    return {"product_ids": ids, "products": [clean(d) for d in docs]}


@router.post("/wishlist")
async def toggle_wishlist(body: WishlistInput, current: User = Depends(get_current_user)):
    wl = await db.wishlists.find_one({"user_id": current.id})
    if not wl:
        wl = {"user_id": current.id, "product_ids": []}
        await db.wishlists.insert_one(wl)
    ids = wl.get("product_ids", [])
    if body.product_id in ids:
        ids.remove(body.product_id)
        added = False
    else:
        ids.append(body.product_id)
        added = True
    await db.wishlists.update_one({"user_id": current.id}, {"$set": {"product_ids": ids}})
    return {"added": added, "product_ids": ids}
