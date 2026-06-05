"""
Generador de creativos inmobiliarios con Pillow.
Diseño mejorado: logo, jerarquía visual, gradiente suave, iconos texto.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from io import BytesIO
import httpx
import textwrap
import asyncio
from pathlib import Path
from app.models.property import PropertyData
from app.models.brand import BrandConfig

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"

FORMATS = {
    "feed_1x1":     (1080, 1080),
    "story_9x16":   (1080, 1920),
    "banner_16x9":  (1200,  628),
    "carousel_1":   (1080, 1080),
    "carousel_2":   (1080, 1080),
    "whatsapp":     (1080, 1080),
}


def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    try:
        name = "Inter-Bold.ttf" if bold else "Inter-Regular.ttf"
        return ImageFont.truetype(str(FONTS_DIR / name), size)
    except Exception:
        try:
            # Fallback a DejaVu que viene con Linux
            name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
        except Exception:
            return ImageFont.load_default()


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


def crop_center(img: Image.Image, w: int, h: int) -> Image.Image:
    ratio = max(w / img.width, h / img.height)
    nw, nh = int(img.width * ratio), int(img.height * ratio)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def draw_gradient(draw: ImageDraw.Draw, w: int, h: int, color: tuple, top: bool = False):
    """Gradiente de transparente a opaco."""
    if top:
        for y in range(int(h * 0.35)):
            alpha = int(210 * (1 - y / (h * 0.35)))
            draw.line([(0, y), (w, y)], fill=(*color, alpha))
    else:
        start = int(h * 0.45)
        for y in range(start, h):
            alpha = int(230 * (y - start) / (h - start))
            draw.line([(0, y), (w, y)], fill=(*color, alpha))


def draw_text_shadow(draw, pos, text, font, color, shadow_offset=2):
    x, y = pos
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 120))
    draw.text((x, y), text, font=font, fill=color)


def build_creative(
    bg: Image.Image | None,
    logo: Image.Image | None,
    brand: BrandConfig,
    prop: PropertyData,
    w: int,
    h: int,
    photo_idx: int = 0,
) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    text_rgb = hex_to_rgb(brand.text_color)

    # --- Canvas base ---
    if bg:
        canvas = crop_center(bg.convert("RGBA"), w, h)
        # Darkener leve para que el texto sea legible
        enhancer = ImageEnhance.Brightness(canvas.convert("RGB"))
        canvas = enhancer.enhance(0.88).convert("RGBA")
    else:
        canvas = Image.new("RGBA", (w, h), (*primary, 255))

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # --- Gradiente superior (para logo/nombre agencia) ---
    draw_gradient(draw, w, int(h * 0.35), primary, top=True)

    # --- Gradiente inferior (para datos propiedad) ---
    draw_gradient(draw, w, h, primary, top=False)

    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)

    # --- Banda superior de color secundario (acento) ---
    band_h = max(8, int(h * 0.006))
    draw.rectangle([0, 0, w, band_h], fill=(*secondary, 255))

    # --- Logo ---
    logo_h = int(h * 0.07)
    logo_x = 30
    logo_y = band_h + int(h * 0.02)
    if logo and logo.width > 0:
        ratio = logo_h / logo.height
        logo_w = int(logo.width * ratio)
        logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)
        try:
            canvas.paste(logo_resized, (logo_x, logo_y), logo_resized)
            text_start_x = logo_x + logo_w + 12
        except Exception:
            text_start_x = logo_x
    else:
        text_start_x = logo_x

    # --- Nombre agencia ---
    font_agency = load_font(int(h * 0.032), bold=True)
    agency_y = logo_y + (logo_h - int(h * 0.032)) // 2
    draw_text_shadow(draw, (text_start_x, agency_y), brand.agency_name.upper(), font_agency, (*text_rgb, 255))

    # --- PRECIO (grande, destacado) ---
    price_text = f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"
    font_price = load_font(int(h * 0.075), bold=True)
    price_y = int(h * 0.58)

    # Badge detrás del precio
    bbox = font_price.getbbox(price_text)
    badge_pad = 16
    badge_x1 = 30 - badge_pad
    badge_y1 = price_y - badge_pad // 2
    badge_x2 = 30 + (bbox[2] - bbox[0]) + badge_pad
    badge_y2 = price_y + (bbox[3] - bbox[1]) + badge_pad // 2
    draw.rounded_rectangle([badge_x1, badge_y1, badge_x2, badge_y2], radius=8, fill=(*secondary, 220))
    draw.text((30, price_y), price_text, font=font_price, fill=(*primary, 255))

    # --- Título propiedad ---
    font_title = load_font(int(h * 0.038), bold=True)
    title_y = badge_y2 + int(h * 0.02)
    max_chars = max(20, int(w / (h * 0.022)))
    title_lines = textwrap.wrap(prop.title, width=max_chars)[:2]
    for line in title_lines:
        draw_text_shadow(draw, (30, title_y), line, font_title, (*text_rgb, 255))
        title_y += int(h * 0.047)

    # --- Detalles: m², ambientes, baños ---
    details = []
    if prop.area_m2:
        details.append(f"📐 {int(prop.area_m2)} m²")
    if prop.rooms:
        details.append(f"🏠 {prop.rooms} amb.")
    if prop.bathrooms:
        details.append(f"🚿 {prop.bathrooms} baños")
    if prop.parking:
        details.append(f"🚗 {prop.parking} coch.")

    if details:
        font_detail = load_font(int(h * 0.030))
        detail_str = "   ".join(details)
        draw_text_shadow(draw, (30, title_y), detail_str, font_detail, (*text_rgb, 255))
        title_y += int(h * 0.042)

    # --- Ubicación ---
    if prop.location:
        font_loc = load_font(int(h * 0.026))
        loc_text = f"📍 {prop.location[:55]}"
        draw_text_shadow(draw, (30, title_y), loc_text, font_loc, (*text_rgb, 230))

    # --- Banda inferior con contacto ---
    footer_h = int(h * 0.07)
    footer_y = h - footer_h
    draw.rectangle([0, footer_y, w, h], fill=(*primary, 240))
    draw.line([(0, footer_y), (w, footer_y)], fill=(*secondary, 255), width=3)

    contact_parts = []
    if brand.phone:
        contact_parts.append(f"📞 {brand.phone}")
    if brand.website:
        contact_parts.append(f"🌐 {brand.website}")
    if brand.instagram:
        contact_parts.append(f"📷 {brand.instagram}")

    if contact_parts:
        font_contact = load_font(int(h * 0.024))
        contact_text = "   ".join(contact_parts)
        contact_y = footer_y + (footer_h - int(h * 0.024)) // 2
        draw.text((30, contact_y), contact_text, font=font_contact, fill=(*secondary, 255))

    return canvas.convert("RGB")


def build_infografia(
    bg: Image.Image | None,
    brand: BrandConfig,
    prop: PropertyData,
    w: int,
    h: int,
) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    text_rgb = hex_to_rgb(brand.text_color)

    # Fondo: foto desenfocada + overlay oscuro
    if bg:
        canvas = crop_center(bg.convert("RGBA"), w, h)
        canvas = canvas.filter(ImageFilter.GaussianBlur(12))
        dark = Image.new("RGBA", (w, h), (0, 0, 0, 180))
        canvas = Image.alpha_composite(canvas, dark)
    else:
        canvas = Image.new("RGBA", (w, h), (*primary, 255))

    draw = ImageDraw.Draw(canvas)

    # Banda superior
    band_h = max(8, int(h * 0.006))
    draw.rectangle([0, 0, w, band_h], fill=(*secondary, 255))

    # Nombre agencia
    font_agency = load_font(int(h * 0.034), bold=True)
    draw.text((30, band_h + int(h * 0.025)), brand.agency_name.upper(), font=font_agency, fill=(*secondary, 255))

    # Precio central
    price_text = f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"
    font_price = load_font(int(h * 0.085), bold=True)
    price_y = int(h * 0.18)
    draw.text((w // 2, price_y), price_text, font=font_price, fill=(255, 255, 255, 255), anchor="mm")

    # Título
    font_title = load_font(int(h * 0.032), bold=False)
    title_short = prop.title[:55] + ("…" if len(prop.title) > 55 else "")
    draw.text((w // 2, price_y + int(h * 0.1)), title_short, font=font_title, fill=(220, 220, 220, 255), anchor="mm")

    # Cards de stats
    stats = []
    if prop.area_m2:
        stats.append(("📐", f"{int(prop.area_m2)} m²", "Superficie"))
    if prop.rooms:
        stats.append(("🏠", str(prop.rooms), "Ambientes"))
    if prop.bathrooms:
        stats.append(("🚿", str(prop.bathrooms), "Baños"))
    if prop.parking:
        stats.append(("🚗", str(prop.parking), "Cocheras"))

    if stats:
        card_w = int((w - 60) / max(len(stats), 1)) - 10
        card_h = int(h * 0.18)
        card_y = int(h * 0.42)
        font_icon = load_font(int(card_h * 0.38))
        font_val = load_font(int(card_h * 0.30), bold=True)
        font_lbl = load_font(int(card_h * 0.18))
        for i, (icon, val, lbl) in enumerate(stats):
            cx = 30 + i * (card_w + 10)
            draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=12, fill=(*primary, 200))
            draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + 4], radius=0, fill=(*secondary, 255))
            mid = cx + card_w // 2
            draw.text((mid, card_y + int(card_h * 0.18)), icon, font=font_icon, anchor="mt")
            draw.text((mid, card_y + int(card_h * 0.56)), val, font=font_val, fill=(255, 255, 255, 255), anchor="mt")
            draw.text((mid, card_y + int(card_h * 0.80)), lbl, font=font_lbl, fill=(200, 200, 200, 220), anchor="mt")

    # Ubicación
    if prop.location:
        font_loc = load_font(int(h * 0.028))
        draw.text((w // 2, int(h * 0.70)), f"📍 {prop.location[:55]}", font=font_loc, fill=(220, 220, 220, 230), anchor="mm")

    # Footer
    footer_h = int(h * 0.08)
    footer_y = h - footer_h
    draw.rectangle([0, footer_y, w, h], fill=(*primary, 240))
    draw.line([(0, footer_y), (w, footer_y)], fill=(*secondary, 255), width=3)
    contact_parts = []
    if brand.phone:
        contact_parts.append(f"📞 {brand.phone}")
    if brand.website:
        contact_parts.append(f"🌐 {brand.website}")
    if brand.instagram:
        contact_parts.append(f"📷 {brand.instagram}")
    if contact_parts:
        font_contact = load_font(int(h * 0.024))
        draw.text((30, footer_y + (footer_h - int(h * 0.024)) // 2), "   ".join(contact_parts), font=font_contact, fill=(*secondary, 255))

    return canvas.convert("RGB")


async def generate_creatives(
    prop: PropertyData,
    brand: BrandConfig,
    creative_type: str = "destacado",
    formats: list[str] | None = None,
) -> dict[str, bytes]:
    selected_formats = {k: v for k, v in FORMATS.items() if formats is None or k in formats}

    photo_urls = (prop.photos or [])[:6]
    tasks = [fetch_image(url) for url in photo_urls]
    if brand.logo_url:
        tasks.append(fetch_image(brand.logo_url))

    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    photos = [r for r in all_results[:len(photo_urls)] if isinstance(r, Image.Image)]
    logo = all_results[len(photo_urls)] if brand.logo_url and isinstance(all_results[-1], Image.Image) else None

    def get_photo(idx: int) -> Image.Image | None:
        if not photos:
            return None
        return photos[idx % len(photos)]

    format_photo_idx = {
        "feed_1x1": 0, "story_9x16": 1, "banner_16x9": 2,
        "carousel_1": 0, "carousel_2": 1, "whatsapp": 2,
    }

    results = {}
    for fmt_name, (fw, fh) in selected_formats.items():
        bg = get_photo(format_photo_idx.get(fmt_name, 0))
        if creative_type == "infografia":
            creative = build_infografia(bg, brand, prop, fw, fh)
        else:
            creative = build_creative(bg, logo, brand, prop, fw, fh)
        buf = BytesIO()
        creative.save(buf, format="JPEG", quality=95, optimize=True)
        results[fmt_name] = buf.getvalue()

    return results
