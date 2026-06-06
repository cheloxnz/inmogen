import logging
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str
    phone: str
    message: str = ""


@router.post("/{job_id}")
async def create_lead(job_id: str, body: LeadCreate):
    """Recibe un lead desde la landing page pública de una propiedad."""
    if not body.name.strip() or not body.phone.strip():
        raise HTTPException(400, "Nombre y teléfono son requeridos")

    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(404, "Propiedad no encontrada")

    lead = {
        "job_id": job_id,
        "agent_id": job.get("user_id"),
        "property_url": job.get("property_url"),
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "message": body.message.strip(),
        "source": "landing",
        "created_at": datetime.utcnow(),
        "read": False,
    }
    result = await db.leads.insert_one(lead)
    logger.info("Lead creado %s para job %s", str(result.inserted_id), job_id)
    return {"ok": True, "lead_id": str(result.inserted_id)}


@router.get("/{job_id}")
async def list_leads(job_id: str, x_user_id: str = Header(...)):
    """Lista los leads de un job (solo el dueño del job)."""
    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": x_user_id})
    if not job:
        raise HTTPException(404, "Job no encontrado")

    cursor = db.leads.find({"job_id": job_id}).sort("created_at", -1)
    leads = []
    async for lead in cursor:
        lead["id"] = str(lead.pop("_id"))
        leads.append(lead)
    return {"leads": leads, "total": len(leads)}
