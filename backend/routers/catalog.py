import re
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from db import db
from models import Product, Category, Banner, Review, ReviewCreate, User
from auth_utils import get_current_user

router = APIRouter(tags=["catalog"])


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------- Categories ----------------
@router.get("/categories")
async def list_categories():
    docs = await db.categories.find({"is_active": True}).sort("sort_order", 1).to_list(200)
    return [_clean(d) for d in docs]


# ---------------- Banners / Offers ----------------
@router.get("/banners")
async def list_banners():
    docs = await db.banners.find({"is_active": True}).sort("sort_order", 1).to_list(50)
    return [_clean(d) for d in docs]


@router.get("/offers")
async def list_offers():
    docs = await db.offers.find({"is_active": True}).sort("sort_order", 1).to_list(50)
    return [_clean(d) for d in docs]


# ---------------- Settings ----------------
@router.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"key": "app"})
    if not doc:
        return {}
    doc.pop("_id", None)
    return doc.get("value", {})


# ---------------- Products ----------------
@router.get("/products")
async def list_products(
    category: Optional[str] = None,
    need: Optional[str] = None,
    dietary: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock: Optional[bool] = None,
    best_seller: Optional[bool] = None,
    is_new: Optional[bool] = None,
    search: Optional[str] = None,
    sort: str = "recommended",
    limit: int = Query(50, le=100),
    skip: int = 0,
):
    query: dict = {"is_active": True}
    if category:
        query["category_slug"] = category
    if need:
        query["needs"] = need
    if dietary:
        query["dietary"] = dietary
    if best_seller:
        query["is_best_seller"] = True
    if is_new:
        query["is_new"] = True
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if search:
        regex = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [
            {"name": regex},
            {"short_description": regex},
            {"ingredients_text": regex},
            {"category_name": regex},
            {"needs": regex},
        ]

    docs = await db.products.find(query).to_list(500)
    products = [_clean(d) for d in docs]

    # price filters based on min variant price
    def base_price(p):
        prices = [v["price"] for v in p.get("variants", [])]
        return min(prices) if prices else 0

    if min_price is not None:
        products = [p for p in products if base_price(p) >= min_price]
    if max_price is not None:
        products = [p for p in products if base_price(p) <= max_price]
    if in_stock:
        products = [p for p in products if any(v.get("stock", 0) > 0 for v in p.get("variants", []))]

    if sort == "price_asc":
        products.sort(key=base_price)
    elif sort == "price_desc":
        products.sort(key=base_price, reverse=True)
    elif sort == "rating":
        products.sort(key=lambda p: p.get("rating", 0), reverse=True)
    elif sort == "newest":
        products.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    elif sort == "best_selling":
        products.sort(key=lambda p: (p.get("is_best_seller", False), p.get("review_count", 0)), reverse=True)
    else:  # recommended
        products.sort(key=lambda p: p.get("sort_order", 0))

    total = len(products)
    return {"total": total, "products": products[skip : skip + limit]}


@router.get("/products/search-suggestions")
async def search_suggestions(q: str = Query(..., min_length=1)):
    regex = {"$regex": re.escape(q), "$options": "i"}
    docs = await db.products.find(
        {"is_active": True, "$or": [{"name": regex}, {"ingredients_text": regex}, {"needs": regex}]}
    ).limit(6).to_list(6)
    return [{"id": str(d["_id"]), "name": d["name"], "slug": d["slug"], "image": (d.get("images") or [None])[0]} for d in docs]


@router.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug})
    if not doc:
        # try by id
        try:
            doc = await db.products.find_one({"_id": ObjectId(slug)})
        except Exception:
            doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    product = _clean(doc)
    # related products (same category)
    related_docs = await db.products.find(
        {"is_active": True, "category_slug": product["category_slug"], "_id": {"$ne": ObjectId(product["id"])}}
    ).limit(6).to_list(6)
    product["related"] = [_clean(d) for d in related_docs]
    return product


# ---------------- Reviews ----------------
@router.get("/products/{product_id}/reviews")
async def get_reviews(product_id: str):
    docs = await db.reviews.find({"product_id": product_id}).sort("created_at", -1).to_list(100)
    reviews = [_clean(d) for d in docs]
    dist = {str(i): 0 for i in range(1, 6)}
    for r in reviews:
        dist[str(r["rating"])] = dist.get(str(r["rating"]), 0) + 1
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return {"reviews": reviews, "count": len(reviews), "average": avg, "distribution": dist}


@router.post("/products/{product_id}/reviews")
async def add_review(product_id: str, body: ReviewCreate, current: User = Depends(get_current_user)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    # verified purchase check
    delivered = await db.orders.find_one(
        {"user_id": current.id, "items.product_id": product_id}
    )
    review = Review(
        product_id=product_id,
        user_id=current.id,
        user_name=current.name or "SUNSU Customer",
        rating=body.rating,
        title=body.title,
        comment=body.comment,
        verified_purchase=bool(delivered),
    )
    await db.reviews.insert_one(review.to_mongo())
    # recompute product rating
    all_reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews), 1)
    await db.products.update_one(
        {"_id": ObjectId(product_id)}, {"$set": {"rating": avg, "review_count": len(all_reviews)}}
    )
    return {"success": True}


# ---------------- Location: PIN code ----------------
@router.get("/location/pincode/{pincode}")
async def check_pincode(pincode: str):
    if not re.match(r"^\d{6}$", pincode):
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit PIN code")
    # Static serviceability + simple city map for common metros
    city_map = {
        "560": "Bengaluru", "110": "New Delhi", "400": "Mumbai", "700": "Kolkata",
        "600": "Chennai", "500": "Hyderabad", "411": "Pune", "380": "Ahmedabad",
        "302": "Jaipur", "226": "Lucknow", "641": "Coimbatore", "682": "Kochi",
    }
    prefix = pincode[:3]
    city = city_map.get(prefix, "Your area")
    from models import iso_now
    from datetime import timedelta, datetime, timezone

    eta = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%d %b")
    return {"pincode": pincode, "city": city, "serviceable": True, "estimated_delivery": eta}
