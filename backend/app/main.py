from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_db, close_db
from app.services.storage import init_cloudinary
from app.api import generate, users, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(users.router)
app.include_router(billing.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "inmogen-api"}
