"""
Generador Pillow-only: usa fotos de la propiedad como fondo + overlays de overlays.py
"""
from PIL import Image, ImageEnhance
from io import BytesIO
import httpx
import asyncio
from app.models.property import PropertyData
from app.models.brand import BrandConfig
from app.services.overlays import FORMATS, apply_overlay, crop_center


async def fetch_image(url: str) -> Image.Image | None:
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception:
        return None


async def generate_creatives(
    prop: PropertyData,
    brand: BrandConfig,
    creative_types: list[str],
    fmt_name: str,
    slot_index: int = 0,
) -> dict[str, bytes]:
    """
    Genera fondos Pillow para los tipos dados. Retorna {creative_type: bg_bytes}.
    El overlay se aplica fuera con apply_overlay().
    """
    photo_urls = (prop.photos or [])[:6]
    logo_url = brand.logo_url or ""
    all_urls = photo_urls + ([logo_url] if logo_url and not logo_url.startswith("data:") else [])

    all_imgs = await asyncio.gather(*[fetch_image(u) for u in all_urls], return_exceptions=True)

    photos = [r for r in all_imgs[:len(photo_urls)] if isinstance(r, Image.Image)]

    def get_photo(idx: int) -> Image.Image | None:
        if not photos:
            return None
        return photos[idx % len(photos)]

    results = {}
    for i, ct in enumerate(creative_types):
        w, h = FORMATS.get(fmt_name, (1080, 1080))
        bg = get_photo(slot_index + i)
        if bg:
            bg_resized = crop_center(bg.convert("RGBA"), w, h)
            buf = BytesIO()
            bg_resized.convert("RGB").save(buf, format="JPEG", quality=92)
            results[ct] = buf.getvalue()
        else:
            from PIL import ImageDraw as _ID
            c = brand.primary_color.lstrip("#")
            color = tuple(int(c[j:j+2], 16) for j in (0, 2, 4))
            bg_img = Image.new("RGB", (w, h), color)
            buf = BytesIO()
            bg_img.save(buf, format="JPEG")
            results[ct] = buf.getvalue()

    return results
