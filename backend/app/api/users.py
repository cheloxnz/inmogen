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
async def list_jobs(x_user_id: str = Header(...), page: int = 1, per_page: int = 10):
    db = get_db()
    per_page = min(per_page, 50)
    skip = (page - 1) * per_page
    total = await db.jobs.count_documents({"user_id": x_user_id})
    cursor = db.jobs.find({"user_id": x_user_id}).sort("created_at", -1).skip(skip).limit(per_page)
    jobs = []
    async for job in cursor:
        job["id"] = str(job.pop("_id"))
        jobs.append(job)
    return {"jobs": jobs, "total": total, "page": page, "per_page": per_page, "pages": max(1, -(-total // per_page))}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, x_user_id: str = Header(...)):
    from bson import ObjectId
    db = get_db()
    result = await db.jobs.delete_one({"_id": ObjectId(job_id), "user_id": x_user_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Job no encontrado")
    return {"ok": True}


@router.delete("/jobs")
async def delete_all_jobs(x_user_id: str = Header(...)):
    db = get_db()
    result = await db.jobs.delete_many({"user_id": x_user_id})
    return {"ok": True, "deleted": result.deleted_count}
