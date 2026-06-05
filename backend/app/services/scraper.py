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
    """Descarga HTML usando ScraperAPI para bypassear anti-bot."""
    api_url = (
        f"https://api.scraperapi.com"
        f"?api_key={settings.SCRAPERAPI_KEY}"
        f"&url={quote_plus(url)}"
        f"&render=true"          # JS rendering
        f"&country_code=ar"      # IP Argentina para Zonaprop
    )
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(api_url)
        r.raise_for_status()
    return r.text


async def scrape_property(url: str) -> PropertyData:
    portal = detect_portal(url)
    html = await _fetch_with_scraperapi(url)
    soup = BeautifulSoup(html, "lxml")
    return _parse_property(soup, url, portal)


def _parse_property(soup: BeautifulSoup, url: str, portal: str) -> PropertyData:
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
    if "$" in (soup.find(class_=re.compile(r"price|precio", re.I)) or BeautifulSoup("", "lxml")).get_text():
        currency = "ARS" if "zonaprop" in portal or "argenprop" in portal else "USD"
    if "USD" in html_upper(soup):
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

    # --- Fotos ---
    photos = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
        if (
            src.startswith("http")
            and any(k in src.lower() for k in ["foto", "photo", "cdn", "media", "img", "image"])
            and src not in photos
            and not any(k in src.lower() for k in ["logo", "icon", "avatar", "banner"])
        ):
            photos.append(src)
    photos = photos[:10]

    # --- Atributos desde texto del body ---
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


def html_upper(soup: BeautifulSoup) -> str:
    return soup.get_text().upper()
