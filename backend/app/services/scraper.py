import httpx
import json
import re
from datetime import datetime
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.core.config import settings
from app.models.property import PropertyData


def detect_portal(url: str) -> str:
    portals = [
        "zonaprop.com.ar", "argenprop.com", "inmuebles24.com",
        "idealista.com", "fotocasa.es", "properati.com",
        "mercadolibre.com", "infocasas.com.uy",
    ]
    for p in portals:
        if p in url:
            return p
    return "generic"


async def _fetch_with_scraperapi(url: str) -> str:
    api_url = (
        f"https://api.scraperapi.com"
        f"?api_key={settings.SCRAPERAPI_KEY}"
        f"&url={quote_plus(url)}"
        f"&country_code=ar"
        f"&render=true"
    )
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.get(api_url)
        r.raise_for_status()
    return r.text


async def scrape_property(url: str) -> PropertyData:
    portal = detect_portal(url)
    html = await _fetch_with_scraperapi(url)
    soup = BeautifulSoup(html, "lxml")
    return _parse_property(soup, html, url, portal)


def _extract_photos_from_json(html: str) -> list[str]:
    """Extrae fotos de JSON embedido en el HTML (Next.js, JSON-LD, etc.)."""
    photos = []

    # 1. Buscar __NEXT_DATA__ (Zonaprop, Argenprop usan Next.js)
    m = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            _walk_json_for_photos(data, photos)
        except Exception:
            pass

    # 2. Buscar window.__INITIAL_STATE__ o similar
    for pattern in [
        r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
        r'window\.__LISTING_STORE__\s*=\s*({.*?});',
        r'window\.__DATA__\s*=\s*({.*?});',
    ]:
        m = re.search(pattern, html, re.S)
        if m:
            try:
                data = json.loads(m.group(1))
                _walk_json_for_photos(data, photos)
            except Exception:
                pass

    # 3. JSON-LD
    for script in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(script)
            _walk_json_for_photos(data, photos)
        except Exception:
            pass

    # 4. URLs de imágenes sueltas en el HTML (fallback)
    for url in re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"\'<>]*)?', html, re.I):
        if _is_property_photo(url) and url not in photos:
            photos.append(url)

    return list(dict.fromkeys(photos))  # deduplicate preserving order


def _walk_json_for_photos(obj, photos: list, depth: int = 0):
    """Recorre recursivamente un JSON buscando URLs de fotos."""
    if depth > 12:
        return
    if isinstance(obj, str):
        if obj.startswith("http") and _is_property_photo(obj) and obj not in photos:
            photos.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            _walk_json_for_photos(item, photos, depth + 1)
    elif isinstance(obj, dict):
        # Claves que típicamente contienen fotos
        photo_keys = {"url", "src", "href", "image", "photo", "foto", "thumbnail",
                      "original", "large", "full", "highRes", "mediumRes", "lowRes",
                      "location", "source", "file", "uri"}
        for k, v in obj.items():
            if k.lower() in photo_keys or "image" in k.lower() or "photo" in k.lower() or "foto" in k.lower():
                _walk_json_for_photos(v, photos, depth + 1)
            else:
                _walk_json_for_photos(v, photos, depth + 1)


def _is_property_photo(url: str) -> bool:
    url_lower = url.lower()
    # Excluir logos, iconos, mapas, etc.
    bad = ["logo", "icon", "avatar", "banner", "map", "mapa", "sprite", "pixel",
           "tracking", "analytics", "facebook", "twitter", "whatsapp", "placeholder",
           "1x1", "blank", "loading", "favicon"]
    if any(b in url_lower for b in bad):
        return False
    # Debe parecer una imagen de propiedad
    good = ["foto", "photo", "cdn", "media", "img", "image", "picture", "listing",
            "propiedad", "property", "inmueble", "real-estate", "zonaprop", "argenprop"]
    return any(g in url_lower for g in good)


def _parse_property(soup: BeautifulSoup, html: str, url: str, portal: str) -> PropertyData:
    # --- Título ---
    title = ""
    for sel in ["h1", "[class*=title]", "[class*=titulo]"]:
        el = soup.select_one(sel)
        if el:
            title = el.get_text(strip=True)
            break
    title = title or "Propiedad"

    # --- Precio ---
    price = "Consultar"
    for sel in [
        "[class*=price]", "[class*=precio]",
        "[data-qa*=price]", "[data-testid*=price]",
    ]:
        el = soup.select_one(sel)
        if el:
            raw = el.get_text(strip=True)
            nums = re.sub(r"[^\d]", "", raw)
            if nums:
                price = nums
                break

    # --- Moneda ---
    currency = "USD"
    price_el = soup.find(class_=re.compile(r"price|precio", re.I))
    if price_el and "$" in price_el.get_text():
        currency = "ARS" if "zonaprop" in portal or "argenprop" in portal else "USD"
    if "USD" in soup.get_text().upper():
        currency = "USD"

    # --- Ubicación ---
    location = ""
    for sel in [
        "[class*=address]", "[class*=ubicacion]", "[class*=location]",
        "[data-qa*=address]", "[data-testid*=location]",
    ]:
        el = soup.select_one(sel)
        if el:
            location = el.get_text(strip=True)
            break

    # --- Fotos: primero JSON embedido, luego <img> tags ---
    photos = _extract_photos_from_json(html)

    # Fallback: <img> tags
    if len(photos) < 3:
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
            if src.startswith("http") and _is_property_photo(src) and src not in photos:
                photos.append(src)

    photos = photos[:40]  # hasta 40 fotos

    # --- Atributos numéricos ---
    body_text = soup.get_text(" ", strip=True)

    area = None
    m = re.search(r"(\d+[\.,]?\d*)\s*m²", body_text, re.I)
    if m:
        area = float(m.group(1).replace(",", "."))

    rooms = None
    m = re.search(r"(\d+)\s*(amb(?:ientes?)?|cuartos?|dormitorios?|habitaciones?|recámaras?)", body_text, re.I)
    if m:
        rooms = int(m.group(1))

    bathrooms = None
    m = re.search(r"(\d+)\s*ba[ñn]os?", body_text, re.I)
    if m:
        bathrooms = int(m.group(1))

    parking = None
    m = re.search(r"(\d+)\s*(cocheras?|garages?|estacionamientos?)", body_text, re.I)
    if m:
        parking = int(m.group(1))

    return PropertyData(
        url=url,
        title=title[:120],
        price=price,
        currency=currency,
        location=location[:120],
        photos=photos,
        area_m2=area,
        rooms=rooms,
        bathrooms=bathrooms,
        parking=parking,
        portal=portal,
        scraped_at=datetime.utcnow(),
    )
