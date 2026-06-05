"""
Generación de creativos usando Google Gemini.
Cada cliente usa su propia API key — InmoGen no paga nada.
"""
import httpx
import asyncio
import base64
from app.models.property import PropertyData
from app.models.brand import BrandConfig

GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

ALL_FORMATS = {
    "feed_1x1":    {"label": "Feed cuadrado",      "style": "square 1:1 social media post"},
    "story_9x16":  {"label": "Story vertical",      "style": "vertical 9:16 Instagram Story"},
    "banner_16x9": {"label": "Banner horizontal",   "style": "horizontal 16:9 Facebook banner"},
    "carousel_1":  {"label": "Carrusel slide 1",    "style": "square 1:1 carousel first slide"},
    "carousel_2":  {"label": "Carrusel slide 2",    "style": "square 1:1 carousel second slide"},
    "whatsapp":    {"label": "WhatsApp Status",     "style": "4:5 WhatsApp Status format"},
}

FORMAT_PHOTO_IDX = {
    "feed_1x1": 0, "story_9x16": 1, "banner_16x9": 2,
    "carousel_1": 0, "carousel_2": 1, "whatsapp": 2,
}


def _base_context(prop: PropertyData, brand: BrandConfig) -> str:
    details = []
    if prop.area_m2:
        details.append(f"{int(prop.area_m2)} m²")
    if prop.rooms:
        details.append(f"{prop.rooms} ambientes")
    if prop.bathrooms:
        details.append(f"{prop.bathrooms} baños")
    if prop.parking:
        details.append(f"{prop.parking} cochera")
    details_str = " · ".join(details)
    price_text = f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"
    contact = brand.phone or brand.website or brand.instagram or ""
    return price_text, details_str, contact


def build_prompt(prop: PropertyData, brand: BrandConfig, fmt_name: str, creative_type: str) -> str:
    fmt_style = ALL_FORMATS.get(fmt_name, {}).get("style", "social media ad")
    price_text, details_str, contact = _base_context(prop, brand)
    primary = brand.primary_color
    secondary = brand.secondary_color
    agency = brand.agency_name

    if creative_type == "infografia":
        return f"""Professional real estate infographic ad, {fmt_style} format.

Clean infographic layout with icons and data visualization.
Property data to display visually:
- Price: {price_text} (large, prominent badge in {secondary})
- Details: {details_str} (each as an icon+number card)
- Location: {prop.location[:60]}
- Title: {prop.title[:50]}

Layout: property photo as subtle blurred background with overlay. White/light cards floating over it showing each stat with icon. Agency "{agency}" top bar in {primary}.
Bottom contact bar: {contact}

Style: Modern data-driven real estate infographic, {primary} and {secondary} brand colors, highly readable icons and numbers, professional Latin American real estate market."""

    elif creative_type == "hook_attack":
        return f"""Scroll-stopping real estate social media ad, {fmt_style} format.

Strong attention-grabbing hook headline. Use the property photo as dramatic background.

Create a bold hook in Spanish such as:
- "¿Todavía pagando alquiler?" or "Tu próxima inversión está acá" or "No vas a encontrar esto de nuevo"

Layout:
- Large bold hook text centered, white with {secondary} accent underline
- Property photo dramatic background with strong dark overlay
- Price {price_text} as secondary text below hook
- "{agency}" small logo top corner
- {details_str} subtle bottom strip
- Contact: {contact}

Style: High impact, emotional, scroll-stopping. Bold typography, high contrast, aggressive attention-grabbing design."""

    elif creative_type == "storytelling":
        return f"""Lifestyle real estate storytelling ad, {fmt_style} format.

Warm, aspirational narrative style ad. Use property photo as beautiful background.

Create visual storytelling in Spanish about living in this property:
"Imaginá tu mañana acá..." or "Así se ve tu nuevo estilo de vida" or neighborhood lifestyle narrative.

Layout:
- Atmospheric property photo background, warm color grade
- Italic narrative headline in white, elegant serif-style feel
- Subtle {primary} gradient overlay
- Price {price_text} and location {prop.location[:40]} tastefully placed
- Agency "{agency}" small and elegant
- Contact: {contact}

Style: Aspirational, warm, lifestyle-focused. Magazine editorial aesthetic. Emotional connection over data."""

    elif creative_type == "social_proof":
        return f"""Real estate social proof / trust ad, {fmt_style} format.

Trust-building advertisement highlighting agency credibility.

Layout:
- Property photo background
- Large trust statement in Spanish: "Más de 500 familias encontraron su hogar con nosotros" or "Líderes en {prop.location[:30]}"
- Star ratings or checkmarks visual element
- Featured property: {price_text} — {prop.title[:50]}
- Agency name "{agency}" prominently in {primary} branded bar
- {details_str}
- Contact: {contact}

Style: Trustworthy, professional, credibility-focused. {primary} and {secondary} brand colors. Clean corporate feel with social proof elements."""

    elif creative_type == "faq":
        return f"""Real estate FAQ social media ad, {fmt_style} format.

FAQ-style ad answering common buyer/renter questions.

Questions and answers to display (in Spanish):
- "¿Cuánto cuesta?" → {price_text} ✅
- "¿Cuántos ambientes?" → {prop.rooms or 'Consultar'} ✅
- "¿Acepta crédito hipotecario?" → Consultá ✅
- "¿Dónde queda?" → {prop.location[:40]} ✅

Layout: Property photo blurred background, white FAQ card overlay with rounded corners, each Q&A as a clean row with checkmark. Agency "{agency}" header in {primary}.
Contact: {contact}

Style: Informative, clean, conversational. Easy to read FAQ card design."""

    elif creative_type == "testimonial":
        return f"""Real estate testimonial social media ad, {fmt_style} format.

Client testimonial advertisement with property photo.

Create a compelling testimonial quote in Spanish such as:
"Encontré exactamente lo que buscaba. El proceso fue rápido y sin complicaciones." — Cliente satisfecho

Layout:
- Property photo background with warm overlay
- Large quotation mark in {secondary}
- Testimonial text in white italic, centered
- Client name/initials placeholder below quote
- Property featured: {price_text} · {prop.title[:40]}
- Agency "{agency}" branded footer in {primary}
- Contact: {contact}

Style: Warm, human, testimonial-focused. Trust and emotion. Clean typography."""

    else:  # destacado (default)
        return f"""Professional real estate advertisement, {fmt_style} format.

Use the reference property photo as the main background image.

Layout:
- Top: agency name "{agency}" in bold, brand color bar in {secondary}
- Center: property photo filling the frame with subtle dark gradient overlay
- Lower section: large price "{price_text}" with {secondary} accent badge
- Property title: "{prop.title[:60]}"
- Details: {details_str}
- Location: {prop.location[:60]}
- Bottom bar: {primary} color with contact "{contact}"

Style: Professional Latin American real estate marketing, clean modern design, brand colors {primary} (primary) and {secondary} (accent), high contrast readable text, no watermarks, photorealistic."""


