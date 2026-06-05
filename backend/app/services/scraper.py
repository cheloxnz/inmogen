from apify_client import ApifyClient
from app.core.config import settings
from app.models.property import PropertyData
from datetime import datetime
import re


PORTAL_ACTORS = {
    "zonaprop.com.ar": "dtrungtin/zonaprop-scraper",
    "inmuebles24.com": "misceres/inmuebles24-scraper",
    "idealista.com": "misceres/idealista-scraper",
    "fotocasa.es": "misceres/fotocasa-scraper",
    "argenprop.com": "dtrungtin/argenprop-scraper",
}


def detect_portal(url: str) -> str:
    for domain in PORTAL_ACTORS:
        if domain in url:
            return domain
    return "generic"


def get_actor_for_url(url: str) -> str:
    domain = detect_portal(url)
    return PORTAL_ACTORS.get(domain, "apify/web-scraper")


async def scrape_property(url: str) -> PropertyData:
    client = ApifyClient(settings.APIFY_TOKEN)
    actor_id = get_actor_for_url(url)
    portal = detect_portal(url)

    run_input = {
        "startUrls": [{"url": url}],
        "maxItems": 1,
    }

    run = client.actor(actor_id).call(run_input=run_input)

    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    if not items:
        raise ValueError(f"No se pudo extraer datos de {url}")

    raw = items[0]
    return _normalize(raw, url, portal)


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
