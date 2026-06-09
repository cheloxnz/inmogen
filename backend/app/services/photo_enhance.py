"""
Mejora automática de fotos inmobiliarias con Pillow + NumPy.
Sin APIs externas — procesamiento local en el backend.
"""
import io
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


# ── Mejora automática ────────────────────────────────────────────────────────

def auto_enhance(img_bytes: bytes) -> bytes:
    """
    Pipeline completo de mejora:
    1. Balance de blancos (gray world)
    2. Auto levels (estira el histograma)
    3. Brillo sutil +8%
    4. Contraste +15%
    5. Saturación/color +25%
    6. Nitidez +40%
    """
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    img = _white_balance(img)
    img = _auto_levels(img)
    img = ImageEnhance.Brightness(img).enhance(1.08)
    img = ImageEnhance.Contrast(img).enhance(1.15)
    img = ImageEnhance.Color(img).enhance(1.25)
    img = ImageEnhance.Sharpness(img).enhance(1.4)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=92, optimize=True)
    return out.getvalue()


def _white_balance(img: Image.Image) -> Image.Image:
    """Algoritmo Gray World: neutraliza cast de color."""
    data = np.array(img, dtype=np.float32)
    mean_r = data[:, :, 0].mean()
    mean_g = data[:, :, 1].mean()
    mean_b = data[:, :, 2].mean()
    gray = (mean_r + mean_g + mean_b) / 3
    data[:, :, 0] = np.clip(data[:, :, 0] * (gray / (mean_r + 1e-6)), 0, 255)
    data[:, :, 1] = np.clip(data[:, :, 1] * (gray / (mean_g + 1e-6)), 0, 255)
    data[:, :, 2] = np.clip(data[:, :, 2] * (gray / (mean_b + 1e-6)), 0, 255)
    return Image.fromarray(data.astype(np.uint8))


def _auto_levels(img: Image.Image) -> Image.Image:
    """Stretch del histograma por canal (percentil 1-99) para mejor exposición."""
    data = np.array(img, dtype=np.float32)
    for c in range(3):
        ch = data[:, :, c]
        lo, hi = np.percentile(ch, 1), np.percentile(ch, 99)
        if hi > lo:
            data[:, :, c] = np.clip((ch - lo) / (hi - lo) * 255, 0, 255)
    return Image.fromarray(data.astype(np.uint8))


# ── Reemplazo de cielo ───────────────────────────────────────────────────────

SKY_STYLES = {
    "clear":   {"top": (85, 155, 230), "bot": (170, 215, 255)},  # azul despejado
    "sunset":  {"top": (60, 110, 200), "bot": (255, 190, 120)},  # atardecer
    "golden":  {"top": (90, 140, 210), "bot": (255, 220, 140)},  # dorado
    "cloudy":  {"top": (175, 185, 200), "bot": (220, 225, 230)}, # nublado suave
}


def replace_sky(img_bytes: bytes, style: str = "clear") -> bytes:
    """
    Detecta el cielo en la imagen y lo reemplaza con un gradiente bonito.
    Funciona mejor con fotos de exteriores donde el cielo es visible en la mitad superior.
    """
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.uint8)

    # Detectar máscara de cielo
    mask = _detect_sky_mask(arr, h)

    if mask.sum() < 100:
        # No se detectó cielo significativo, devolver imagen sin cambios
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=92)
        return out.getvalue()

    # Generar cielo de reemplazo
    colors = SKY_STYLES.get(style, SKY_STYLES["clear"])
    sky_arr = _make_sky_gradient(w, h, colors["top"], colors["bot"])

    # Aplicar con transición suave en los bordes
    result = arr.copy().astype(np.float32)
    mask_f = mask.astype(np.float32)

    # Suavizado del borde de la máscara con erosión por blur manual
    mask_blur = _blur_mask(mask_f, radius=8)

    for c in range(3):
        result[:, :, c] = (
            arr[:, :, c].astype(np.float32) * (1 - mask_blur)
            + sky_arr[:, :, c].astype(np.float32) * mask_blur
        )

    out_img = Image.fromarray(result.astype(np.uint8))
    out = io.BytesIO()
    out_img.save(out, format="JPEG", quality=92)
    return out.getvalue()


def _detect_sky_mask(arr: np.ndarray, h: int) -> np.ndarray:
    """Detecta píxeles de cielo: zona alta, alta luminosidad, azulado o grisáceo."""
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    brightness = (r + g + b) / 3

    # Cielo azul
    is_blue_sky = (b > r + 8) & (b > g + 5) & (brightness > 120)

    # Cielo grisáceo/blanco nublado
    is_gray_sky = (brightness > 170) & (np.abs(r - g) < 25) & (np.abs(g - b) < 25)

    sky_candidate = (is_blue_sky | is_gray_sky)

    # Peso por posición vertical: solo la mitad superior, con degradado
    # El 40% superior tiene peso total, entre 40-55% hay degradado, debajo no
    y_idx = np.arange(h)
    y_weight = np.zeros(h)
    t40 = int(h * 0.40)
    t55 = int(h * 0.55)
    y_weight[:t40] = 1.0
    if t55 > t40:
        y_weight[t40:t55] = np.linspace(1.0, 0.0, t55 - t40)

    y_mask = (y_weight > 0.3)[:, np.newaxis]  # broadcast a todo el ancho

    return (sky_candidate & y_mask).astype(np.float32)


def _make_sky_gradient(w: int, h: int, top_color: tuple, bot_color: tuple) -> np.ndarray:
    """Genera un array con gradiente vertical de colores."""
    sky = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / h
        for c in range(3):
            sky[y, :, c] = int(top_color[c] * (1 - t) + bot_color[c] * t)
    return sky


def _blur_mask(mask: np.ndarray, radius: int = 8) -> np.ndarray:
    """Suaviza el borde de la máscara usando box blur manual."""
    from PIL import Image as PILImage, ImageFilter
    mask_img = PILImage.fromarray((mask * 255).astype(np.uint8), mode="L")
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=radius))
    return np.array(mask_img).astype(np.float32) / 255.0
