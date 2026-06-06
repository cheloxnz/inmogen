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
    custom_texts: dict | None = None,
) -> dict[str, bytes]:
    """
    Genera un creativo por cada creative_type usando fotos reales + Pillow overlay.
    Retorna {creative_type: image_bytes}
    """
    photo_urls = (prop.photos or [])[:6]
    logo_url = brand.logo_url or ""
    all_urls = photo_urls + ([logo_url] if logo_url else [])

    all_imgs = await asyncio.gather(*[fetch_image(u) for u in all_urls], return_exceptions=True)

    photos = [r for r in all_imgs[:len(photo_urls)] if isinstance(r, Image.Image)]
    logo = all_imgs[len(photo_urls)] if logo_url and isinstance(all_imgs[-1], Image.Image) else None

    def get_photo(idx: int) -> Image.Image | None:
        if not photos:
            return None
        return photos[idx % len(photos)]

    results = {}
    for i, ct in enumerate(creative_types):
        w, h = FORMATS.get(fmt_name, (1080, 1080))
        bg = get_photo(i)
        if bg:
            bg_resized = crop_center(bg.convert("RGBA"), w, h)
            bg_bytes = BytesIO()
            bg_resized.convert("RGB").save(bg_bytes, format="JPEG", quality=92)
            bg_bytes = bg_bytes.getvalue()
        else:
            # fondo sólido con color primario si no hay foto
            from PIL import ImageDraw
            bg_img = Image.new("RGB", (w, h), tuple(int(brand.primary_color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4)))
            buf = BytesIO()
            bg_img.save(buf, format="JPEG")
            bg_bytes = buf.getvalue()

        results[ct] = apply_overlay(bg_bytes, logo, brand, prop, ct, fmt_name, custom_texts=custom_texts)

    return results
