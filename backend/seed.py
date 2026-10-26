


"""Idempotent seed data for SUNSU. Runs on startup."""
import os

from db import db
from models import iso_now
from auth_utils import hash_password

# Base URL or static route where your frontend assets are hosted/served from the backend
# Change this:
# P = "https://sunsuofficial.com/assets/images"

# To this:
P = "https://sunsunature-3.onrender.com/assets"

CATEGORIES = [
    {"slug": "fruit-powders", "name": "Fruit Powders", "image": f"{P}/berry-14.png", "accent": "#E65100", "sort_order": 1},
    {"slug": "vegetable-powders", "name": "Vegetable Powders", "image": f"{P}/dig-11.png", "accent": "#15803D", "sort_order": 2},
    {"slug": "wellness-blends", "name": "Wellness Blends", "image": f"{P}/bery.png", "accent": "#B45309", "sort_order": 3},
    {"slug": "energy-mixes", "name": "Energy Mixes", "image": f"{P}/choc.png", "accent": "#C2410C", "sort_order": 4},
    {"slug": "immunity", "name": "Immunity", "image": f"{P}/dig.png", "accent": "#CA8A04", "sort_order": 5},
]

BANNERS = [
    {"title": "Goodness, Preserved.", "subtitle": "Real fruit, carefully dehydrated into everyday nutrition.", "cta_text": "Shop Now", "cta_target": "shop", "image": f"{P}/new-1.png", "accent": "#15803D", "sort_order": 1, "is_active": True},
    {"title": "Nutrition Made Delicious.", "subtitle": "Fruit-forward blends for energy, immunity & glow.", "cta_text": "Explore Blends", "cta_target": "category/wellness-blends", "image": f"{P}/new-2.png", "accent": "#E65100", "sort_order": 2, "is_active": True},
    {"title": "Your Daily Dose of Natural Goodness.", "subtitle": "Free shipping on orders above ₹999.", "cta_text": "Shop Best Sellers", "cta_target": "shop", "image": f"{P}/logo.png", "accent": "#B45309", "sort_order": 3, "is_active": True},
]

OFFERS = [
    {"title": "10% OFF your first order", "subtitle": "Use code WELCOME10", "code": "WELCOME10", "sort_order": 1, "is_active": True},
    {"title": "Free shipping above ₹999", "subtitle": "Auto-applied at checkout", "code": None, "sort_order": 2, "is_active": True},
    {"title": "Flat 20% OFF above ₹799", "subtitle": "Use code SUNSU20", "code": "SUNSU20", "sort_order": 3, "is_active": True},
]

COUPONS = [
    {"code": "WELCOME10", "description": "10% off your order (up to ₹100)", "discount_type": "percentage", "discount_value": 10, "min_order": 0, "max_discount": 100, "is_active": True, "used_count": 0},
    {"code": "FIRST50", "description": "Flat ₹50 off on orders above ₹499", "discount_type": "fixed", "discount_value": 50, "min_order": 499, "is_active": True, "used_count": 0},
    {"code": "SUNSU20", "description": "20% off on orders above ₹799 (up to ₹200)", "discount_type": "percentage", "discount_value": 20, "min_order": 799, "max_discount": 200, "is_active": True, "used_count": 0},
]

SETTINGS = {
    "key": "app",
    "value": {
        "currency": "INR",
        "free_shipping_threshold": 999,
        "shipping_charge": 49,
        "support_email": "care@sunsu.in",
        "support_phone": "+91 90000 00000",
        "whatsapp": "+919000000000",
        "instagram": "https://instagram.com/sunsu",
        "trust_badges": [
            {"icon": "sun", "label": "Carefully Dehydrated"},
            {"icon": "check-circle", "label": "Quality Ingredients"},
            {"icon": "zap", "label": "Convenient Nutrition"},
            {"icon": "shield", "label": "Hygienically Packed"},
            {"icon": "heart", "label": "Everyday Wellness"},
        ],
    },
}


def _variants(base100, base250, base500, mrp_mult=1.18):
    return [
        {"id": "v100", "weight": "100g", "price": base100, "mrp": round(base100 * mrp_mult), "stock": 120},
        {"id": "v250", "weight": "250g", "price": base250, "mrp": round(base250 * mrp_mult), "stock": 80},
        {"id": "v500", "weight": "500g", "price": base500, "mrp": round(base500 * mrp_mult), "stock": 40},
    ]


