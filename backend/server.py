import logging

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from db import client, ensure_indexes
from seed import run_seed
from routers import auth as auth_router
from routers import catalog as catalog_router
from routers import cart as cart_router
from routers import commerce as commerce_router
from routers import orders as orders_router
from routers import admin as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("sunsu")

app = FastAPI(title="SUNSU API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "SUNSU API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(api_router)
app.include_router(auth_router.router, prefix="/api")
app.include_router(catalog_router.router, prefix="/api")
app.include_router(cart_router.router, prefix="/api")
app.include_router(commerce_router.router, prefix="/api")
app.include_router(orders_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await ensure_indexes()
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
    await run_seed()
    logger.info("SUNSU API started and seeded")


@app.on_event("shutdown")
async def shutdown():
    client.close()
