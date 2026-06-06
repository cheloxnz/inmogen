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
        # Argentina
        "zonaprop.com.ar", "argenprop.com", "properati.com.ar",
        "mercadolibre.com.ar", "navent.com",
        # México
        "inmuebles24.com", "lamudi.com.mx", "vivanuncios.com.mx",
        "propiedades.com",
        # España
        "idealista.com", "fotocasa.es", "habitaclia.com", "pisos.com",
        "yaencontre.com",
        # Uruguay
        "infocasas.com.uy", "gallito.com.uy", "mercadolibre.com.uy",
        # Chile
        "portalinmobiliario.com", "mercadolibre.cl", "toctoc.com",
        # Colombia
        "metrocuadrado.com", "fincaraiz.com.co", "mercadolibre.com.co",
        # Peru
        "urbania.pe", "adondevivir.com", "mercadolibre.com.pe",
        # Genérico
        "mercadolibre.com", "properati.com",
    ]
    for p in portals:
        if p in url:
            return p
    return "generic"


def _country_code_for_url(url: str) -> str:
    """Elige el país de ScraperAPI según el portal para mejor tasa de éxito."""
    if any(p in url for p in ["zonaprop", "argenprop", "properati.com.ar", "mercadolibre.com.ar"]):
        return "ar"
    if any(p in url for p in ["inmuebles24", "lamudi.com.mx", "vivanuncios", "mercadolibre.com.mx"]):
        return "mx"
    if any(p in url for p in ["idealista.com", "fotocasa", "habitaclia", "pisos.com", "yaencontre"]):
        return "es"
    if any(p in url for p in ["infocasas", "gallito", "mercadolibre.com.uy"]):
        return "uy"
    if any(p in url for p in ["portalinmobiliario", "toctoc", "mercadolibre.cl"]):
        return "cl"
    if any(p in url for p in ["metrocuadrado", "fincaraiz", "mercadolibre.com.co"]):
        return "co"
    if any(p in url for p in ["urbania", "adondevivir", "mercadolibre.com.pe"]):
        return "pe"
    return "ar"


async def _fetch_with_scraperapi(url: str) -> str:
    country = _country_code_for_url(url)
    base = f"https://api.scraperapi.com?api_key={settings.SCRAPERAPI_KEY}&url={quote_plus(url)}&country_code={country}"

    async with httpx.AsyncClient(timeout=90) as client:
        # 1. Intentar con render=true (necesario para Next.js)
        try:
            r = await client.get(base + "&render=true")
            if r.status_code == 200:
                return r.text
        except Exception:
            pass

        # 2. Fallback sin render (más rápido, funciona en portales SSR)
        try:
            r = await client.get(base)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass

        # 3. Fallback directo sin ScraperAPI
        try:
            r = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }, follow_redirects=True, timeout=30)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass

    raise Exception(f"No se pudo obtener el contenido de {url}")


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
    # Excluir logos, iconos, mapas, ads, etc.
    bad = [
        "logo", "icon", "avatar", "banner", "map", "mapa", "sprite", "pixel",
        "tracking", "analytics", "facebook", "twitter", "whatsapp", "placeholder",
        "1x1", "blank", "loading", "favicon", "badge", "star", "rating",
        "googletagmanager", "doubleclick", "googlesyndication", "adsense",
        "gstatic.com/maps", "staticmap",
    ]
    if any(b in url_lower for b in bad):
        return False
    # CDNs y dominios conocidos de portales inmobiliarios
    trusted_domains = [
        # Argentina
        "zonaprop", "argenprop", "navent", "properati",
        # España
        "idealista", "fotocasa", "habitaclia",
        # México
        "inmuebles24", "lamudi",
        # Uruguay
        "infocasas", "gallito",
        # Chile
        "portalinmobiliario", "toctoc",
        # Colombia
        "metrocuadrado", "fincaraiz",
        # Perú
        "urbania", "adondevivir",
        # CDNs genéricos
        "mlstatic.com", "mercadolibre",
        "cloudinary", "cloudfront", "akamaized",
        "imgix", "images.cdn",
    ]
    if any(d in url_lower for d in trusted_domains):
        return True
    # Palabras clave en la URL
    good = [
        "foto", "photo", "cdn", "media", "img", "image", "picture",
        "listing", "propiedad", "property", "inmueble", "real-estate",
        "vivienda", "piso", "departamento", "casa", "appartement",
    ]
    return any(g in url_lower for g in good)


def _extract_price_from_json(html: str) -> tuple[str, str] | None:
    """Extrae precio y moneda del JSON embedido. Retorna (price_str, currency) o None."""
    m = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except Exception:
        return None

    price_keys = {"price", "precio", "amount", "value", "monto", "priceTotal", "totalPrice"}
    currency_keys = {"currency", "moneda", "currencyCode"}
    found_price = None
    found_currency = "USD"

    def walk(obj, depth=0):
        nonlocal found_price, found_currency
        if depth > 15 or found_price:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                kl = k.lower()
                if kl in currency_keys and isinstance(v, str) and v:
                    found_currency = "ARS" if v.upper() in ("ARS", "PESO", "$") else "USD"
                if kl in price_keys and isinstance(v, (int, float, str)):
                    raw = re.sub(r"[^\d]", "", str(v))
                    if raw and int(raw) > 100:
                        found_price = raw
                        return
                walk(v, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, depth + 1)
                if found_price:
                    return

    walk(data)
    return (found_price, found_currency) if found_price else None


def _parse_property(soup: BeautifulSoup, html: str, url: str, portal: str) -> PropertyData:
    # --- Título ---
    title = ""
    for sel in ["h1", "[class*=title]", "[class*=titulo]"]:
        el = soup.select_one(sel)
        if el:
            title = el.get_text(strip=True)
            break
    title = title or "Propiedad"

    # --- Precio: primero desde JSON embedido, luego CSS selectors ---
    price = "Consultar"
    currency = "USD"
    json_price = _extract_price_from_json(html)
    if json_price:
        price, currency = json_price
    else:
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
    for pattern in [r"(\d+[\.,]?\d*)\s*m²", r"(\d+[\.,]?\d*)\s*m2", r"(\d+[\.,]?\d*)\s*metros?\s*cuadrados?"]:
        m2 = re.search(pattern, body_text, re.I)
        if m2:
            area = float(m2.group(1).replace(",", "."))
            break

    rooms = None
    m2 = re.search(
        r"(\d+)\s*(amb(?:ientes?)?|cuartos?|dormitorios?|habitaciones?|recámaras?|bedrooms?|chambres?|zimmer)",
        body_text, re.I
    )
    if m2:
        rooms = int(m2.group(1))

    bathrooms = None
    m2 = re.search(r"(\d+)\s*ba[ñn]os?|(\d+)\s*bathrooms?|(\d+)\s*wc", body_text, re.I)
    if m2:
        bathrooms = int(next(g for g in m2.groups() if g))

    parking = None
    m2 = re.search(r"(\d+)\s*(cocheras?|garages?|estacionamientos?|plazas?\s*de\s*garaje|parkings?)", body_text, re.I)
    if m2:
        parking = int(m2.group(1))

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
