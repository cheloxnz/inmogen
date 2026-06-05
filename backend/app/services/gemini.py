"""
Genera fondos visuales con Gemini. El texto lo superpone Pillow.
"""
import httpx
import asyncio
import base64
from app.models.property import PropertyData
from app.models.brand import BrandConfig

GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

FORMAT_ASPECT = {
    "feed_1x1":    "square 1:1",
    "story_9x16":  "vertical 9:16 portrait",
    "banner_16x9": "horizontal 16:9 landscape",
    "carousel_1":  "square 1:1",
    "carousel_2":  "square 1:1",
    "whatsapp":    "slightly vertical 4:5",
}

BG_PROMPTS = {
    "destacado": (
        "Professional real estate exterior/interior photo, {fmt} format. "
        "Use the reference property image as inspiration. Clean architectural composition, "
        "natural lighting, subtle dark gradient from bottom. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "hook_attack": (
        "Dramatic cinematic real estate photo, {fmt} format. "
        "High contrast, moody dark atmosphere, strong shadows and highlights. "
        "Use the reference property image. Suitable for bold text overlay in the center. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "storytelling": (
        "Warm aspirational lifestyle real estate photo, {fmt} format. "
        "Golden hour lighting, cozy atmosphere, magazine editorial style. "
        "Use the reference property image. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "social_proof": (
        "Professional clean real estate photo, {fmt} format. "
        "Well-lit, neutral tones, corporate feel. "
        "Use the reference property image. Space at bottom third for text overlay. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "faq": (
        "Soft blurred real estate background, {fmt} format. "
        "Defocused property photo with light overlay, minimal and clean. "
        "Use the reference property image as blurred background. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "testimonial": (
        "Warm inviting real estate interior or exterior, {fmt} format. "
        "Soft natural light, welcoming atmosphere. "
        "Use the reference property image. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
    "infografia": (
        "Softly blurred real estate background, {fmt} format, very dark overlay. "
        "Almost abstract, muted colors, suitable for infographic overlay. "
        "Use the reference property image heavily blurred. "
        "NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere."
    ),
}


def build_bg_prompt(creative_type: str, fmt_name: str) -> str:
    fmt = FORMAT_ASPECT.get(fmt_name, "square")
    template = BG_PROMPTS.get(creative_type, BG_PROMPTS["destacado"])
    return template.format(fmt=fmt)


async def _fetch_photo_b64(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            return base64.b64encode(r.content).decode()
    except Exception:
        return None


async def _generate_bg(
    client: httpx.AsyncClient,
    api_key: str,
    prompt: str,
    photo_b64: str | None,
) -> bytes | None:
    parts = []
    if photo_b64:
        parts.append({"inlineData": {"mimeType": "image/jpeg", "data": photo_b64}})
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    url = f"{GEMINI_API_BASE}/{GEMINI_IMAGE_MODEL}:generateContent?key={api_key}"

    try:
        r = await client.post(url, json=payload, timeout=90)
        if not r.is_success:
            raise ValueError(f"Gemini HTTP {r.status_code}: {r.text[:400]}")
        data = r.json()
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_data = part["inlineData"].get("data", "")
                    if img_data:
                        return base64.b64decode(img_data)
    except Exception as e:
        raise ValueError(f"Gemini error: {e}")
    return None


async def generate_backgrounds(
    prop: PropertyData,
    brand: BrandConfig,
    creative_types: list[str],
    fmt_name: str,
) -> dict[str, bytes]:
    """
    Genera un fondo por cada creative_type para el formato dado.
    Retorna {creative_type: bg_bytes}
    """
    if not brand.gemini_api_key:
        raise ValueError("Configurá tu API Key de Gemini en 'Mi Marca'.")

    photo_urls = (prop.photos or [])[:7]
    photo_b64s = await asyncio.gather(*[_fetch_photo_b64(u) for u in photo_urls])
    photo_b64s = [p for p in photo_b64s if p]

    async with httpx.AsyncClient() as client:
        tasks = {
            ct: _generate_bg(
                client,
                brand.gemini_api_key,
                build_bg_prompt(ct, fmt_name),
                photo_b64s[i % len(photo_b64s)] if photo_b64s else None,
            )
            for i, ct in enumerate(creative_types)
        }
        results_raw = await asyncio.gather(*tasks.values(), return_exceptions=True)

    results = {}
    for ct, result in zip(tasks.keys(), results_raw):
        if isinstance(result, Exception):
            raise result
        if result:
            results[ct] = result

    return results
