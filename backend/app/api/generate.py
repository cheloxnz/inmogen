import logging
import os
import zipfile
from datetime import datetime
from io import BytesIO

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.models.brand import BrandConfig
from app.services.image_generator import generate_creatives as pillow_creatives
from app.services.gemini import generate_backgrounds
from app.services.overlays import apply_overlay, FORMATS
from app.services.scraper import scrape_property

import httpx
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generate"])

STATIC_DIR = os.environ.get("STATIC_DIR", "/opt/inmogen/backend/static")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://api.inmogen-ia.com")


def _cloudinary_enabled() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


async def _save_image(img_bytes: bytes, job_id: str, entry: str) -> str:
    """Guarda la imagen en Cloudinary (si está configurado) o en disco. Retorna la URL."""
    if _cloudinary_enabled():
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
            )
            result = cloudinary.uploader.upload(
                BytesIO(img_bytes),
                public_id=f"inmogen/jobs/{job_id}/{entry}",
                resource_type="image",
                format="jpg",
                overwrite=True,
            )
            return result["secure_url"]
        except Exception as e:
            logger.warning("Cloudinary upload falló, usando disco: %s", e)

    # Fallback a disco
    job_dir = os.path.join(STATIC_DIR, "jobs", job_id)
    os.makedirs(job_dir, exist_ok=True)
    img_path = os.path.join(job_dir, f"{entry}.jpg")
    with open(img_path, "wb") as f:
        f.write(img_bytes)
    return f"{API_BASE_URL}/static/jobs/{job_id}/{entry}.jpg"

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


ALL_FORMATS = ["feed_1x1", "story_9x16", "banner_16x9", "carousel_1", "carousel_2", "whatsapp"]

class GenerateRequest(BaseModel):
    property_url: str
    brand: BrandConfig
    creative_slots: list[CreativeSlot] = [CreativeSlot(type="destacado")]
    fmt_name: str = "feed_1x1"   # Un formato específico, o "all" para todos
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


@router.get("/{job_id}/share")
async def get_job_public(job_id: str):
    """Endpoint público para compartir resultados — sin auth requerida."""
    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Job no encontrado")
    if job.get("status") != "done":
        raise HTTPException(400, "Job no completado")

    # Obtener brand del usuario (sin datos sensibles)
    brand = None
    user = await db.users.find_one({"clerk_id": job.get("user_id")})
    if user and user.get("brand"):
        raw = user["brand"]
        brand = {
            "agency_name": raw.get("agency_name", ""),
            "logo_url": raw.get("logo_url", ""),
            "primary_color": raw.get("primary_color", "#1A3C6E"),
            "secondary_color": raw.get("secondary_color", "#F5A623"),
            "text_color": raw.get("text_color", "#FFFFFF"),
            "phone": raw.get("phone", ""),
            "website": raw.get("website", ""),
            "instagram": raw.get("instagram", ""),
        }

    return {
        "id": str(job["_id"]),
        "property_url": job.get("property_url"),
        "property_data": job.get("property_data"),
        "creatives": job.get("creatives", []),
        "creatives_fmt": job.get("creatives_fmt", []),
        "zip_url": job.get("zip_url"),
        "created_at": job.get("created_at"),
        "brand": brand,
    }


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
    new_url = await _save_image(img_bytes, job_id, entry)
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

    creatives_urls = job.get("creatives", [])
    creatives_fmt = job.get("creatives_fmt", [])
    job_dir = os.path.join(STATIC_DIR, "jobs", job_id)

    zip_buf = BytesIO()
    async with httpx.AsyncClient(timeout=30) as client:
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, entry in enumerate(creatives_fmt):
                img_bytes = None
                # Intentar leer del disco primero (más rápido)
                local_path = os.path.join(job_dir, f"{entry}.jpg")
                if os.path.exists(local_path):
                    with open(local_path, "rb") as f:
                        img_bytes = f.read()
                # Si no hay en disco (Cloudinary), descargar desde URL
                elif i < len(creatives_urls):
                    try:
                        r = await client.get(creatives_urls[i])
                        if r.status_code == 200:
                            img_bytes = r.content
                    except Exception as e:
                        logger.warning("No se pudo descargar %s para ZIP: %s", creatives_urls[i], e)
                if img_bytes:
                    zf.writestr(f"{entry}.jpg", img_bytes)

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

        # Si fmt_name = "all", generar en todos los formatos
        fmts = ALL_FORMATS if req.fmt_name == "all" else [
            req.fmt_name if req.fmt_name in VALID_FORMATS else "feed_1x1"
        ]

        await update({"status": "scraping"})
        prop = await scrape_property(req.property_url)
        if req.selected_photos:
            prop.photos = req.selected_photos
        await update({"status": "generating", "property_data": prop.model_dump()})

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

        for fmt in fmts:
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

                img_bytes = apply_overlay(
                    bg_bytes, logo_img, req.brand, prop, ct, fmt,
                    custom_text=slot.custom_text,
                    slide_index=i if fmt in ("carousel_1", "carousel_2") else None,
                    slide_total=len(slots) if fmt in ("carousel_1", "carousel_2") else None,
                )
                url = await _save_image(img_bytes, job_id, entry)
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
