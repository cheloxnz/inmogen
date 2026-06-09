"""
Home Staging Virtual usando Replicate API.
Modelo: adirik/interior-design — toma una foto de habitación y la amuebla.

Requiere: REPLICATE_API_TOKEN en .env
"""
import asyncio
import io
import logging

import httpx

logger = logging.getLogger(__name__)

STYLE_PROMPTS = {
    "modern":       "modern minimalist furnished room, clean lines, neutral palette",
    "scandinavian": "scandinavian style furnished room, white walls, light wood furniture, cozy",
    "classic":      "classic elegant furnished room, warm tones, traditional decor",
    "industrial":   "industrial loft style furnished room, exposed brick, metal accents",
    "mediterranean": "mediterranean style furnished room, terracotta tones, natural materials",
}

ROOM_PROMPTS = {
    "living_room": "living room with sofa, coffee table and rug",
    "bedroom":     "bedroom with double bed, nightstands and wardrobe",
    "kitchen":     "kitchen with appliances, island and dining area",
    "bathroom":    "modern bathroom with fixtures and towels",
    "dining":      "dining room with table and chairs",
    "office":      "home office with desk and chair",
    "empty":       "furnished room",
}

# Modelo en Replicate para staging de interiores
REPLICATE_MODEL = "adirik/interior-design"


async def virtual_stage(
    img_url: str,
    room_type: str = "living_room",
    style: str = "modern",
) -> bytes:
    """
    Aplica home staging virtual a una foto de propiedad usando Replicate.

    Args:
        img_url: URL pública de la imagen original
        room_type: Tipo de habitación (living_room, bedroom, kitchen, etc.)
        style: Estilo de decoración (modern, scandinavian, classic, etc.)

    Returns:
        bytes de la imagen staged en JPEG
    """
    from app.core.config import settings

    if not settings.REPLICATE_API_TOKEN:
        raise Exception(
            "REPLICATE_API_TOKEN no configurado. "
            "Obtené tu token en https://replicate.com/account/api-tokens y agregalo al .env del VPS."
        )

    style_desc = STYLE_PROMPTS.get(style, STYLE_PROMPTS["modern"])
    room_desc = ROOM_PROMPTS.get(room_type, ROOM_PROMPTS["empty"])

    prompt = (
        f"professional real estate interior photography, "
        f"{style_desc}, {room_desc}, "
        f"bright natural light, high quality, photorealistic"
    )
    negative_prompt = (
        "ugly, deformed, blurry, low quality, text, watermark, person, "
        "cartoon, drawing, painting, anime, distorted"
    )

    headers = {
        "Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "input": {
            "image": img_url,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "num_inference_steps": 30,
            "guidance_scale": 15,
            "prompt_strength": 0.8,
        }
    }

    async with httpx.AsyncClient(timeout=180) as client:
        # 1. Crear predicción
        r = await client.post(
            f"https://api.replicate.com/v1/models/{REPLICATE_MODEL}/predictions",
            headers=headers,
            json=payload,
        )
        if r.status_code not in (200, 201):
            raise Exception(f"Replicate error {r.status_code}: {r.text}")

        pred = r.json()
        pred_id = pred.get("id")
        if not pred_id:
            raise Exception(f"Replicate no devolvió ID de predicción: {pred}")

        poll_url = f"https://api.replicate.com/v1/predictions/{pred_id}"
        poll_headers = {"Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}"}

        # 2. Polling hasta que termine
        for attempt in range(90):  # max 90 × 2s = 3 minutos
            await asyncio.sleep(2)
            poll_r = await client.get(poll_url, headers=poll_headers)
            poll_r.raise_for_status()
            data = poll_r.json()
            status = data.get("status")

            if status == "succeeded":
                output = data.get("output")
                output_url = output[0] if isinstance(output, list) else output
                img_r = await client.get(str(output_url), timeout=60)
                img_r.raise_for_status()
                # Asegurar que devolvemos JPEG
                img_bytes = img_r.content
                return _to_jpeg(img_bytes)

            elif status == "failed":
                error = data.get("error", "desconocido")
                raise Exception(f"Staging falló en Replicate: {error}")

            elif status in ("canceled",):
                raise Exception("Predicción cancelada en Replicate")

            logger.debug("Staging attempt %d, status: %s", attempt, status)

    raise Exception("Timeout: el staging tardó más de 3 minutos")


def _to_jpeg(img_bytes: bytes) -> bytes:
    """Convierte cualquier formato de imagen a JPEG."""
    from PIL import Image
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=92, optimize=True)
    return out.getvalue()
