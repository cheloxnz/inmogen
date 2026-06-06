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
from app.services.image_generator import generate_creatives as pillow_creatives
from app.services.gemini import generate_backgrounds
from app.services.overlays import apply_overlay, FORMATS
from app.services.scraper import scrape_property

import httpx
import asyncio

router = APIRouter(prefix="/generate", tags=["generate"])

STATIC_DIR = os.environ.get("STATIC_DIR", "/opt/inmogen/backend/static")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://api.inmogen-ia.com")

VALID_FORMATS = set(FORMATS.keys())
VALID_TYPES = {"destacado", "infografia", "hook_attack", "storytelling",
               "social_proof", "faq", "testimonial"}


class CreativeSlot(BaseModel):
    type: str
    custom_text: str = ""


class RegenerateRequest(BaseModel):
    slot_index: int
    creative_type: str
    custom_text: str = ""
    fmt_name: str = "feed_1x1"


class GenerateRequest(BaseModel):
    property_url: str
    brand: BrandConfig
    creative_slots: list[CreativeSlot] = [CreativeSlot(type="destacado")]
    fmt_name: str = "feed_1x1"
    selected_photos: list[str] | None = None


@router.get("/preview")
async def scrape_preview(url: str, x_user_id: str = Header(...)):
    """Scrapea la propiedad y devuelve datos + fotos para que el usuario elija."""
    try:
        prop = await scrape_property(url)
        return {
            "title": prop.title,
            "price": prop.price,
            "currency": prop.currency,
            "location": prop.location,
            "area_m2": prop.area_m2,
            "rooms": prop.rooms,
            "photos": prop.photos or [],
        }
    except Exception as e:
        raise HTTPException(400, f"Error al procesar la URL: {e}")


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
        "creatives_fmt": [],
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


@router.post("/{job_id}/regenerate")
async def regenerate_slot(job_id: str, req: RegenerateRequest, x_user_id: str = Header(...)):
    """Regenera una imagen individual de un job ya completado. Sin costo de créditos."""
    from PIL import Image
    from io import BytesIO as BIO

    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": x_user_id})
    if not job:
        raise HTTPException(404, "Job no encontrado")
    if job.get("status") != "done":
        raise HTTPException(400, "El job debe estar completado")

    ct = req.creative_type if req.creative_type in VALID_TYPES else "destacado"
    fmt = req.fmt_name if req.fmt_name in VALID_FORMATS else "feed_1x1"
    idx = req.slot_index

    user = await db.users.find_one({"clerk_id": x_user_id})
    brand_data = (user or {}).get("brand")
    if not brand_data:
        raise HTTPException(400, "Sin configuración de marca")
    brand = BrandConfig(**brand_data)

    prop_data = job.get("property_data")
    if not prop_data:
        raise HTTPException(400, "Sin datos de propiedad en el job")
    from app.models.property import PropertyData
    prop = PropertyData(**prop_data)

    logo_img = None
    if brand.logo_url:
        logo_bytes = await _fetch_logo_bytes(brand.logo_url)
        if logo_bytes:
            try:
                logo_img = Image.open(BIO(logo_bytes)).convert("RGBA")
            except Exception:
                pass

    bg_dict = await pillow_creatives(prop, brand, [ct], fmt, slot_index=idx)
    bg_bytes = bg_dict.get(ct)
    if not bg_bytes:
        raise HTTPException(500, "Error generando el fondo")

    img_bytes = apply_overlay(bg_bytes, logo_img, brand, prop, ct, fmt, custom_text=req.custom_text)

    entry = f"{ct}_{idx}_{fmt}"
    job_dir = os.path.join(STATIC_DIR, "jobs", job_id)
    os.makedirs(job_dir, exist_ok=True)
    img_path = os.path.join(job_dir, f"{entry}.jpg")
    with open(img_path, "wb") as f:
        f.write(img_bytes)

    new_url = f"{API_BASE_URL}/static/jobs/{job_id}/{entry}.jpg"
    creatives = list(job.get("creatives", []))
    creatives_fmt = list(job.get("creatives_fmt", []))

    if idx < len(creatives):
        creatives[idx] = new_url
        creatives_fmt[idx] = entry
    else:
        creatives.append(new_url)
        creatives_fmt.append(entry)

    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"creatives": creatives, "creatives_fmt": creatives_fmt, "updated_at": datetime.utcnow()}}
    )
    return {"url": new_url, "entry": entry, "index": idx}


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
        for entry in job.get("creatives_fmt", []):
            img_path = os.path.join(job_dir, f"{entry}.jpg")
            if os.path.exists(img_path):
                zf.write(img_path, f"{entry}.jpg")
    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=inmogen_{job_id}.zip"},
    )


