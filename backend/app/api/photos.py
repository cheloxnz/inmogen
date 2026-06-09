"""
Endpoints de procesamiento de fotos:
- POST /photos/enhance  → mejora automática (balance blancos, contraste, HDR, nitidez)
- POST /photos/sky      → reemplazo de cielo
- POST /photos/stage    → home staging virtual (Replicate)
"""
import hashlib
import logging
import os
from io import BytesIO

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.services.photo_enhance import auto_enhance, replace_sky
from app.services.staging import ROOM_PROMPTS, STYLE_PROMPTS, virtual_stage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/photos", tags=["photos"])

STATIC_DIR = os.environ.get("STATIC_DIR", "/opt/inmogen/backend/static")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://api.inmogen-ia.com")
ENHANCED_DIR = os.path.join(STATIC_DIR, "enhanced")


# ── Modelos ──────────────────────────────────────────────────────────────────

class PhotoRequest(BaseModel):
    url: str  # URL pública de la foto original


class SkyRequest(BaseModel):
    url: str
    style: str = "clear"  # clear | sunset | golden | cloudy


class StageRequest(BaseModel):
    url: str
    room_type: str = "living_room"
    style: str = "modern"
    replicate_api_key: str = ""  # Key del usuario (opcional, usa la del servidor si no se provee)


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _download_photo(url: str) -> bytes:
    """Descarga una foto desde cualquier URL."""
    # Si es una URL de nuestro propio servidor, leer desde disco directamente
    if url.startswith(API_BASE_URL):
        path = url.replace(API_BASE_URL, "").lstrip("/")
        # /static/enhanced/... → STATIC_DIR/enhanced/...
        path = path.replace("static/", "", 1)
        local = os.path.join(STATIC_DIR, path)
        if os.path.exists(local):
            with open(local, "rb") as f:
                return f.read()

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        return r.content


def _save_enhanced(img_bytes: bytes, suffix: str) -> str:
    """Guarda la imagen procesada y devuelve su URL pública."""
    os.makedirs(ENHANCED_DIR, exist_ok=True)
    h = hashlib.sha256(img_bytes).hexdigest()[:16]
    filename = f"{h}_{suffix}.jpg"
    path = os.path.join(ENHANCED_DIR, filename)
    with open(path, "wb") as f:
        f.write(img_bytes)
    return f"{API_BASE_URL}/static/enhanced/{filename}"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/enhance")
async def enhance_photo(req: PhotoRequest, x_user_id: str = Header(...)):
    """
    Mejora automática de foto inmobiliaria:
    balance de blancos, auto levels, brillo, contraste, saturación, nitidez.
    """
    try:
        img_bytes = await _download_photo(req.url)
        enhanced = auto_enhance(img_bytes)
        new_url = _save_enhanced(enhanced, "enhanced")
        return {"url": new_url, "original_url": req.url}
    except Exception as e:
        logger.error("Error enhancing photo %s: %s", req.url, e)
        raise HTTPException(500, f"Error al mejorar la foto: {e}")


@router.post("/sky")
async def sky_replace(req: SkyRequest, x_user_id: str = Header(...)):
    """
    Reemplaza el cielo de una foto de exterior con un cielo bonito.
    Estilos: clear (azul), sunset (atardecer), golden (dorado), cloudy (nublado suave).
    """
    valid_styles = ("clear", "sunset", "golden", "cloudy")
    style = req.style if req.style in valid_styles else "clear"

    try:
        img_bytes = await _download_photo(req.url)
        result = replace_sky(img_bytes, style=style)
        new_url = _save_enhanced(result, f"sky_{style}")
        return {"url": new_url, "original_url": req.url, "style": style}
    except Exception as e:
        logger.error("Error replacing sky for %s: %s", req.url, e)
        raise HTTPException(500, f"Error al reemplazar el cielo: {e}")


@router.post("/stage")
async def stage_photo(req: StageRequest, x_user_id: str = Header(...)):
    """
    Home staging virtual: amuebla y decora una habitación vacía usando IA (Replicate).
    Requiere REPLICATE_API_TOKEN configurado en el servidor.
    """
    valid_styles = list(STYLE_PROMPTS.keys())
    valid_rooms = list(ROOM_PROMPTS.keys())
    style = req.style if req.style in valid_styles else "modern"
    room_type = req.room_type if req.room_type in valid_rooms else "living_room"

    try:
        staged_bytes = await virtual_stage(req.url, room_type=room_type, style=style, user_replicate_key=req.replicate_api_key)
        new_url = _save_enhanced(staged_bytes, f"staged_{style}_{room_type}")
        return {
            "url": new_url,
            "original_url": req.url,
            "style": style,
            "room_type": room_type,
        }
    except Exception as e:
        logger.error("Error staging photo %s: %s", req.url, e)
        if "REPLICATE_API_TOKEN" in str(e):
            raise HTTPException(501, str(e))
        raise HTTPException(500, f"Error en el staging virtual: {e}")


@router.get("/staging-styles")
async def get_staging_styles():
    """Devuelve los estilos y tipos de habitación disponibles para staging."""
    return {
        "styles": [
            {"id": "modern",        "label": "Moderno",        "emoji": "🏙️"},
            {"id": "scandinavian",  "label": "Escandinavo",    "emoji": "🌿"},
            {"id": "classic",       "label": "Clásico",        "emoji": "🏛️"},
            {"id": "industrial",    "label": "Industrial",     "emoji": "🔩"},
            {"id": "mediterranean", "label": "Mediterráneo",   "emoji": "🌊"},
        ],
        "room_types": [
            {"id": "living_room", "label": "Living / Sala"},
            {"id": "bedroom",     "label": "Dormitorio"},
            {"id": "kitchen",     "label": "Cocina"},
            {"id": "bathroom",    "label": "Baño"},
            {"id": "dining",      "label": "Comedor"},
            {"id": "office",      "label": "Oficina"},
            {"id": "empty",       "label": "Sin especificar"},
        ],
    }
