from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    GENERATING = "generating"
    DONE = "done"
    ERROR = "error"


class GenerationJob(BaseModel):
    id: Optional[str] = None
    user_id: str
    property_url: str
    status: JobStatus = JobStatus.PENDING
    property_data: Optional[dict] = None
    creatives: list[str] = []
    zip_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