async def _fetch_logo_bytes(url: str) -> bytes | None:
    if not url:
        return None
    if url.startswith("data:"):
        import base64
        try:
            _, data = url.split(",", 1)
            return base64.b64decode(data)
        except Exception:
            return None
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            return r.content
    except Exception:
        return None


async def _process_job(job_id: str, req: GenerateRequest, x_user_id: str):
    from PIL import Image
    from io import BytesIO as BIO

    db = get_db()
    oid = ObjectId(job_id)

    async def update(data: dict):
        await db.jobs.update_one({"_id": oid}, {"$set": {**data, "updated_at": datetime.utcnow()}})

    try:
        slots = [s for s in req.creative_slots if s.type in VALID_TYPES]
        if not slots:
            slots = [CreativeSlot(type="destacado")]
        fmt = req.fmt_name if req.fmt_name in VALID_FORMATS else "feed_1x1"

        await update({"status": "scraping"})
        prop = await scrape_property(req.property_url)
        if req.selected_photos:
            prop.photos = req.selected_photos
        await update({"status": "generating", "property_data": prop.model_dump()})

        job_dir = os.path.join(STATIC_DIR, "jobs", job_id)
        os.makedirs(job_dir, exist_ok=True)

        logo_img = None
        if req.brand.logo_url:
            logo_bytes = await _fetch_logo_bytes(req.brand.logo_url)
            if logo_bytes:
                try:
                    logo_img = Image.open(BIO(logo_bytes)).convert("RGBA")
                except Exception:
                    pass

        urls = []
        fmt_entries = []

        for i, slot in enumerate(slots):
            ct = slot.type
            entry = f"{ct}_{i}_{fmt}"

            # Obtener fondo
            if req.brand.gemini_api_key:
                bgs = await generate_backgrounds(prop, req.brand, [ct], fmt)
                bg_bytes = bgs.get(ct)
            else:
                bg_bytes = await pillow_creatives(prop, req.brand, [ct], fmt, slot_index=i)
                bg_bytes = bg_bytes.get(ct)

            if not bg_bytes:
                continue

            img_bytes = apply_overlay(bg_bytes, logo_img, req.brand, prop, ct, fmt, custom_text=slot.custom_text)
            img_path = os.path.join(job_dir, f"{entry}.jpg")
            with open(img_path, "wb") as f:
                f.write(img_bytes)
            url = f"{API_BASE_URL}/static/jobs/{job_id}/{entry}.jpg"
            urls.append(url)
            fmt_entries.append(entry)
            await db.jobs.update_one(
                {"_id": oid},
                {"$set": {"creatives": urls, "creatives_fmt": fmt_entries,
                          "updated_at": datetime.utcnow()}}
            )

        await db.users.update_one({"clerk_id": x_user_id}, {"$inc": {"credits": -1}})
        await update({
            "status": "done",
            "creatives": urls,
            "creatives_fmt": fmt_entries,
            "zip_url": f"{API_BASE_URL}/generate/{job_id}/zip",
        })

    except Exception as e:
        await update({"status": "error", "error": str(e)})
