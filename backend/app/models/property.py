from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class PropertyData(BaseModel):
    url: str
    title: str
    price: str
    currency: str = "USD"
    location: str
    neighborhood: str = ""
    city: str = ""
    description: str = ""
    area_m2: Optional[float] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking: Optional[int] = None
    photos: list[str] = []
    portal: str = ""
    scraped_at: datetime = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
