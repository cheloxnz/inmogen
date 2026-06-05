"""
Generación de creativos inmobiliarios usando Higgsfield nano_banana_pro.
6 formatos: feed 1:1, story 9:16, banner 16:9, carrusel x2 1:1, whatsapp 1:1
"""
import httpx
import asyncio
from app.models.property import PropertyData
from app.models.brand import BrandConfig
from app.core.config import settings

HIGGSFIELD_API = "https://api.higgsfield.ai/v1"

FORMATS = [
    ("feed_1x1",      "1:1"),
    ("story_9x16",    "9:16"),
    ("banner_16x9",   "16:9"),
    ("carousel_1",    "1:1"),
    ("carousel_2",    "1:1"),
    ("whatsapp",      "4:5"),
]


def build_prompt(prop: PropertyData, brand: BrandConfig, fmt_name: str) -> str:
    details = []
    if prop.area_m2:
        details.append(f"{int(prop.area_m2)} m²")
    if prop.rooms:
        details.append(f"{prop.rooms} ambientes")
    if prop.bathrooms:
        details.append(f"{prop.bathrooms} baños")
    details_str = " · ".join(details) if details else ""

    contact = brand.phone or brand.website or brand.instagram or ""

    format_hints = {
        "story_9x16": "vertical story format for Instagram/Facebook Stories",
        "banner_16x9": "horizontal banner format for Facebook feed",
        "whatsapp": "square format optimized for WhatsApp Status",
        "carousel_1": "carousel slide 1, main hero image",
        "carousel_2": "carousel slide 2, feature details focus",
        "feed_1x1": "square feed post for Instagram and Facebook",
    }
    fmt_hint = format_hints.get(fmt_name, "social media ad")

    price_display = f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"

    return f"""Professional real estate advertisement creative, {fmt_hint}.
Agency: {brand.agency_name} — displayed prominently.
Property: {prop.title}.
Location: {prop.location}.
{f'Details: {details_str}.' if details_str else ''}
Price: {price_display}.
Brand colors: primary {brand.primary_color}, accent {brand.secondary_color}.
{f'Contact: {contact}.' if contact else ''}
Use the reference property photo as background. Clean professional layout with brand colors overlay at top and bottom. Agency name bold top area. Price large and prominent. Property details and location clearly readable. Argentine/Latin American real estate marketing style. No watermarks. High quality."""


async def _generate_one(
    session: httpx.AsyncClient,
    prompt: str,
    aspect_ratio: str,
    photo_url: str | None,
) -> dict:
    payload = {
        "model": "nano_banana_pro",
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": "1k",
    }
    if photo_url:
        payload["medias"] = [{"role": "image", "value": photo_url}]

    r = await session.post(
        f"{HIGGSFIELD_API}/image/generate",
        json=payload,
        headers={"Authorization": f"Bearer {settings.HIGGSFIELD_API_KEY}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


async def _poll_job(session: httpx.AsyncClient, job_id: str, max_wait: int = 120) -> str:
    """Espera hasta que el job esté completo y devuelve la URL de la imagen."""
    for _ in range(max_wait // 5):
        await asyncio.sleep(5)
        r = await session.get(
            f"{HIGGSFIELD_API}/image/job/{job_id}",
            headers={"Authorization": f"Bearer {settings.HIGGSFIELD_API_KEY}"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [{}])
        result = results[0] if results else {}
        status = result.get("status")
        if status == "completed":
            return result.get("results", {}).get("rawUrl", "")
        if status == "failed":
            raise ValueError(f"Higgsfield job {job_id} failed")
    raise TimeoutError(f"Higgsfield job {job_id} timed out")


async def generate_creatives(prop: PropertyData, brand: BrandConfig) -> dict[str, str]:
    """
    Genera 6 creativos en paralelo.
    Retorna dict {fmt_name: image_url}
    """
    photo_url = prop.photos[0] if prop.photos else None

    async with httpx.AsyncClient() as session:
        # Lanzar todos los jobs en paralelo
        tasks = []
        for fmt_name, aspect_ratio in FORMATS:
            prompt = build_prompt(prop, brand, fmt_name)
            tasks.append(_generate_one(session, prompt, aspect_ratio, photo_url))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Recolectar job IDs
        job_ids = {}
        for (fmt_name, _), resp in zip(FORMATS, responses):
            if isinstance(resp, Exception):
                job_ids[fmt_name] = None
            else:
                results = resp.get("results", [{}])
                job_id = results[0].get("id") if results else None
                job_ids[fmt_name] = job_id

        # Pollear todos en paralelo
        poll_tasks = {}
        for fmt_name, job_id in job_ids.items():
            if job_id:
                poll_tasks[fmt_name] = _poll_job(session, job_id)

        poll_results = await asyncio.gather(*poll_tasks.values(), return_exceptions=True)

        creatives = {}
        for fmt_name, result in zip(poll_tasks.keys(), poll_results):
            if isinstance(result, Exception):
                creatives[fmt_name] = ""
            else:
                creatives[fmt_name] = result

        return creatives
