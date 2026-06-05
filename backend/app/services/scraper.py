from apify_client import ApifyClient
from app.core.config import settings
from app.models.property import PropertyData
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
import json
import re


def detect_portal(url: str) -> str:
    portals = ["zonaprop.com.ar", "inmuebles24.com", "idealista.com", "fotocasa.es", "argenprop.com"]
    for p in portals:
        if p in url:
            return p
    return "generic"


async def scrape_property(url: str) -> PropertyData:
    portal = detect_portal(url)

    if portal == "zonaprop.com.ar":
        return await _scrape_zonaprop(url)
    else:
        # Fallback: Apify generic scraper
        return await _scrape_apify_generic(url, portal)


async def _scrape_zonaprop(url: str) -> PropertyData:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-AR,es;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        r = await client.get(url)
        r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    # JSON-LD schema
    data = {}
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            obj = json.loads(tag.string)
            if obj.get("@type") in ("RealEstateListing", "Product", "Residence"):
                data = obj
                break
        except Exception:
            pass

    # Título
    title = (
        data.get("name")
        or (soup.find("h1") and soup.find("h1").get_text(strip=True))
        or "Propiedad"
    )

    # Precio
    price_tag = soup.find(class_=re.compile(r"price|precio", re.I))
    price = price_tag.get_text(strip=True) if price_tag else data.get("price", "Consultar")
    price = re.sub(r"[^\d.,]", "", str(price)) or "Consultar"

    # Ubicación
    location = (
        data.get("address", {}).get("streetAddress", "")
        or (soup.find(class_=re.compile(r"address|ubicacion|location", re.I)) and
            soup.find(class_=re.compile(r"address|ubicacion|location", re.I)).get_text(strip=True))
        or ""
    )

    # Fotos
    photos = []
    for img in soup.find_all("img", src=re.compile(r"zonaprop|cdn|foto|photo|img", re.I)):
        src = img.get("src") or img.get("data-src", "")
        if src and src.startswith("http") and src not in photos:
            photos.append(src)
    photos = photos[:10]

    # Atributos (m², ambientes)
    area = None
    rooms = None
    bathrooms = None
    for tag in soup.find_all(class_=re.compile(r"feature|caracteristica|attribute|attr", re.I)):
        text = tag.get_text(strip=True).lower()
        m = re.search(r"(\d+)\s*m²", text)
        if m:
            area = float(m.group(1))
        m = re.search(r"(\d+)\s*(amb|cuarto|dormitorio|habitacion)", text)
        if m:
            rooms = int(m.group(1))
        m = re.search(r"(\d+)\s*(baño|bathroom)", text)
        if m:
            bathrooms = int(m.group(1))

    return PropertyData(
        url=url,
        title=title[:100],
        price=price,
        currency="USD",
        location=location[:100],
        photos=photos,
        area_m2=area,
        rooms=rooms,
        bathrooms=bathrooms,
        portal="zonaprop.com.ar",
        scraped_at=datetime.utcnow(),
    )


async def _scrape_apify_generic(url: str, portal: str) -> PropertyData:
    client = ApifyClient(settings.APIFY_TOKEN)
    run = client.actor("apify/cheerio-scraper").call(run_input={
        "startUrls": [{"url": url}],
        "maxRequestsPerCrawl": 1,
        "pageFunction": """async function pageFunction({ $, request }) {
            return {
                title: $('h1').first().text().trim(),
                price: $('.price, .precio, [class*=price]').first().text().trim(),
                location: $('[class*=address], [class*=location], [class*=ubicacion]').first().text().trim(),
                photos: $('img[src*=foto], img[src*=photo], img[src*=cdn]').map((i, el) => $(el).attr('src')).get().slice(0, 8),
            };
        }"""
    })
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    if not items:
        raise ValueError(f"No se pudo extraer datos de {url}")
    raw = items[0]
    return PropertyData(
        url=url,
        title=raw.get("title", "Propiedad"),
        price=re.sub(r"[^\d.,]", "", raw.get("price", "")) or "Consultar",
        currency="USD",
        location=raw.get("location", ""),
        photos=raw.get("photos", []),
        portal=portal,
        scraped_at=datetime.utcnow(),
    )


def _normalize(raw: dict, url: str, portal: str) -> PropertyData:
    """Normaliza la respuesta de distintos actores Apify a PropertyData."""
    photos = (
        raw.get("images", [])
        or raw.get("photos", [])
        or raw.get("imageUrls", [])
        or []
    )
    if photos and isinstance(photos[0], dict):
        photos = [p.get("url", p.get("src", "")) for p in photos]

    price_raw = str(raw.get("price", raw.get("priceValue", "Consultar")))
    currency = raw.get("currency", "USD")

    return PropertyData(
        url=url,
        title=raw.get("title", raw.get("name", "Propiedad")),
        price=price_raw,
        currency=currency,
        location=raw.get("address", raw.get("location", raw.get("fullAddress", ""))),
        neighborhood=raw.get("neighborhood", raw.get("barrio", "")),
        city=raw.get("city", raw.get("ciudad", "")),
        description=raw.get("description", "")[:500],
        area_m2=_parse_float(raw.get("surfaceTotal", raw.get("area", raw.get("m2")))),
        rooms=_parse_int(raw.get("rooms", raw.get("ambientes", raw.get("bedrooms")))),
        bathrooms=_parse_int(raw.get("bathrooms", raw.get("banos"))),
        parking=_parse_int(raw.get("parking", raw.get("garages", raw.get("cocheras")))),
        photos=photos[:10],
        portal=portal,
        scraped_at=datetime.utcnow(),
    )


def _parse_float(val) -> float | None:
    try:
        return float(str(val).replace(",", ".").replace(" ", ""))
    except (TypeError, ValueError):
        return None


def _parse_int(val) -> int | None:
    try:
        return int(str(val).split(".")[0])
    except (TypeError, ValueError):
        return None
