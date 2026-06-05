import base64
import zipfile
from datetime import datetime
from io import BytesIO

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from app.models.brand import BrandConfig
from app.services.image_generator import generate_creatives as generate_creatives_pillow
from app.services.gemini import generate_creatives as generate_creatives_gemini
from app.services.scraper import scrape_property

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
    background_tasks.add_task(_process_job, job_id, req, x_user_id)
    return {"id": job_id, "job_id": job_id, "status": "pending"}


@router.get("/{job_id}")
async def get_job_status(job_id: str, x_user_id: str = Header(...)):
    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": x_user_id})
    if not job:
        raise HTTPException(404, "Job no encontrado")
    job["id"] = str(job.pop("_id"))
    return job


async def _process_job(job_id: str, req: GenerateRequest, x_user_id: str):
    db = get_db()
    oid = ObjectId(job_id)

    async def update(data: dict):
        await db.jobs.update_one({"_id": oid}, {"$set": {**data, "updated_at": datetime.utcnow()}})

    try:
        await update({"status": "scraping"})
        prop = await scrape_property(req.property_url)

        await update({"status": "generating", "property_data": prop.model_dump()})

        # Gemini si el cliente tiene key, sino Pillow
        if req.brand.gemini_api_key:
            creatives_dict = await generate_creatives_gemini(prop, req.brand)
        else:
            creatives_dict = await generate_creatives_pillow(prop, req.brand)

        # Guardar cada creativo progresivamente
        urls = []
        zip_buf = BytesIO()
        zf = zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED)

        for fmt_name, img_bytes in creatives_dict.items():
            zf.writestr(f"{fmt_name}.jpg", img_bytes)
            b64 = base64.b64encode(img_bytes).decode()
            urls.append(f"data:image/jpeg;base64,{b64}")
            await db.jobs.update_one(
                {"_id": oid},
                {"$set": {"creatives": urls, "updated_at": datetime.utcnow()}}
            )

        zf.close()
        b64z = base64.b64encode(zip_buf.getvalue()).decode()
        zip_url = f"data:application/zip;base64,{b64z}"

        await db.users.update_one({"clerk_id": x_user_id}, {"$inc": {"credits": -1}})
        await update({"status": "done", "creatives": urls, "zip_url": zip_url})

    except Exception as e:
        await update({"status": "error", "error": str(e)})
