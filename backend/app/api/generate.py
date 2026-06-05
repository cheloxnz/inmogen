from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
import zipfile
import httpx
from io import BytesIO
from app.core.database import get_db
from app.core.config import settings
from app.services.scraper import scrape_property
from app.services.image_generator import generate_creatives
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

        import base64
        from app.services.image_generator import FORMATS, build_creative, fetch_image
        from app.models.brand import BrandConfig as BC

        # Descargar fotos y logo una vez
        photo_urls = (prop.photos or [])[:6]
        import asyncio as _asyncio
        photo_tasks = [fetch_image(url) for url in photo_urls]
        if req.brand.logo_url:
            photo_tasks.append(fetch_image(req.brand.logo_url))
        all_imgs = await _asyncio.gather(*photo_tasks, return_exceptions=True)
        from PIL import Image as _Image
        photos = [r for r in all_imgs[:len(photo_urls)] if isinstance(r, _Image.Image)]
        logo = all_imgs[len(photo_urls)] if req.brand.logo_url and isinstance(all_imgs[-1], _Image.Image) else None

        format_photo_idx = {
            "feed_1x1": 0, "story_9x16": 1, "banner_16x9": 2,
            "carousel_1": 0, "carousel_2": 1, "whatsapp": 2,
        }

        def get_photo(idx):
            if not photos: return None
            return photos[idx % len(photos)]

        urls = []
        zip_buf = BytesIO()
        zf = zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED)

        for fmt_name, (fw, fh) in FORMATS.items():
            bg = get_photo(format_photo_idx.get(fmt_name, 0))
            creative = build_creative(bg, logo, req.brand, prop, fw, fh)
            buf = BytesIO()
            creative.save(buf, format="JPEG", quality=95, optimize=True)
            img_bytes = buf.getvalue()
            zf.writestr(f"{fmt_name}.jpg", img_bytes)

            b64 = base64.b64encode(img_bytes).decode()
            url = f"data:image/jpeg;base64,{b64}"
            urls.append(url)

            # Guardar progresivamente en MongoDB
            await db.jobs.update_one(
                {"_id": oid},
                {"$set": {"creatives": urls, "updated_at": datetime.utcnow()}}
            )

        zf.close()
        b64z = base64.b64encode(zip_buf.getvalue()).decode()
        zip_url = f"data:application/zip;base64,{b64z}"

        # Descontar crédito
        await db.users.update_one({"clerk_id": x_user_id}, {"$inc": {"credits": -1}})

        await update({"status": "done", "creatives": urls, "zip_url": zip_url})
    except Exception as e:
        await update({"status": "error", "error": str(e)})