async def _generate_one(
    client: httpx.AsyncClient,
    api_key: str,
    prompt: str,
    photo_b64: str | None,
) -> bytes | None:
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
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_data = part["inlineData"].get("data", "")
                    if img_data:
                        return base64.b64decode(img_data)
    except Exception as e:
        raise ValueError(f"Gemini error: {e}")
    return None


async def _fetch_photo_b64(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            return base64.b64encode(r.content).decode()
    except Exception:
        return None


async def generate_creatives(
    prop: PropertyData,
    brand: BrandConfig,
    creative_type: str = "destacado",
    formats: list[str] | None = None,
) -> dict[str, bytes]:
    if not brand.gemini_api_key:
        raise ValueError("Configurá tu API Key de Google Gemini en 'Mi Marca' para generar creativos.")

    selected_formats = {k: v for k, v in ALL_FORMATS.items() if formats is None or k in formats}

    photo_urls = (prop.photos or [])[:3]
    photo_b64s = await asyncio.gather(*[_fetch_photo_b64(u) for u in photo_urls])
    photo_b64s = [p for p in photo_b64s if p]

    def get_photo_b64(idx: int) -> str | None:
        if not photo_b64s:
            return None
        return photo_b64s[idx % len(photo_b64s)]

    async with httpx.AsyncClient() as client:
        tasks = {}
        for fmt_name in selected_formats:
            prompt = build_prompt(prop, brand, fmt_name, creative_type)
            photo_b64 = get_photo_b64(FORMAT_PHOTO_IDX.get(fmt_name, 0))
            tasks[fmt_name] = _generate_one(client, brand.gemini_api_key, prompt, photo_b64)

        results_raw = await asyncio.gather(*tasks.values(), return_exceptions=True)

    results = {}
    for fmt_name, result in zip(tasks.keys(), results_raw):
        if isinstance(result, Exception):
            raise result
        if result:
            results[fmt_name] = result

    return results
