import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.database import connect_db, close_db
from app.services.storage import init_cloudinary
from app.api import generate, users, billing, leads, photos

STATIC_DIR = os.environ.get("STATIC_DIR", "/opt/inmogen/backend/static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(STATIC_DIR, exist_ok=True)
    await connect_db()
    init_cloudinary()
    yield
    await close_db()


app = FastAPI(title="InmoGen API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://inmogen-ia.com",
        "https://www.inmogen-ia.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://(www\.)?inmogen-ia\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# NOTE: CORS headers are also added by Nginx in production.
# If running behind Nginx, disable the middleware above to avoid duplicate headers.
# In production (VPS), Nginx handles CORS — keep this for local dev only.

os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(generate.router)
app.include_router(users.router)
app.include_router(billing.router)
app.include_router(leads.router)
app.include_router(photos.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "inmogen-api"}