def _nutrition(cal, protein, carbs, fiber, sugar):
    return [
        {"label": "Energy", "value": f"{cal} kcal"},
        {"label": "Protein", "value": f"{protein} g"},
        {"label": "Carbohydrates", "value": f"{carbs} g"},
        {"label": "Dietary Fiber", "value": f"{fiber} g"},
        {"label": "Total Sugars", "value": f"{sugar} g"},
    ]


HOW_TO_USE = [
    "Add 1-2 tsp to your morning smoothie",
    "Blend into milk or plant-based drinks",
    "Stir into water for a quick refreshment",
    "Sprinkle over breakfast bowls & yogurt",
]


def _product(slug, name, tagline, short, desc, cat_slug, cat_name, needs, dietary, ingredients, images, variants, nutrition, benefits, rating, reviews, best=False, new=False, order=0, allergen="Made in a facility that also processes tree nuts.", faqs=None):
    return {
        "slug": slug, "name": name, "tagline": tagline, "short_description": short,
        "description": desc, "category_slug": cat_slug, "category_name": cat_name,
        "needs": needs, "dietary": dietary, "ingredients": ingredients,
        "ingredients_text": ", ".join(ingredients), "nutrition": nutrition, "benefits": benefits,
        "how_to_use": HOW_TO_USE, "storage": "Store in a cool, dry place away from direct sunlight. Reseal after use.",
        "shelf_life": "12 months from manufacture", "allergen_info": allergen,
        "faqs": faqs or [
            {"q": "Are there any added sugars or preservatives?", "a": "No. SUNSU powders are made only from real dehydrated ingredients with no added sugar, colours or preservatives."},
            {"q": "How is it made?", "a": "Fresh produce is gently dehydrated at low temperatures to preserve natural nutrients, then finely milled into powder."},
        ],
        "images": images, "variants": variants, "rating": rating, "review_count": reviews,
        "is_best_seller": best, "is_new": new, "is_active": True, "sort_order": order,
        "created_at": iso_now(),
    }


