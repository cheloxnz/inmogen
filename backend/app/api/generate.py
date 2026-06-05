from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
import zipfile
from io import BytesIO
from app.core.database import get_db
from app.services.scraper import scrape_property
from app.services.image_generator import generate_creatives
from app.services.storage import upload_creative, upload_zip
from app.models.brand import BrandConfig

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    property_url: str
    brand: BrandConfig


@router.post("/")
async def start_generation(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    x_user_id: str = Header(...),
):
    db = get_db()

    # Verificar créditos
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user or user.get("credits", 0) < 1:
        raise HTTPException(402, "Sin créditos disponibles")

    job = {
        "user_id": x_user_id,
        "property_url": req.property_url,
        "brand": req.brand.model_dump(),
        "status": "pending",
        "creatives": [],
        "zip_url": None,
        "error": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.jobs.insert_one(job)
    job_id = str(result.inserted_id)

    background_tasks.add_task(_process_job, job_id, req)
    return {"id": job_id, "job_id": job_id, "status": "pending"}


@router.get("/{job_id}")
async def get_job_status(job_id: str, x_user_id: str = Header(...)):
    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": x_user_id})
    if not job:
        raise HTTPException(404, "Job no encontrado")
    job["id"] = str(job.pop("_id"))
    return job


async def _process_job(job_id: str, req: GenerateRequest):
    db = get_db()
    oid = ObjectId(job_id)

    async def update(data: dict):
        await db.jobs.update_one({"_id": oid}, {"$set": {**data, "updated_at": datetime.utcnow()}})

    try:
        await update({"status": "scraping"})
        prop = await scrape_property(req.property_url)

        await update({"status": "generating", "property_data": prop.model_dump()})
        creatives = await generate_creatives(prop, req.brand)

        urls = []
        for fmt_name, img_bytes in creatives.items():
            url = await upload_creative(img_bytes, f"{job_id}_{fmt_name}")
            urls.append(url)

        # Empaquetar ZIP
        zip_buf = BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for fmt_name, img_bytes in creatives.items():
                zf.writestr(f"{fmt_name}.jpg", img_bytes)
        zip_url = await upload_zip(zip_buf.getvalue(), f"{job_id}_pack")

        # Descontar crédito
        await db.users.update_one({"clerk_id": req.property_url}, {"$inc": {"credits": -1}})

        await update({"status": "done", "creatives": urls, "zip_url": zip_url})
    except Exception as e:
        await update({"status": "error", "error": str(e)})
