from fastapi import APIRouter, Header, HTTPException
from datetime import datetime
from app.core.database import get_db
from app.models.brand import BrandConfig

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(x_user_id: str = Header(...)):
    db = get_db()
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user:
        # Crear usuario con créditos de prueba
        user = {
            "clerk_id": x_user_id,
            "credits": 3,
            "plan": "trial",
            "brand": None,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(user)
    user["id"] = str(user.pop("_id"))
    return user


@router.put("/brand")
async def update_brand(brand: BrandConfig, x_user_id: str = Header(...)):
    db = get_db()
    await db.users.update_one(
        {"clerk_id": x_user_id},
        {"$set": {"brand": brand.model_dump(), "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True}


@router.get("/jobs")
async def list_jobs(x_user_id: str = Header(...)):
    db = get_db()
    cursor = db.jobs.find({"user_id": x_user_id}).sort("created_at", -1).limit(50)
    jobs = []
    async for job in cursor:
        job["id"] = str(job.pop("_id"))
        jobs.append(job)
    return jobs
