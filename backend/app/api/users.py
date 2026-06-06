import hashlib
import logging
from fastapi import APIRouter, Header, HTTPException
from datetime import datetime
from app.core.config import settings
from app.core.database import get_db
from app.models.brand import BrandConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


def _generate_ref_code(clerk_id: str) -> str:
    """Genera un código de referido corto y único basado en el clerk_id."""
    return hashlib.md5(clerk_id.encode()).hexdigest()[:8].upper()


@router.get("/me")
async def get_me(x_user_id: str = Header(...), ref: str = ""):
    db = get_db()
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user:
        # Usuario nuevo — crear con créditos de prueba
        ref_code = _generate_ref_code(x_user_id)
        bonus_credits = 0

        # Procesar código de referido si vino con uno
        if ref:
            referrer = await db.users.find_one({"ref_code": ref})
            if referrer and referrer["clerk_id"] != x_user_id:
                bonus_credits = settings.REFERRAL_CREDITS_NEW_USER
                # Dar créditos al referidor
                await db.users.update_one(
                    {"clerk_id": referrer["clerk_id"]},
                    {
                        "$inc": {"credits": settings.REFERRAL_CREDITS_REFERRER, "referrals_count": 1},
                        "$set": {"updated_at": datetime.utcnow()},
                    }
                )
                logger.info("Referido: %s → referidor %s (+%d créditos)", x_user_id, referrer["clerk_id"], settings.REFERRAL_CREDITS_REFERRER)

        user = {
            "clerk_id": x_user_id,
            "credits": 3 + bonus_credits,
            "plan": "trial",
            "brand": None,
            "ref_code": ref_code,
            "referred_by": ref if ref else None,
            "referrals_count": 0,
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(user)

    # Asegurar que el usuario existente tenga ref_code
    elif not user.get("ref_code"):
        ref_code = _generate_ref_code(x_user_id)
        await db.users.update_one(
            {"clerk_id": x_user_id},
            {"$set": {"ref_code": ref_code, "referrals_count": 0}},
        )
        user["ref_code"] = ref_code

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


@router.get("/referral")
async def get_referral_info(x_user_id: str = Header(...)):
    """Retorna código de referido, link y stats."""
    db = get_db()
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    ref_code = user.get("ref_code") or _generate_ref_code(x_user_id)
    return {
        "ref_code": ref_code,
        "ref_url": f"https://inmogen-ia.com?ref={ref_code}",
        "referrals_count": user.get("referrals_count", 0),
        "credits_earned": user.get("referrals_count", 0) * settings.REFERRAL_CREDITS_REFERRER,
        "credits_per_referral": settings.REFERRAL_CREDITS_REFERRER,
        "credits_new_user": settings.REFERRAL_CREDITS_NEW_USER,
    }


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
