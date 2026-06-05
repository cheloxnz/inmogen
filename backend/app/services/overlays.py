"""
Superpone texto/layout sobre fondos con Pillow.
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

PAD = 40  # margen horizontal fijo


# ── helpers ───────────────────────────────────────────────────────────────────

def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    size = max(12, size)
    try:
        name = "Inter-Bold.ttf" if bold else "Inter-Regular.ttf"
        return ImageFont.truetype(str(FONTS_DIR / name), size)
    except Exception:
        try:
            name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
        except Exception:
            return ImageFont.load_default()


def s(w: int, h: int) -> int:
    """Base de escala: usa el menor lado para que funcione en todos los formatos."""
    return min(w, h)


def crop_center(img: Image.Image, w: int, h: int) -> Image.Image:
    ratio = max(w / img.width, h / img.height)
    nw, nh = int(img.width * ratio), int(img.height * ratio)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def fit_text(draw: ImageDraw.Draw, text: str, font, max_w: int) -> str:
    """Trunca el texto para que no supere max_w píxeles."""
    if not text:
        return ""
    while text:
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_w:
            return text
        text = text[:-1]
    return ""


def wrap_text(text: str, font, max_w: int, draw: ImageDraw.Draw, max_lines: int = 2) -> list[str]:
    """Divide texto en líneas que caben en max_w."""
    words = (text or "").split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if (bbox[2] - bbox[0]) <= max_w:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines[:max_lines]


def shadow(draw: ImageDraw.Draw, pos, text: str, font, fill, offset: int = 3):
    x, y = pos
    draw.text((x + offset, y + offset), text, font=font, fill=(0, 0, 0, 140))
    draw.text((x, y), text, font=font, fill=fill)


def dark_gradient(canvas: Image.Image, w: int, h: int, from_frac: float = 0.40) -> Image.Image:
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    start = int(h * from_frac)
    for y in range(start, h):
        alpha = int(215 * (y - start) / (h - start))
        draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    return Image.alpha_composite(canvas, overlay)


def footer_bar(draw: ImageDraw.Draw, brand: BrandConfig, w: int, h: int, base: int):
    primary = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    fh = int(base * 0.08)
    fy = h - fh
    draw.rectangle([0, fy, w, h], fill=(*primary, 245))
    draw.line([(0, fy), (w, fy)], fill=(*secondary, 255), width=max(3, int(base * 0.004)))

    parts = []
    if brand.phone:    parts.append(brand.phone)
    if brand.website:  parts.append(brand.website)
    if brand.instagram: parts.append(brand.instagram)
    if not parts:
        return

    font = load_font(int(base * 0.026), bold=True)
    contact = "   ".join(parts)
    contact = fit_text(draw, contact, font, w - PAD * 2)
    draw.text((PAD, fy + (fh - int(base * 0.026)) // 2), contact,
              font=font, fill=(*secondary, 255))


def draw_logo_agency(canvas: Image.Image, logo, brand: BrandConfig,
                     w: int, h: int, base: int, side: str = "left"):
    secondary = hex_to_rgb(brand.secondary_color)
    logo_h = int(base * 0.065)
    y = int(base * 0.03)
    draw = ImageDraw.Draw(canvas)
    font = load_font(int(base * 0.030), bold=True)

    if logo and logo.width > 0:
        ratio = logo_h / logo.height
        logo_w = int(logo.width * ratio)
        logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)
        if side == "right":
            lx = w - PAD - logo_w
        else:
            lx = PAD
        try:
            canvas.paste(logo_resized, (lx, y), logo_resized)
        except Exception:
            pass
        # nombre junto al logo
        name_x = (lx - 8) if side == "right" else (lx + logo_w + 8)
    else:
        name_x = PAD if side == "left" else None

    agency = fit_text(draw, brand.agency_name, font, int(w * 0.45))
    if side == "right":
        draw.text((w - PAD, y + (logo_h - int(base * 0.030)) // 2),
                  agency, font=font, fill=(*secondary, 255), anchor="ra")
    else:
        shadow(draw, (name_x, y + (logo_h - int(base * 0.030)) // 2),
               agency, font, (*secondary, 255))


def price_str(prop: PropertyData) -> str:
    if not prop.price:
        return "Consultar precio"
    return f"USD {prop.price}" if prop.currency == "USD" else f"$ {prop.price}"


def details_str(prop: PropertyData) -> str:
    parts = []
    if prop.area_m2:   parts.append(f"{int(prop.area_m2)} m2")
    if prop.rooms:     parts.append(f"{prop.rooms} amb.")
    if prop.bathrooms: parts.append(f"{prop.bathrooms} banos")
    if prop.parking:   parts.append(f"{prop.parking} coch.")
    return "  |  ".join(parts)


# ── overlays ──────────────────────────────────────────────────────────────────

def overlay_destacado(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    primary   = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    canvas = dark_gradient(canvas, w, h, from_frac=0.38)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    max_text_w = w - PAD * 2

    # precio con badge
    price = price_str(prop)
    font_price = load_font(int(b * 0.072), bold=True)
    price = fit_text(draw, price, font_price, max_text_w - PAD)
    price_y = int(h * 0.56)
    bbox = draw.textbbox((0, 0), price, font=font_price)
    pw = bbox[2] - bbox[0]
    ph = bbox[3] - bbox[1]
    bpad = 14
    draw.rounded_rectangle([PAD - bpad, price_y - bpad // 2,
                             PAD + pw + bpad, price_y + ph + bpad // 2],
                            radius=8, fill=(*secondary, 225))
    draw.text((PAD, price_y), price, font=font_price, fill=(*primary, 255))

    # título
    title_y = price_y + ph + bpad + int(b * 0.018)
    font_title = load_font(int(b * 0.036), bold=True)
    for line in wrap_text(prop.title or "", font_title, max_text_w, draw, max_lines=2):
        shadow(draw, (PAD, title_y), line, font_title, white)
        title_y += int(b * 0.048)

    # detalles
    det = details_str(prop)
    if det:
        font_det = load_font(int(b * 0.028))
        det = fit_text(draw, det, font_det, max_text_w)
        shadow(draw, (PAD, title_y), det, font_det, (225, 225, 225, 255))
        title_y += int(b * 0.038)

    # ubicación
    if prop.location:
        font_loc = load_font(int(b * 0.024))
        loc = fit_text(draw, prop.location, font_loc, max_text_w - 20)
        shadow(draw, (PAD, title_y), loc, font_loc, (200, 200, 200, 230))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_hook_attack(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    dark = Image.new("RGBA", (w, h), (0, 0, 0, 150))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="right")

    hooks = [
        ["No vas a encontrar", "esto de nuevo"],
        ["Tu proxima inversion", "esta aca"],
        ["Todavia pagando", "alquiler?"],
        ["La oportunidad", "que esperabas"],
    ]
    import hashlib
    idx = int(hashlib.md5((prop.title or "x").encode()).hexdigest(), 16) % len(hooks)
    lines = hooks[idx]

    font_hook = load_font(int(b * 0.082), bold=True)
    max_text_w = w - PAD * 2
    total_h = len(lines) * int(b * 0.102)
    start_y = (h - total_h) // 2 - int(b * 0.04)

    for line in lines:
        line = fit_text(draw, line, font_hook, max_text_w)
        bbox = draw.textbbox((0, 0), line, font=font_hook)
        x = max(PAD, (w - (bbox[2] - bbox[0])) // 2)
        shadow(draw, (x, start_y), line, font_hook, white, offset=4)
        start_y += int(b * 0.102)

    lw = int(w * 0.45)
    ly = start_y + int(b * 0.012)
    draw.rectangle([(w - lw) // 2, ly, (w + lw) // 2, ly + int(b * 0.006)],
                   fill=(*secondary, 255))

    price = price_str(prop)
    font_price = load_font(int(b * 0.038))
    price = fit_text(draw, price, font_price, max_text_w)
    bbox = draw.textbbox((0, 0), price, font=font_price)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, ly + int(b * 0.026)),
              price, font=font_price, fill=(230, 230, 230, 255))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_storytelling(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    dark = Image.new("RGBA", (w, h), (0, 0, 0, 110))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    narratives = [
        ["Imagina tu manana", "aca adentro."],
        ["Asi se ve tu nuevo", "estilo de vida."],
        ["El lugar donde", "todo empieza."],
        ["Tu hogar ideal", "te esta esperando."],
    ]
    import hashlib
    idx = int(hashlib.md5((prop.location or "x").encode()).hexdigest(), 16) % len(narratives)
    lines = narratives[idx]

    font_narr = load_font(int(b * 0.066), bold=True)
    max_text_w = w - PAD * 2
    total_h = len(lines) * int(b * 0.082)
    start_y = int(h * 0.35) - total_h // 2

    for line in lines:
        line = fit_text(draw, line, font_narr, max_text_w)
        bbox = draw.textbbox((0, 0), line, font=font_narr)
        x = (w - (bbox[2] - bbox[0])) // 2
        shadow(draw, (x, start_y), line, font_narr, white, offset=3)
        start_y += int(b * 0.082)

    lw = int(w * 0.3)
    ly = start_y + int(b * 0.018)
    draw.rectangle([(w - lw) // 2, ly, (w + lw) // 2, ly + 2],
                   fill=(*secondary, 200))

    price = price_str(prop)
    font_sub = load_font(int(b * 0.030))
    price = fit_text(draw, price, font_sub, max_text_w)
    bbox = draw.textbbox((0, 0), price, font=font_sub)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, ly + int(b * 0.022)),
              price, font=font_sub, fill=(240, 240, 240, 255))

    if prop.location:
        font_loc = load_font(int(b * 0.024))
        loc = fit_text(draw, prop.location, font_loc, max_text_w)
        bbox = draw.textbbox((0, 0), loc, font=font_loc)
        draw.text(((w - (bbox[2] - bbox[0])) // 2, ly + int(b * 0.065)),
                  loc, font=font_loc, fill=(210, 210, 210, 200))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_social_proof(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    canvas = dark_gradient(canvas, w, h, from_frac=0.28)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    max_text_w = w - PAD * 2
    trust_lines = ["Mas de 500 familias", "encontraron su hogar con nosotros"]
    font_trust = load_font(int(b * 0.050), bold=True)
    ty = int(h * 0.26)
    for line in trust_lines:
        line = fit_text(draw, line, font_trust, max_text_w)
        bbox = draw.textbbox((0, 0), line, font=font_trust)
        shadow(draw, ((w - (bbox[2] - bbox[0])) // 2, ty), line, font_trust, white)
        ty += int(b * 0.065)

    font_stars = load_font(int(b * 0.040))
    stars = "* * * * *"
    bbox = draw.textbbox((0, 0), stars, font=font_stars)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, ty + int(b * 0.01)),
              stars, font=font_stars, fill=(*secondary, 255))
    ty += int(b * 0.068)

    lw = int(w * 0.3)
    draw.rectangle([(w - lw) // 2, ty, (w + lw) // 2, ty + 3], fill=(*secondary, 200))
    ty += int(b * 0.025)

    price = price_str(prop)
    font_price = load_font(int(b * 0.048), bold=True)
    price = fit_text(draw, price, font_price, max_text_w)
    bbox = draw.textbbox((0, 0), price, font=font_price)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, ty),
              price, font=font_price, fill=(*secondary, 255))
    ty += int(b * 0.062)

    det = details_str(prop)
    if det:
        font_det = load_font(int(b * 0.026))
        det = fit_text(draw, det, font_det, max_text_w)
        bbox = draw.textbbox((0, 0), det, font=font_det)
        draw.text(((w - (bbox[2] - bbox[0])) // 2, ty),
                  det, font=font_det, fill=(215, 215, 215, 230))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_faq(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    primary   = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    blurred = canvas.filter(ImageFilter.GaussianBlur(8))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 170))
    canvas = Image.alpha_composite(blurred.convert("RGBA"), dark)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    faqs = [
        ("Cuanto cuesta?",       price_str(prop)),
        ("Cuantos ambientes?",   str(prop.rooms) if prop.rooms else "Consultar"),
        ("Acepta credito?",      "Consulta con nosotros"),
        ("Donde queda?",         (prop.location or "Consultar")[:38]),
    ]

    cx1 = int(w * 0.055)
    cx2 = w - int(w * 0.055)
    card_w = cx2 - cx1
    avail = int(h * 0.60)
    row_h = avail // len(faqs)
    start_y = int(h * 0.17)

    font_q = load_font(int(b * 0.026))
    font_a = load_font(int(b * 0.034), bold=True)

    for i, (q, a) in enumerate(faqs):
        ry = start_y + i * row_h
        bg_color = (*primary, 200) if i % 2 == 0 else (25, 25, 25, 200)
        draw.rounded_rectangle([cx1, ry + 4, cx2, ry + row_h - 4],
                                radius=10, fill=bg_color)
        draw.rectangle([cx1, ry + 4, cx1 + 6, ry + row_h - 4],
                       fill=(*secondary, 255))

        tx = cx1 + 18
        max_card_w = card_w - 50
        q = fit_text(draw, q, font_q, max_card_w)
        a = fit_text(draw, a, font_a, max_card_w)
        draw.text((tx, ry + int(row_h * 0.10)), q, font=font_q,
                  fill=(195, 195, 195, 220))
        draw.text((tx, ry + int(row_h * 0.46)), a, font=font_a, fill=white)

        font_check = load_font(int(b * 0.034), bold=True)
        draw.text((cx2 - 30, ry + int(row_h * 0.35)), "OK",
                  font=load_font(int(b * 0.020), bold=True), fill=(*secondary, 255))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_testimonial(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    dark = Image.new("RGBA", (w, h), (0, 0, 0, 140))
    canvas = Image.alpha_composite(canvas, dark)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    max_text_w = w - PAD * 3
    font_qmark = load_font(int(b * 0.16), bold=True)
    draw.text((PAD + 10, int(h * 0.19)), '"', font=font_qmark,
              fill=(*secondary, 175))

    quote_lines = [
        "Encontre exactamente",
        "lo que buscaba.",
        "Rapido y sin complicaciones.",
    ]
    font_quote = load_font(int(b * 0.044))
    qy = int(h * 0.30)
    for line in quote_lines:
        line = fit_text(draw, line, font_quote, max_text_w)
        shadow(draw, (PAD + 20, qy), line, font_quote, white)
        qy += int(b * 0.060)

    font_client = load_font(int(b * 0.026))
    draw.text((PAD + 20, qy + int(b * 0.015)), "- Cliente satisfecho",
              font=font_client, fill=(*secondary, 230))
    qy += int(b * 0.060)

    lw = int(w * 0.35)
    draw.rectangle([PAD + 20, qy, PAD + 20 + lw, qy + 2],
                   fill=(*secondary, 150))
    qy += int(b * 0.022)

    price = price_str(prop)
    font_price = load_font(int(b * 0.034), bold=True)
    price = fit_text(draw, price, font_price, max_text_w)
    draw.text((PAD + 20, qy), price, font=font_price, fill=(*secondary, 255))

    footer_bar(draw, brand, w, h, b)
    return canvas.convert("RGB")


def overlay_infografia(canvas, logo, brand, prop, w, h):
    b = s(w, h)
    primary   = hex_to_rgb(brand.primary_color)
    secondary = hex_to_rgb(brand.secondary_color)
    white = (255, 255, 255, 255)

    blurred = canvas.filter(ImageFilter.GaussianBlur(12))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 185))
    canvas = Image.alpha_composite(blurred.convert("RGBA"), dark)
    draw = ImageDraw.Draw(canvas)
    draw_logo_agency(canvas, logo, brand, w, h, b, side="left")

    max_text_w = w - PAD * 2

    price = price_str(prop)
    font_price = load_font(int(b * 0.080), bold=True)
    price = fit_text(draw, price, font_price, max_text_w)
    bbox = draw.textbbox((0, 0), price, font=font_price)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, int(h * 0.16)),
              price, font=font_price, fill=(*secondary, 255))

    title = (prop.title or "")[:55]
    font_title = load_font(int(b * 0.028))
    title = fit_text(draw, title, font_title, max_text_w)
    bbox = draw.textbbox((0, 0), title, font=font_title)
    draw.text(((w - (bbox[2] - bbox[0])) // 2, int(h * 0.28)),
              title, font=font_title, fill=(195, 195, 195, 230))

    # stat cards
    stats = []
    if prop.area_m2:   stats.append((f"{int(prop.area_m2)}", "m2"))
    if prop.rooms:     stats.append((str(prop.rooms), "amb."))
    if prop.bathrooms: stats.append((str(prop.bathrooms), "banos"))
    if prop.parking:   stats.append((str(prop.parking), "coch."))

    if stats:
        n = len(stats)
        gap = int(w * 0.025)
        margin = int(w * 0.06)
        card_w = (w - margin * 2 - gap * (n - 1)) // n
        card_h = int(b * 0.22)
        cy = int(h * 0.38)
        font_val = load_font(int(b * 0.054), bold=True)
        font_lbl = load_font(int(b * 0.022))
        for i, (val, lbl) in enumerate(stats):
            cx = margin + i * (card_w + gap)
            draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h],
                                   radius=12, fill=(*primary, 215))
            draw.rectangle([cx, cy, cx + card_w, cy + 5],
                           fill=(*secondary, 255))
            mid = cx + card_w // 2
            draw.text((mid, cy + int(card_h * 0.20)), val,
                      font=font_val, fill=white, anchor="mt")
            draw.text((mid, cy + int(card_h * 0.70)), lbl,
                      font=font_lbl, fill=(185, 185, 185, 220), anchor="mt")

    if prop.location:
        font_loc = load_font(int(b * 0.026))
        loc = fit_text(draw, prop.location, font_loc, max_text_w)
        bbox = draw.textbbox((0, 0), loc, font=font_loc)
        draw.text(((w - (bbox[2] - bbox[0])) // 2, int(h * 0.68)),
                  loc, font=font_loc, fill=(205, 205, 205, 220))

    footer_bar(draw, brand, w, h, b)
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
    logo,
    brand: BrandConfig,
    prop: PropertyData,
    creative_type: str,
    fmt_name: str,
) -> bytes:
    w, h = FORMATS.get(fmt_name, (1080, 1080))
    bg = Image.open(BytesIO(bg_bytes)).convert("RGBA")
    bg = crop_center(bg, w, h)
    bg = ImageEnhance.Brightness(bg.convert("RGB")).enhance(0.85).convert("RGBA")

    fn = OVERLAY_FN.get(creative_type, overlay_destacado)
    result = fn(bg, logo, brand, prop, w, h)

    buf = BytesIO()
    result.save(buf, format="JPEG", quality=93, optimize=True)
    return buf.getvalue()
