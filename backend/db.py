# import os
# from pathlib import Path
# from dotenv import load_dotenv
# from motor.motor_asyncio import AsyncIOMotorClient

# ROOT_DIR = Path(__file__).parent
# load_dotenv(ROOT_DIR / ".env")

# mongo_url = os.environ["MONGO_URL"]
# client = AsyncIOMotorClient(mongo_url)
# db = client[os.environ["DB_NAME"]]


# async def ensure_indexes():
#     await db.users.create_index("phone", unique=True, sparse=True)
#     await db.products.create_index("slug", unique=True)
#     await db.products.create_index([("name", "text"), ("description", "text"), ("ingredients_text", "text")])
#     await db.categories.create_index("slug", unique=True)
#     await db.coupons.create_index("code", unique=True)
#     await db.orders.create_index("user_id")
#     await db.orders.create_index("order_number", unique=True)
#     await db.carts.create_index("user_id", unique=True)
#     await db.wishlists.create_index("user_id", unique=True)
#     await db.addresses.create_index("user_id")
#     await db.reviews.create_index("product_id")
#     await db.otps.create_index("expires_at", expireAfterSeconds=0)


import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Use os.getenv to avoid KeyError if MONGO_URL isn't set
mongo_url = os.getenv("MONGO_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db_name = os.getenv("DB_NAME", "sunsu_db")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


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