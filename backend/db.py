import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


async def ensure_indexes():
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index([("name", "text"), ("description", "text"), ("ingredients_text", "text")])
    await db.categories.create_index("slug", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("order_number", unique=True)
    await db.carts.create_index("user_id", unique=True)
    await db.wishlists.create_index("user_id", unique=True)
    await db.addresses.create_index("user_id")
    await db.reviews.create_index("product_id")
    await db.otps.create_index("expires_at", expireAfterSeconds=0)
