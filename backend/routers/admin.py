from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from db import db
from models import Product, Category, Banner, Coupon, User, UpdateOrderStatusInput, iso_now
from auth_utils import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


def _clean(d):
    d = dict(d)
    d["id"] = str(d.pop("_id"))
    return d


@router.get("/dashboard")
async def dashboard(admin: User = Depends(get_current_admin)):
    orders = await db.orders.find().to_list(2000)
    paid_orders = [o for o in orders if o.get("status") != "Cancelled"]
    revenue = sum(o.get("total", 0) for o in paid_orders)
    total_orders = len(orders)
    customers = await db.users.count_documents({"is_admin": {"$ne": True}})
    products = await db.products.count_documents({})
    aov = round(revenue / len(paid_orders), 2) if paid_orders else 0

    # best sellers
    counts = {}
    for o in paid_orders:
        for it in o.get("items", []):
            counts[it["name"]] = counts.get(it["name"], 0) + it["quantity"]
    best = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

    low_stock = []
    async for p in db.products.find({}):
        for v in p.get("variants", []):
            if v.get("stock", 0) <= 10:
                low_stock.append({"name": p["name"], "weight": v["weight"], "stock": v["stock"]})

    return {
        "revenue": round(revenue, 2),
        "total_orders": total_orders,
        "customers": customers,
        "products": products,
        "average_order_value": aov,
        "best_sellers": [{"name": n, "units": c} for n, c in best],
        "low_stock": low_stock[:10],
    }


# ---------------- Products ----------------
@router.post("/products")
async def create_product(product: Product, admin: User = Depends(get_current_admin)):
    product.ingredients_text = ", ".join(product.ingredients)
    res = await db.products.insert_one(product.to_mongo())
    return _clean(await db.products.find_one({"_id": res.inserted_id}))


@router.put("/products/{product_id}")
async def update_product(product_id: str, product: Product, admin: User = Depends(get_current_admin)):
    data = product.to_mongo()
    data.pop("_id", None)
    data["ingredients_text"] = ", ".join(product.ingredients)
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": data})
    return _clean(await db.products.find_one({"_id": ObjectId(product_id)}))


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_current_admin)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"success": True}


# ---------------- Orders ----------------
@router.get("/orders")
async def admin_orders(status: str = None, admin: User = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    docs = await db.orders.find(query).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.get("/orders/{order_id}")
async def admin_order_detail(order_id: str, admin: User = Depends(get_current_admin)):
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    order = _clean(doc)
    order["status_flow"] = ["Order Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"]
    return order


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: UpdateOrderStatusInput, admin: User = Depends(get_current_admin)):
    update = {"status": body.status}
    if body.tracking_number:
        update["tracking_number"] = body.tracking_number
    if body.status == "Delivered":
        update["payment_status"] = "paid"
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update, "$push": {"status_history": {"status": body.status, "at": iso_now()}}},
    )
    return _clean(await db.orders.find_one({"_id": ObjectId(order_id)}))


# ---------------- Customers ----------------
@router.get("/customers")
async def admin_customers(admin: User = Depends(get_current_admin)):
    docs = await db.users.find({"is_admin": {"$ne": True}}).to_list(1000)
    out = []
    for d in docs:
        uid = str(d["_id"])
        orders = await db.orders.find({"user_id": uid}).to_list(500)
        spend = sum(o.get("total", 0) for o in orders if o.get("status") != "Cancelled")
        out.append(
            {
                "id": uid,
                "name": d.get("name"),
                "phone": d.get("phone"),
                "email": d.get("email"),
                "order_count": len(orders),
                "total_spend": round(spend, 2),
                "is_active": d.get("is_active", True),
            }
        )
    return out


# ---------------- Coupons ----------------
@router.get("/coupons")
async def admin_coupons(admin: User = Depends(get_current_admin)):
    return [_clean(d) for d in await db.coupons.find().to_list(200)]


@router.post("/coupons")
async def create_coupon(coupon: Coupon, admin: User = Depends(get_current_admin)):
    coupon.code = coupon.code.upper()
    existing = await db.coupons.find_one({"code": coupon.code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    res = await db.coupons.insert_one(coupon.to_mongo())
    return _clean(await db.coupons.find_one({"_id": res.inserted_id}))


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin: User = Depends(get_current_admin)):
    await db.coupons.delete_one({"_id": ObjectId(coupon_id)})
    return {"success": True}


# ---------------- Banners ----------------
@router.post("/banners")
async def create_banner(banner: Banner, admin: User = Depends(get_current_admin)):
    res = await db.banners.insert_one(banner.to_mongo())
    return _clean(await db.banners.find_one({"_id": res.inserted_id}))


@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: User = Depends(get_current_admin)):
    await db.banners.delete_one({"_id": ObjectId(banner_id)})
    return {"success": True}
