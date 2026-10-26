# import logging
# from contextlib import asynccontextmanager

# from fastapi import APIRouter, FastAPI
# from starlette.middleware.cors import CORSMiddleware

# from db import client, ensure_indexes
# from routers import admin as admin_router
# from routers import auth as auth_router
# from routers import cart as cart_router
# from routers import catalog as catalog_router
# from routers import commerce as commerce_router
# from routers import orders as orders_router
# from seed import run_seed

# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
# )
# logger = logging.getLogger("sunsu")


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup tasks
#     try:
#         await ensure_indexes()
#     except Exception as e:
#         logger.warning(f"Index creation warning: {e}")
#     await run_seed()
#     logger.info("SUNSU API started and seeded")

#     yield

#     # Shutdown tasks
#     client.close()


# app = FastAPI(title="SUNSU API", lifespan=lifespan)

# api_router = APIRouter(prefix="/api")


# @api_router.get("/")
# async def root():
#     return {"message": "SUNSU API", "status": "ok"}


# @api_router.get("/health")
# async def health():
#     return {"status": "healthy"}


# app.include_router(api_router)
# app.include_router(auth_router.router, prefix="/api")
# app.include_router(catalog_router.router, prefix="/api")
# app.include_router(cart_router.router, prefix="/api")
# app.include_router(commerce_router.router, prefix="/api")
# app.include_router(orders_router.router, prefix="/api")
# app.include_router(admin_router.router, prefix="/api")

# app.add_middleware(
#     CORSMiddleware,
#     allow_credentials=True,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)


import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from db import client, ensure_indexes
from routers import admin as admin_router
from routers import auth as auth_router
from routers import cart as cart_router
from routers import catalog as catalog_router
from routers import commerce as commerce_router
from routers import orders as orders_router
from seed import run_seed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("sunsu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    try:
        await ensure_indexes()
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
    await run_seed()
    logger.info("SUNSU API started and seeded")

    yield

    # Shutdown tasks
    client.close()


app = FastAPI(title="SUNSU API", lifespan=lifespan)

# ➡️ Mount static files directory so images are served at /assets/...
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)