"""
Generación de creativos usando Google Gemini Imagen 3.
Cada cliente usa su propia API key — InmoGen no paga nada.
"""
import httpx
import asyncio
import base64
from io import BytesIO
from app.models.property import PropertyData
from app.models.brand import BrandConfig

GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

FORMATS = {
    "feed_1x1":    {"aspect_ratio": "1:1",  "label": "Feed cuadrado"},
    "story_9x16":  {"aspect_ratio": "9:16", "label": "Story vertical"},
    "banner_16x9": {"aspect_ratio": "16:9", "label": "Banner horizontal"},
    "carousel_1":  {"aspect_ratio": "1:1",  "label": "Carrusel slide 1"},
    "carousel_2":  {"aspect_ratio": "1:1",  "label": "Carrusel slide 2"},
    "whatsapp":    {"aspect_ratio": "4:5",  "label": "WhatsApp Status"},
}

FORMAT_PHOTO_IDX = {
    "feed_1x1": 0, "story_9x16": 1, "banner_16x9": 2,
    "carousel_1": 0, "carousel_2": 1, "whatsapp": 2,
}


def build_prompt(prop: PropertyData, brand: BrandConfig, fmt_name: str) -> str:
    details = []
    if prop.area_m2:
        details.append(f"{int(prop.area_m2)} m²")
    if prop.rooms:
        details.append(f"{prop.rooms} ambientes")
    if prop.bathrooms:
        details.append(f"{prop.bathrooms} baños")
    details_str = " · ".join(details)

    contact = brand.phone or brand.website or brand.instagram or ""

    format_styles = {
        "feed_1x1":    "square 1:1 social media post",
        "story_9x16":  "vertical 9:16 Instagram Story",
        "banner_16x9": "horizontal 16:9 Facebook banner",
        "carousel_1":  "square carousel slide hero image",
        "carousel_2":  "square carousel slide with property features",
        "whatsapp":    "4:5 WhatsApp Status format",
    }

    price_text = f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"

    return f"""Professional real estate advertisement, {format_styles.get(fmt_name, 'social media ad')} format.

Use the reference property photo as the main background image.

Layout:
- Top: agency name "{brand.agency_name}" in bold, brand color bar in {brand.secondary_color}
- Center: property photo filling the frame with subtle dark gradient overlay
- Lower section: large price "{price_text}" with {brand.secondary_color} accent badge
- Property title: "{prop.title[:60]}"
- Details: {details_str}
- Location: {prop.location[:60]}
- Bottom bar: {brand.primary_color} color with contact "{contact}"

Style: Professional Latin American real estate marketing, clean modern design, brand colors {brand.primary_color} (primary) and {brand.secondary_color} (accent), high contrast readable text, no watermarks, photorealistic."""


async def _generate_one(
    client: httpx.AsyncClient,
    api_key: str,
    prompt: str,
    photo_b64: str | None,
) -> bytes | None:
    """Llama a Gemini image generation y devuelve bytes de la imagen."""

    parts = []
    if photo_b64:
        parts.append({
            "inlineData": {
                "mimeType": "image/jpeg",
                "data": photo_b64,
            }
        })
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        }
    }

    url = f"{GEMINI_API_BASE}/{GEMINI_IMAGE_MODEL}:generateContent?key={api_key}"

    try:
        r = await client.post(url, json=payload, timeout=90)
        if not r.is_success:
            raise ValueError(f"Gemini HTTP {r.status_code}: {r.text[:500]}")
        data = r.json()
        # Buscar la parte de imagen en la respuesta
        candidates = data.get("candidates", [])
        for candidate in candidates:
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_data = part["inlineData"].get("data", "")
                    if img_data:
                        return base64.b64decode(img_data)
    except Exception as e:
        raise ValueError(f"Gemini error: {e}")
    return None


async def _fetch_photo_b64(url: str) -> str | None:
    """Descarga una foto y la convierte a base64."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            return base64.b64encode(r.content).decode()
    except Exception:
        return None


async def generate_creatives(prop: PropertyData, brand: BrandConfig) -> dict[str, bytes]:
    """
    Genera 6 creativos con Gemini Imagen 3 usando la key del cliente.
    Retorna dict {fmt_name: image_bytes}
    """
    if not brand.gemini_api_key:
        raise ValueError("Configurá tu API Key de Google Gemini en 'Mi Marca' para generar creativos.")

    # Descargar fotos como base64
    photo_urls = (prop.photos or [])[:3]
    photo_b64s = await asyncio.gather(*[_fetch_photo_b64(u) for u in photo_urls])
    photo_b64s = [p for p in photo_b64s if p]

    def get_photo_b64(idx: int) -> str | None:
        if not photo_b64s:
            return None
        return photo_b64s[idx % len(photo_b64s)]

    async with httpx.AsyncClient() as client:
        tasks = {}
        for fmt_name, fmt_config in FORMATS.items():
            prompt = build_prompt(prop, brand, fmt_name)
            photo_b64 = get_photo_b64(FORMAT_PHOTO_IDX.get(fmt_name, 0))
            tasks[fmt_name] = _generate_one(
                client,
                brand.gemini_api_key,
                prompt,
                photo_b64,
            )

        results_raw = await asyncio.gather(*tasks.values(), return_exceptions=True)

    results = {}
    for fmt_name, result in zip(tasks.keys(), results_raw):
        if isinstance(result, Exception):
            raise result
        if result:
            results[fmt_name] = result

    return results
