"""
Superpone texto/layout sobre fondos (de Gemini o fotos de la propiedad).
Cada creative_type tiene su propia función de overlay.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from io import BytesIO
from pathlib import Path
import textwrap
from app.models.property import PropertyData
from app.models.brand import BrandConfig

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"

FORMATS = {
    "feed_1x1":    (1080, 1080),
    "story_9x16":  (1080, 1920),
    "banner_16x9": (1200,  628),
    "carousel_1":  (1080, 1080),
    "carousel_2":  (1080, 1080),
    "whatsapp":    (1080, 1080),
}


# ── helpers ──────────────────────────────────────────────────────────────────

def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    try:
        name = "Inter-Bold.ttf" if bold else "Inter-Regular.ttf"
        return ImageFont.truetype(str(FONTS_DIR / name), size)
    except Exception:
        try:
            name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
        except Exception:
            return ImageFont.load_default()


def crop_center(img: Image.Image, w: int, h: int) -> Image.Image:
    ratio = max(w / img.width, h / img.height)
    nw, nh = int(img.width * ratio), int(img.height * ratio)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def shadow(draw, pos, text, font, fill, offset=3):
    x, y = pos
    draw.text((x + offset, y + offset), text, font=font, fill=(0, 0, 0, 130))
    draw.text((x, y), text, font=font, fill=fill)


def draw_logo(canvas: Image.Image, logo: Image.Image | None, brand: BrandConfig,
              w: int, h: int, side: str = "left") -> int:
    """Pega logo + nombre agencia. Retorna x donde termina el bloque."""
    secondary = hex_to_rgb(brand.secondary_color)
    logo_h = int(h * 0.065)
    pad = int(w * 0.03)
    y = int(h * 0.03)

    if logo and logo.width > 0:
        ratio = logo_h / logo.height
        logo_w = int(logo.width * ratio)
        if side == "right":
            lx = w - pad - logo_w
        else:
            lx = pad
        try:
            canvas.paste(logo.resize((logo_w, logo_h), Image.LANCZOS), (lx, y), logo.resize((logo_w, logo_h), Image.LANCZOS))
            text_x = lx + logo_w + 8 if side == "left" else lx - 8
        except Exception:
            text_x = pad
    else:
        text_x = pad

    draw = ImageDraw.Draw(canvas)
    font = load_font(int(h * 0.028), bold=True)
    if side == "right":
        draw.text((w - pad, y + (logo_h - int(h * 0.028)) // 2), brand.agency_name,
                  font=font, fill=(*secondary, 255), anchor="ra")
    else:
        shadow(draw, (text_x, y + (logo_h - int(h * 0.028)) // 2),
               brand.agency_name, font, (*secondary, 255))
    return logo_h + y + int(h * 0.01)


def footer_bar(draw: ImageDraw.Draw, brand: BrandConfig, w: int, h: int):
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    fh = int(h * 0.075)
    fy = h - fh
    draw.rectangle([0, fy, w, h], fill=(*primary, 245))
    draw.line([(0, fy), (w, fy)], fill=(*secondary, 255), width=max(3, int(h * 0.004)))

    parts = []
    if brand.phone:
        parts.append(brand.phone)
    if brand.website:
        parts.append(brand.website)
    if brand.instagram:
        parts.append(brand.instagram)

    if parts:
        font = load_font(int(h * 0.026), bold=True)
        draw.text((int(w * 0.04), fy + (fh - int(h * 0.026)) // 2),
                  "   ".join(parts), font=font, fill=(*secondary, 255))


def dark_gradient(canvas: Image.Image, w: int, h: int, from_top: float = 0.4):
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    start = int(h * from_top)
    for y in range(start, h):
        alpha = int(210 * (y - start) / (h - start))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    return Image.alpha_composite(canvas, overlay)


def price_str(prop: PropertyData) -> str:
    if not prop.price:
        return "Consultar precio"
    return f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"


def details_str(prop: PropertyData) -> str:
    parts = []
    if prop.area_m2:
        parts.append(f"{int(prop.area_m2)} m²")
    if prop.rooms:
        parts.append(f"{prop.rooms} amb.")
    if prop.bathrooms:
        parts.append(f"{prop.bathrooms} baños")
    if prop.parking:
        parts.append(f"{prop.parking} coch.")
    return "  ·  ".join(parts)


# ── overlays por tipo ─────────────────────────────────────────────────────────

def overlay_destacado(canvas: Image.Image, logo, brand: BrandConfig,
                      prop: PropertyData, w: int, h: int) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    canvas = dark_gradient(canvas, w, h, from_top=0.38)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    price = price_str(prop)
    font_price = load_font(int(h * 0.072), bold=True)
    price_y = int(h * 0.56)
    bbox = font_price.getbbox(price)
    pad = 14
    draw.rounded_rectangle(
        [28, price_y - pad, 28 + bbox[2] + pad * 2, price_y + bbox[3] + pad],
        radius=8, fill=(*secondary, 230)
    )
    draw.text((28 + pad, price_y), price, font=font_price, fill=(*primary, 255))

    title_y = price_y + bbox[3] + pad * 2 + int(h * 0.012)
    font_title = load_font(int(h * 0.036), bold=True)
    max_w = int((w - 56) / (h * 0.02))
    for line in textwrap.wrap(prop.title or "", width=max(20, max_w))[:2]:
        shadow(draw, (32, title_y), line, font_title, white)
        title_y += int(h * 0.046)

    det = details_str(prop)
    if det:
        font_det = load_font(int(h * 0.028))
        shadow(draw, (32, title_y), det, font_det, (230, 230, 230, 255))
        title_y += int(h * 0.038)

    if prop.location:
        font_loc = load_font(int(h * 0.024))
        shadow(draw, (32, title_y), f"📍 {prop.location[:55]}", font_loc, (210, 210, 210, 230))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_hook_attack(canvas: Image.Image, logo, brand: BrandConfig,
                        prop: PropertyData, w: int, h: int) -> Image.Image:
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    # overlay oscuro uniforme
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 155))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="right")

    hooks = [
        "No vas a encontrar\nesto de nuevo",
        "Tu próxima inversión\nestá acá",
        "¿Todavía pagando\nalquiler?",
        "La oportunidad\nque esperabas",
    ]
    import hashlib
    idx = int(hashlib.md5((prop.title or "x").encode()).hexdigest(), 16) % len(hooks)
    hook = hooks[idx]

    font_hook = load_font(int(h * 0.085), bold=True)
    lines = hook.split("\n")
    total_h = len(lines) * int(h * 0.1)
    start_y = (h - total_h) // 2 - int(h * 0.05)

    for line in lines:
        bbox = font_hook.getbbox(line)
        x = (w - bbox[2]) // 2
        shadow(draw, (x, start_y), line, font_hook, white, offset=4)
        start_y += int(h * 0.1)

    # línea acento
    line_y = start_y + int(h * 0.01)
    lw = int(w * 0.45)
    draw.rectangle([(w - lw) // 2, line_y, (w + lw) // 2, line_y + int(h * 0.006)],
                   fill=(*secondary, 255))

    price = price_str(prop)
    font_price = load_font(int(h * 0.038))
    bbox = font_price.getbbox(price)
    draw.text(((w - bbox[2]) // 2, line_y + int(h * 0.025)), price,
              font=font_price, fill=(230, 230, 230, 255))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_storytelling(canvas: Image.Image, logo, brand: BrandConfig,
                         prop: PropertyData, w: int, h: int) -> Image.Image:
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    dark = Image.new("RGBA", (w, h), (0, 0, 0, 110))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    narratives = [
        "Imaginá tu mañana\nacá adentro.",
        "Así se ve tu nuevo\nestilo de vida.",
        "El lugar donde\ntodo empieza.",
        "Tu hogar ideal\nte está esperando.",
    ]
    import hashlib
    idx = int(hashlib.md5((prop.location or "x").encode()).hexdigest(), 16) % len(narratives)
    narrative = narratives[idx]

    font_narr = load_font(int(h * 0.068), bold=True)
    lines = narrative.split("\n")
    total_h = len(lines) * int(h * 0.082)
    start_y = int(h * 0.38) - total_h // 2

    for line in lines:
        bbox = font_narr.getbbox(line)
        x = (w - bbox[2]) // 2
        shadow(draw, (x, start_y), line, font_narr, white, offset=3)
        start_y += int(h * 0.082)

    # separador elegante
    lw = int(w * 0.3)
    ly = start_y + int(h * 0.018)
    draw.rectangle([(w - lw) // 2, ly, (w + lw) // 2, ly + 2], fill=(*secondary, 200))

    price = price_str(prop)
    loc = prop.location[:45] if prop.location else ""
    font_sub = load_font(int(h * 0.030))
    bbox = font_sub.getbbox(price)
    draw.text(((w - bbox[2]) // 2, ly + int(h * 0.022)), price,
              font=font_sub, fill=(240, 240, 240, 255))
    if loc:
        font_loc = load_font(int(h * 0.024))
        bbox2 = font_loc.getbbox(loc)
        draw.text(((w - bbox2[2]) // 2, ly + int(h * 0.062)), f"📍 {loc}",
                  font=font_loc, fill=(210, 210, 210, 200))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_social_proof(canvas: Image.Image, logo, brand: BrandConfig,
                         prop: PropertyData, w: int, h: int) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    canvas = dark_gradient(canvas, w, h, from_top=0.3)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    trust = "Más de 500 familias\nencontraron su hogar con nosotros"
    font_trust = load_font(int(h * 0.05), bold=True)
    lines = trust.split("\n")
    ty = int(h * 0.28)
    for line in lines:
        bbox = font_trust.getbbox(line)
        shadow(draw, ((w - bbox[2]) // 2, ty), line, font_trust, white)
        ty += int(h * 0.065)

    # stars
    font_stars = load_font(int(h * 0.042))
    stars = "★ ★ ★ ★ ★"
    bbox = font_stars.getbbox(stars)
    draw.text(((w - bbox[2]) // 2, ty + int(h * 0.01)), stars,
              font=font_stars, fill=(*secondary, 255))
    ty += int(h * 0.07)

    # separador
    draw.rectangle([(w // 2 - int(w * 0.2)), ty, (w // 2 + int(w * 0.2)), ty + 3],
                   fill=(*secondary, 200))
    ty += int(h * 0.025)

    price = price_str(prop)
    det = details_str(prop)
    font_price = load_font(int(h * 0.048), bold=True)
    bbox = font_price.getbbox(price)
    draw.text(((w - bbox[2]) // 2, ty), price, font=font_price, fill=(*secondary, 255))
    ty += int(h * 0.062)

    if det:
        font_det = load_font(int(h * 0.028))
        bbox = font_det.getbbox(det)
        draw.text(((w - bbox[2]) // 2, ty), det, font=font_det, fill=(220, 220, 220, 230))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_faq(canvas: Image.Image, logo, brand: BrandConfig,
                prop: PropertyData, w: int, h: int) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    # fondo muy oscuro para que la card resalte
    canvas = canvas.filter(ImageFilter.GaussianBlur(6))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 170))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), dark)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    faqs = [
        ("¿Cuánto cuesta?",        price_str(prop)),
        ("¿Cuántos ambientes?",    str(prop.rooms) if prop.rooms else "Consultar"),
        ("¿Acepta crédito?",       "Consultá con nosotros"),
        ("¿Dónde queda?",          (prop.location or "Consultá")[:35]),
    ]

    card_pad = int(w * 0.06)
    card_x1 = card_pad
    card_x2 = w - card_pad
    card_w = card_x2 - card_x1

    n = len(faqs)
    avail_h = int(h * 0.58)
    row_h = avail_h // n
    start_y = int(h * 0.17)

    font_q = load_font(int(row_h * 0.28))
    font_a = load_font(int(row_h * 0.34), bold=True)
    check_font = load_font(int(row_h * 0.38))

    for i, (q, a) in enumerate(faqs):
        ry = start_y + i * row_h
        # card bg
        is_even = i % 2 == 0
        bg_color = (*primary, 200) if is_even else (30, 30, 30, 200)
        draw.rounded_rectangle([card_x1, ry + 4, card_x2, ry + row_h - 4],
                                radius=10, fill=bg_color)
        draw.rounded_rectangle([card_x1, ry + 4, card_x1 + 6, ry + row_h - 4],
                                radius=0, fill=(*secondary, 255))

        tx = card_x1 + 20
        draw.text((tx, ry + int(row_h * 0.08)), q, font=font_q, fill=(200, 200, 200, 220))
        draw.text((tx, ry + int(row_h * 0.42)), a, font=font_a, fill=white)
        # checkmark
        draw.text((card_x2 - int(row_h * 0.5), ry + int(row_h * 0.3)), "✓",
                  font=check_font, fill=(*secondary, 255))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_testimonial(canvas: Image.Image, logo, brand: BrandConfig,
                        prop: PropertyData, w: int, h: int) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    dark = Image.new("RGBA", (w, h), (0, 0, 0, 140))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    # comilla grande
    font_quote_mark = load_font(int(h * 0.18), bold=True)
    draw.text((int(w * 0.08), int(h * 0.2)), "“", font=font_quote_mark,
              fill=(*secondary, 180))

    quote = "Encontré exactamente\nlo que buscaba.\nRápido y sin complicaciones."
    font_quote = load_font(int(h * 0.048), bold=False)
    lines = quote.split("\n")
    qy = int(h * 0.3)
    for line in lines:
        shadow(draw, (int(w * 0.1), qy), line, font_quote, white)
        qy += int(h * 0.062)

    # cliente
    font_client = load_font(int(h * 0.028))
    draw.text((int(w * 0.1), qy + int(h * 0.015)), "— Cliente satisfecho",
              font=font_client, fill=(*secondary, 230))
    qy += int(h * 0.06)

    # separador
    draw.rectangle([int(w * 0.1), qy, int(w * 0.4), qy + 2], fill=(*secondary, 150))
    qy += int(h * 0.02)

    price = price_str(prop)
    font_price = load_font(int(h * 0.034), bold=True)
    draw.text((int(w * 0.1), qy), price, font=font_price, fill=(*secondary, 255))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


def overlay_infografia(canvas: Image.Image, logo, brand: BrandConfig,
                       prop: PropertyData, w: int, h: int) -> Image.Image:
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    canvas = canvas.filter(ImageFilter.GaussianBlur(10))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 185))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), dark)
    draw = ImageDraw.Draw(canvas)

    draw_logo(canvas, logo, brand, w, h, side="left")

    price = price_str(prop)
    font_price = load_font(int(h * 0.082), bold=True)
    bbox = font_price.getbbox(price)
    draw.text(((w - bbox[2]) // 2, int(h * 0.18)), price,
              font=font_price, fill=(*secondary, 255))

    title = (prop.title or "")[:50]
    font_title = load_font(int(h * 0.030))
    bbox = font_title.getbbox(title)
    draw.text(((w - bbox[2]) // 2, int(h * 0.30)), title,
              font=font_title, fill=(200, 200, 200, 230))

    stats = []
    if prop.area_m2:
        stats.append(("📐", f"{int(prop.area_m2)}", "m²"))
    if prop.rooms:
        stats.append(("🏠", str(prop.rooms), "amb."))
    if prop.bathrooms:
        stats.append(("🚿", str(prop.bathrooms), "baños"))
    if prop.parking:
        stats.append(("🚗", str(prop.parking), "coch."))

    if stats:
        n = len(stats)
        card_w = int((w - int(w * 0.08) * 2 - (n - 1) * int(w * 0.025)) / n)
        card_h = int(h * 0.20)
        cy = int(h * 0.40)
        cx_start = int(w * 0.08)
        font_icon = load_font(int(card_h * 0.35))
        font_val  = load_font(int(card_h * 0.32), bold=True)
        font_lbl  = load_font(int(card_h * 0.18))

        for i, (icon, val, lbl) in enumerate(stats):
            cx = cx_start + i * (card_w + int(w * 0.025))
            draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h],
                                   radius=12, fill=(*primary, 210))
            draw.rounded_rectangle([cx, cy, cx + card_w, cy + 5],
                                   radius=0, fill=(*secondary, 255))
            mid = cx + card_w // 2
            draw.text((mid, cy + int(card_h * 0.12)), icon, font=font_icon, anchor="mt")
            draw.text((mid, cy + int(card_h * 0.52)), val,  font=font_val,  fill=white, anchor="mt")
            draw.text((mid, cy + int(card_h * 0.78)), lbl,  font=font_lbl,  fill=(190, 190, 190, 220), anchor="mt")

    if prop.location:
        font_loc = load_font(int(h * 0.027))
        bbox = font_loc.getbbox(f"📍 {prop.location[:50]}")
        draw.text(((w - bbox[2]) // 2, int(h * 0.70)),
                  f"📍 {prop.location[:50]}", font=font_loc, fill=(210, 210, 210, 220))

    footer_bar(draw, brand, w, h)
    return canvas.convert("RGB")


# ── dispatcher ────────────────────────────────────────────────────────────────

OVERLAY_FN = {
    "destacado":    overlay_destacado,
    "hook_attack":  overlay_hook_attack,
    "storytelling": overlay_storytelling,
    "social_proof": overlay_social_proof,
    "faq":          overlay_faq,
    "testimonial":  overlay_testimonial,
    "infografia":   overlay_infografia,
}


def apply_overlay(
    bg_bytes: bytes,
    logo: Image.Image | None,
    brand: BrandConfig,
    prop: PropertyData,
    creative_type: str,
    fmt_name: str,
) -> bytes:
    w, h = FORMATS.get(fmt_name, (1080, 1080))
    bg = Image.open(BytesIO(bg_bytes)).convert("RGBA")
    bg = crop_center(bg, w, h)
    bg = ImageEnhance.Brightness(bg.convert("RGB")).enhance(0.82).convert("RGBA")

    fn = OVERLAY_FN.get(creative_type, overlay_destacado)
    result = fn(bg, logo, brand, prop, w, h)

    buf = BytesIO()
    result.save(buf, format="JPEG", quality=93, optimize=True)
    return buf.getvalue()
