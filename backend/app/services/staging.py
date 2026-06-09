"""
Home Staging Virtual usando Replicate API (SDK oficial).
Modelo: stability-ai/stable-diffusion-img2img

Requiere: REPLICATE_API_TOKEN en .env
"""
import asyncio
import io
import logging

import httpx

logger = logging.getLogger(__name__)

STYLE_PROMPTS = {
    "modern":        "modern minimalist furnished room, clean lines, neutral palette, white walls",
    "scandinavian":  "scandinavian style furnished room, light wood furniture, cozy, white walls",
    "classic":       "classic elegant furnished room, warm tones, traditional decor, luxury",
    "industrial":    "industrial loft style furnished room, exposed brick, metal accents, modern",
    "mediterranean": "mediterranean style furnished room, terracotta tones, natural materials, sunny",
}

ROOM_PROMPTS = {
    "living_room": "living room with sofa, coffee table and rug",
    "bedroom":     "bedroom with double bed, nightstands and wardrobe",
    "kitchen":     "kitchen with appliances, island and dining area",
    "bathroom":    "modern bathroom with fixtures and towels",
    "dining":      "dining room with table and chairs",
    "office":      "home office with desk, chair and shelves",
    "empty":       "beautifully furnished room",
}

# Modelo img2img — sin versión fija, se resuelve dinámicamente
REPLICATE_MODEL = "stability-ai/stable-diffusion-img2img"


async def virtual_stage(
    img_url: str,
    room_type: str = "living_room",
    style: str = "modern",
    user_replicate_key: str = "",
) -> bytes:
    """
    Aplica home staging virtual usando Replicate (stability-ai/stable-diffusion-img2img).

    Args:
        img_url: URL pública de la imagen original
        room_type: Tipo de habitación
        style: Estilo de decoración

    Returns:
        bytes de la imagen staged en JPEG
    """
    from app.core.config import settings

    # Prioridad: key del usuario → key del servidor
    api_token = user_replicate_key.strip() or settings.REPLICATE_API_TOKEN
    if not api_token:
        raise Exception(
            "Replicate API key no configurada. "
            "Agregá tu token en Configuración → Marca → Replicate API Key. "
            "Obtené uno gratis en https://replicate.com/account/api-tokens"
        )

    style_desc = STYLE_PROMPTS.get(style, STYLE_PROMPTS["modern"])
    room_desc = ROOM_PROMPTS.get(room_type, ROOM_PROMPTS["empty"])

    prompt = (
        f"professional real estate interior photography, "
        f"{style_desc}, {room_desc}, "
        f"bright natural light, high quality, photorealistic, 8k"
    )
    negative_prompt = (
        "ugly, deformed, blurry, low quality, text, watermark, person, "
        "cartoon, drawing, painting, anime, distorted, empty room, bare walls"
    )

    import replicate
    client = replicate.Client(api_token=api_token)

    # Resolver la versión latest del modelo dinámicamente
    model_with_version = await _resolve_model_version(REPLICATE_MODEL, api_token)

    def _run_sync():
        return client.run(
            model_with_version,
            input={
                "image": img_url,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "num_inference_steps": 30,
                "guidance_scale": 12,
                "prompt_strength": 0.75,
                "scheduler": "DPMSolverMultistep",
            }
        )

    # Ejecutar en thread para no bloquear el event loop
    for attempt in range(4):
        try:
            output = await asyncio.wait_for(
                asyncio.to_thread(_run_sync),
                timeout=240,
            )
            break
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "throttled" in err_str or "rate limit" in err_str.lower():
                wait = 15 * (attempt + 1)
                logger.info("Replicate rate limit — esperando %ds (intento %d/4)", wait, attempt + 1)
                await asyncio.sleep(wait)
                if attempt == 3:
                    raise Exception(f"Replicate rate limit persistente: {e}")
                continue
            raise

    # output puede ser FileOutput, URL string, o lista
    img_bytes = await _extract_output(output)
    return _to_jpeg(img_bytes)


async def _resolve_model_version(model_name: str, token: str) -> str:
    """Obtiene el ID de la versión más reciente del modelo desde la API de Replicate."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"https://api.replicate.com/v1/models/{model_name}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 200:
            data = r.json()
            latest = (data.get("latest_version") or {}).get("id")
            if latest:
                logger.info("Replicate model %s → versión %s", model_name, latest[:12])
                return f"{model_name}:{latest}"
    # Fallback: usar sin versión (SDK elige la última)
    logger.warning("No se pudo resolver versión de %s, usando sin hash", model_name)
    return model_name


async def _extract_output(output) -> bytes:
    """Extrae los bytes de imagen del output de Replicate (distintos formatos posibles)."""
    # FileOutput con método read()
    if hasattr(output, 'read'):
        return output.read()

    # Lista de outputs (tomar el primero)
    if isinstance(output, list) and len(output) > 0:
        first = output[0]
        if hasattr(first, 'read'):
            return first.read()
        if hasattr(first, 'url'):
            url = str(first.url)
        else:
            url = str(first)
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.content

    # URL directa (string o FileOutput con .url)
    url = getattr(output, 'url', None) or str(output)
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


def _to_jpeg(img_bytes: bytes) -> bytes:
    from PIL import Image
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=92, optimize=True)
    return out.getvalue()
