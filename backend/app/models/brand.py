from pydantic import BaseModel
from typing import Optional


class BrandConfig(BaseModel):
    agency_name: str
    logo_url: str
    primary_color: str = "#1A3C6E"
    secondary_color: str = "#F5A623"
    text_color: str = "#FFFFFF"
    font_family: str = "Inter"
    phone: str = ""
    website: str = ""
    instagram: str = ""
