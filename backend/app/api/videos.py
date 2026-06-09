"""
Endpoints de generación de videos inmobiliarios:
- POST /videos/generate  → genera MP4 con Ken Burns o slideshow desde un job existente
- POST /videos/from-urls → genera MP4 directamente desde una lista de URLs
"""
import logging
import os

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
from io import BytesIO

from app.core.database import get_db
from app.services.video_generator import generate_video, VideoStyle

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["videos"])


class VideoFromJobRequest(BaseModel):
    job_id: str
    fmt: str = "story_9x16"       # story_9x16 | feed_1x1 | banner_16x9
    style: str = "kenburns"       # kenburns | slideshow
    duration_per_photo: int = 4   # segundos por foto (2-8)


class VideoFromUrlsRequest(BaseModel):
    photo_urls: list[str]
    fmt: str = "story_9x16"
    style: str = "kenburns"
    duration_per_photo: int = 4


@router.post("/generate")
async def video_from_job(req: VideoFromJobRequest, x_user_id: str = Header(...)):
    """
    Genera un video usando las fotos seleccionadas de un job existente.
    Las fotos se toman de property_data.photos del job.
    """
    db = get_db()
    try:
        job = await db.jobs.find_one({"_id": ObjectId(req.job_id), "user_id": x_user_id})
    except Exception:
        raise HTTPException(400, "Job ID inválido")
    if not job:
        raise HTTPException(404, "Job no encontrado")

    prop_data = job.get("property_data") or {}
    photos = prop_data.get("photos") or []
    if not photos:
        raise HTTPException(400, "El job no tiene fotos de propiedad disponibles")

    style = req.style if req.style in ("kenburns", "slideshow") else "kenburns"
    fmt = req.fmt if req.fmt in ("story_9x16", "feed_1x1", "banner_16x9", "whatsapp") else "story_9x16"
    duration = max(2, min(8, req.duration_per_photo))

    try:
        video_bytes = await generate_video(photos, fmt=fmt, style=style, duration_per_photo=duration)
    except Exception as e:
        logger.error("Error generando video para job %s: %s", req.job_id, e)
        raise HTTPException(500, f"Error generando el video: {e}")

    filename = f"inmogen_{req.job_id[:8]}_{fmt}_{style}.mp4"
    return StreamingResponse(
        BytesIO(video_bytes),
        media_type="video/mp4",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/from-urls")
async def video_from_urls(req: VideoFromUrlsRequest, x_user_id: str = Header(...)):
    """
    Genera un video directamente desde una lista de URLs de fotos.
    Útil para generar el video en el paso de selección de fotos, antes de generar creativos.
    """
    if not req.photo_urls:
        raise HTTPException(400, "Se necesita al menos una foto")

    style = req.style if req.style in ("kenburns", "slideshow") else "kenburns"
    fmt = req.fmt if req.fmt in ("story_9x16", "feed_1x1", "banner_16x9", "whatsapp") else "story_9x16"
    duration = max(2, min(8, req.duration_per_photo))

    try:
        video_bytes = await generate_video(
            req.photo_urls, fmt=fmt, style=style, duration_per_photo=duration
        )
    except Exception as e:
        logger.error("Error generando video desde URLs: %s", e)
        raise HTTPException(500, f"Error generando el video: {e}")

    filename = f"inmogen_video_{fmt}_{style}.mp4"
    return StreamingResponse(
        BytesIO(video_bytes),
        media_type="video/mp4",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/options")
async def video_options():
    """Devuelve los formatos y estilos disponibles para generación de video."""
    return {
        "formats": [
            {"id": "story_9x16",  "label": "Story / Reel 9:16", "dims": "1080×1920", "recommended": True},
            {"id": "feed_1x1",    "label": "Feed 1:1",           "dims": "1080×1080"},
            {"id": "banner_16x9", "label": "Banner 16:9",        "dims": "1200×628"},
        ],
        "styles": [
            {"id": "kenburns",  "label": "Ken Burns",  "desc": "Zoom + paneo suave, muy cinematográfico"},
            {"id": "slideshow", "label": "Slideshow",  "desc": "Fade entre fotos, más limpio y minimalista"},
        ],
        "duration_range": {"min": 2, "max": 8, "default": 4},
    }
