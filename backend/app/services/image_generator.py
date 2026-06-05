"""
Genera 6 creativos publicitarios a partir de PropertyData + BrandConfig.
Motor: Pillow (compositing) con templates SVG opcionales.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import httpx
import textwrap
from pathlib import Path
from app.models.property import PropertyData
from app.models.brand import BrandConfig

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"

FORMATS = {
    "feed_1x1":     (1080, 1080),
    "story_9x16":   (1080, 1920),
    "banner_1_91x1":(1200,  628),
    "carousel_1":   (1080, 1080),
    "carousel_2":   (1080, 1080),
    "whatsapp":     (1080, 1080),
}


async def fetch_image(url: str) -> Image.Image | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            return Image.open(BytesIO(r.content)).convert("RGB")
    except Exception:
        return None


def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    try:
        font_name = "Inter-Bold.ttf" if bold else "Inter-Regular.ttf"
        return ImageFont.truetype(str(FONTS_DIR / font_name), size)
    except Exception:
        return ImageFont.load_default()


def draw_gradient_overlay(img: Image.Image, color: tuple, opacity: int = 180) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (*color, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img.size
    for y in range(h // 2, h):
        alpha = int(opacity * (y - h // 2) / (h // 2))
        draw.line([(0, y), (w, y)], fill=(*color, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def crop_center(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    ratio = max(target_w / img.width, target_h / img.height)
    new_w = int(img.width * ratio)
    new_h = int(img.height * ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def build_creative(
    bg_photo: Image.Image | None,
    brand: BrandConfig,
    prop: PropertyData,
    width: int,
    height: int,
    label: str = "",
) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    text_color = hex_to_rgb(brand.text_color)

    if bg_photo:
        canvas = crop_center(bg_photo.copy(), width, height)
        canvas = draw_gradient_overlay(canvas, primary, opacity=200)
    else:
        canvas = Image.new("RGB", (width, height), primary)

    draw = ImageDraw.Draw(canvas)

    # Banda superior con color secundario
    band_h = int(height * 0.07)
    draw.rectangle([0, 0, width, band_h], fill=secondary)

    # Nombre de agencia
    font_agency = load_font(int(band_h * 0.55), bold=True)
    draw.text((20, int(band_h * 0.18)), brand.agency_name.upper(), font=font_agency, fill=primary)

    # Precio
    price_text = f"{prop.currency} {prop.price}"
    font_price = load_font(int(height * 0.08), bold=True)
    draw.text((30, int(height * 0.60)), price_text, font=font_price, fill=secondary)

    # Título
    font_title = load_font(int(height * 0.04), bold=True)
    title_lines = textwrap.wrap(prop.title, width=30)
    y_title = int(height * 0.70)
    for line in title_lines[:2]:
        draw.text((30, y_title), line, font=font_title, fill=(*text_color,))
        y_title += int(height * 0.05)

    # Detalles (m², ambientes)
    details = []
    if prop.area_m2:
        details.append(f"{int(prop.area_m2)} m²")
    if prop.rooms:
        details.append(f"{prop.rooms} amb.")
    if prop.bathrooms:
        details.append(f"{prop.bathrooms} baños")
    font_detail = load_font(int(height * 0.030))
    draw.text((30, int(height * 0.82)), "  ·  ".join(details), font=font_detail, fill=(*text_color,))

    # Ubicación
    font_loc = load_font(int(height * 0.028))
    draw.text((30, int(height * 0.87)), prop.location[:50], font=font_loc, fill=(*text_color,))

    # Contacto / banda inferior
    footer_y = int(height * 0.93)
    draw.rectangle([0, footer_y, width, height], fill=(*primary, 220))
    font_contact = load_font(int(height * 0.025))
    contact = brand.phone or brand.website or brand.instagram
    draw.text((30, footer_y + 8), contact, font=font_contact, fill=secondary)

    if label:
        font_label = load_font(int(height * 0.022))
        draw.text((width - 150, 8), label, font=font_label, fill=primary)

    return canvas


async def generate_creatives(prop: PropertyData, brand: BrandConfig) -> dict[str, bytes]:
    main_photo = None
    if prop.photos:
        main_photo = await fetch_image(prop.photos[0])

    photos = [main_photo]
    for url in prop.photos[1:3]:
        img = await fetch_image(url)
        if img:
            photos.append(img)

    results: dict[str, bytes] = {}

    for fmt_name, (w, h) in FORMATS.items():
        photo_idx = 0
        if "carousel_2" in fmt_name and len(photos) > 1:
            photo_idx = 1

        creative = build_creative(
            photos[photo_idx] if photo_idx < len(photos) else None,
            brand, prop, w, h,
            label="WhatsApp" if "whatsapp" in fmt_name else ""
        )
        buf = BytesIO()
        creative.save(buf, format="JPEG", quality=92)
        results[fmt_name] = buf.getvalue()

    return results
