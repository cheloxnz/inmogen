import os
import zipfile
from datetime import datetime
from io import BytesIO

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.database import get_db
from app.models.brand import BrandConfig
from app.services.image_generator import generate_creatives as generate_creatives_pillow
from app.services.gemini import generate_creatives as generate_creatives_gemini
from app.services.scraper import scrape_property

router = APIRouter(prefix="/generate", tags=["generate"])

STATIC_DIR = os.environ.get("STATIC_DIR", "/opt/inmogen/backend/static")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://api.inmogen-ia.com")


VALID_FORMATS = {"feed_1x1", "story_9x16", "banner_16x9", "carousel_1", "carousel_2", "whatsapp"}
VALID_TYPES = {"destacado", "infografia", "hook_attack", "storytelling", "social_proof", "faq", "testimonial"}


class GenerateRequest(BaseModel):
    property_url: str
    brand: BrandConfig
    creative_type: str = "destacado"
    formats: list[str] | None = None


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


@router.get("/{job_id}/zip")
async def download_zip(job_id: str):
    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job no encontrado")
    if job.get("status") != "done":
        raise HTTPException(400, "Job no completado")

    job_dir = os.path.join(STATIC_DIR, "jobs", job_id)
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fmt_name in job.get("creatives_fmt", []):
            img_path = os.path.join(job_dir, f"{fmt_name}.jpg")
            if os.path.exists(img_path):
                zf.write(img_path, f"{fmt_name}.jpg")
    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=inmogen_{job_id}.zip"},
    )


async def _process_job(job_id: str, req: GenerateRequest, x_user_id: str):
    db = get_db()
    oid = ObjectId(job_id)

    async def update(data: dict):
        await db.jobs.update_one({"_id": oid}, {"$set": {**data, "updated_at": datetime.utcnow()}})

    try:
        await update({"status": "scraping"})
        prop = await scrape_property(req.property_url)

        await update({"status": "generating", "property_data": prop.model_dump()})

        selected_formats = [f for f in (req.formats or list(VALID_FORMATS)) if f in VALID_FORMATS] or None
        creative_type = req.creative_type if req.creative_type in VALID_TYPES else "destacado"

        if req.brand.gemini_api_key:
            creatives_dict = await generate_creatives_gemini(prop, req.brand, creative_type, selected_formats)
        else:
            creatives_dict = await generate_creatives_pillow(prop, req.brand, creative_type, selected_formats)

        job_dir = os.path.join(STATIC_DIR, "jobs", job_id)
        os.makedirs(job_dir, exist_ok=True)

        urls = []
        fmt_names = []
        for fmt_name, img_bytes in creatives_dict.items():
            img_path = os.path.join(job_dir, f"{fmt_name}.jpg")
            with open(img_path, "wb") as f:
                f.write(img_bytes)
            url = f"{API_BASE_URL}/static/jobs/{job_id}/{fmt_name}.jpg"
            urls.append(url)
            fmt_names.append(fmt_name)
            await db.jobs.update_one(
                {"_id": oid},
                {"$set": {"creatives": urls, "creatives_fmt": fmt_names, "updated_at": datetime.utcnow()}}
            )

        await db.users.update_one({"clerk_id": x_user_id}, {"$inc": {"credits": -1}})
        await update({
            "status": "done",
            "creatives": urls,
            "creatives_fmt": fmt_names,
            "zip_url": f"{API_BASE_URL}/generate/{job_id}/zip",
        })

    except Exception as e:
        await update({"status": "error", "error": str(e)})