def build_products():
    return [
        _product(
            "mango-energy-mix", "Mango Energy Mix", "Mango • Banana • Cocoa • Dates",
            "A tropical, energising fruit blend for busy days.",
            "SUNSU Mango Energy Mix combines sun-ripened mango, banana, rich cocoa and dates into a naturally sweet, energising powder. A convenient way to enjoy fruit-based nutrition any time of day.",
            "energy-mixes", "Energy Mixes", ["energy", "workout"], ["Vegan", "Gluten-Free"],
            ["Mango", "Banana", "Cocoa", "Dates"],
            [f"{P}/mango/box-12.png", f"{P}/mango/box-15.png", f"{P}/mango/box-16.png",f"{P}/all/box-13.png"],
            _variants(299, 599, 999), _nutrition(372, 6.2, 78, 9, 42),
            ["Supports everyday energy", "Naturally sweet, no added sugar", "Rich in naturally occurring nutrients"],
            4.7, 214, best=True, order=1,
        ),
        _product(
            "tropical-pineapple-bliss", "Tropical Pineapple Bliss", "Pineapple • Coconut",
            "Sunny pineapple and creamy coconut in a glass.",
            "A bright, tropical duo of dehydrated pineapple and coconut. Tangy, refreshing and perfect for smoothies or a quick pick-me-up drink.",
            "fruit-powders", "Fruit Powders", ["daily-wellness", "skin-glow"], ["Vegan", "Gluten-Free"],
            ["Pineapple", "Coconut"],
            [f"{P}/pineapple/pineapple-11.png", f"{P}/pineapple/pineapple-12.png",f"{P}/pineapple/pineapple-13.png",f"{P}/all/box-14.png"],
            _variants(279, 549, 949), _nutrition(345, 3.1, 74, 8, 48),
            ["Refreshing tropical taste", "Contains naturally occurring nutrients", "Convenient fruit nutrition"],
            4.5, 156, best=True, new=True, order=2,
        ),
        _product(
            "natural-choco", "Natural Choco", "Banana • Dates • Cocoa • Coconut",
            "A guilt-free chocolatey treat, naturally.",
            "Naturally sweetened with banana and dates, blended with cocoa and coconut for a wholesome chocolate-style drink the whole family will love.",
            "energy-mixes", "Energy Mixes", ["energy", "daily-wellness"], ["Vegan", "Gluten-Free"],
            ["Banana", "Dates", "Cocoa", "Coconut"],
            [f"{P}/choco/choco-11.png", f"{P}/choco/choco-12.png",f"{P}/choco/choco-13.png",f"{P}/all/all-12.png"],
            _variants(329, 649, 1099), _nutrition(388, 5.5, 80, 10, 40),
            ["Naturally sweet chocolate taste", "No refined sugar", "Great for kids & adults"],
            4.8, 302, best=True, order=3,
        ),
        _product(
            "berry-wellness-blend", "Berry Wellness Blend", "Hibiscus • Strawberry • Coconut • Lemon",
            "A floral berry blend for daily glow.",
            "A delicate blend of hibiscus, strawberry, rose and lemon. Light, floral and refreshing — a beautiful everyday wellness ritual.",
            "wellness-blends", "Wellness Blends", ["immunity", "skin-glow"], ["Vegan", "Gluten-Free"],
            ["Hibiscus", "Strawberry", "Rose", "Lemon"],
            [f"{P}/berry/berry-14.png", f"{P}/berry/berry-13.png",f"{P}/berry/berry-11.png",f"{P}/all/all-14.png"],
            _variants(349, 699, 1199), _nutrition(310, 2.4, 68, 7, 36),
            ["Supports everyday wellness", "Naturally vibrant colour", "Light & refreshing"],
            4.6, 128, new=True, order=4,
        ),
        _product(
            "Nannari-Kush", "Nannari Kush", "Nannari root • Lemon • Coconut Water • Jaggery • Rose • Cardamom",
            "Pure beetroot for pre-workout & daily vigour.",
            "Single-origin beetroot, gently dehydrated and finely milled. An earthy, versatile powder loved before workouts and in everyday smoothies.",
            "vegetable-powders", "Vegetable Powders", ["energy", "workout", "immunity"], ["Vegan", "Gluten-Free", "Organic"],
            ["Beetroot"],
            [f"{P}/nannari/nannari-11.png", f"{P}/nannari/nannari-12.png",f"{P}/nannari/nannari-13.png",f"{P}/nannari/nannari-14.png"],
            _variants(259, 499, 849), _nutrition(330, 8.0, 66, 12, 44),
            ["Supports everyday stamina", "Single-ingredient purity", "Versatile in recipes"],
            4.4, 97, order=5,
        ),
        _product(
            "Digest-Mix", "Digest Mix", "Papaya • Ginger • Mint • Lemon",
            "Bright, tangy lemon in a spoon.",
            "Real dehydrated lemon milled into a fine, zesty powder. Add a burst of citrus to water, recipes and dressings instantly.",
            "immunity", "Immunity", ["immunity", "digestion"], ["Vegan", "Gluten-Free"],
            ["Lemon"],
            [f"{P}/digest/digest-11.png", f"{P}/digest/digest-12.png",f"{P}/digest/digest-13.png",f"{P}/digest/digest-14.png",],
            _variants(229, 449, 749), _nutrition(295, 3.8, 62, 11, 20),
            ["Bright citrus flavour", "Contains naturally occurring Vitamin C", "Convenient & long-lasting"],
            4.5, 141, order=6,
        ),
    ]


async def run_seed():
    await db.settings.update_one({"key": "app"}, {"$set": SETTINGS}, upsert=True)

    for c in COUPONS:
        await db.coupons.update_one({"code": c["code"]}, {"$setOnInsert": c}, upsert=True)

    if await db.categories.count_documents({}) == 0:
        for c in CATEGORIES:
            c["is_active"] = True
        await db.categories.insert_many(CATEGORIES)

    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_many(BANNERS)

    if await db.offers.count_documents({}) == 0:
        await db.offers.insert_many(OFFERS)

    if await db.products.count_documents({}) == 0:
        await db.products.insert_many(build_products())

    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email, "is_admin": True})
        if not existing:
            await db.users.insert_one(
                {
                    "email": admin_email,
                    "name": "SUNSU Admin",
                    "is_admin": True,
                    "is_active": True,
                    "password_hash": hash_password(admin_password),
                    "created_at": iso_now(),
                }
            )