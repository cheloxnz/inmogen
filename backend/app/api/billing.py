import logging
import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

# price_id se configura en Stripe Dashboard → Products → copiar el Price ID (price_xxx)
PLANS = {
    "starter": {"credits": 30,   "price_id": settings.STRIPE_PRICE_STARTER},
    "pro":     {"credits": 100,  "price_id": settings.STRIPE_PRICE_PRO},
    "scale":   {"credits": 9999, "price_id": settings.STRIPE_PRICE_SCALE},
}


@router.post("/checkout")
async def create_checkout(plan: str, x_user_id: str = Header(...)):
    if plan not in PLANS:
        raise HTTPException(400, "Plan inválido")
    if not PLANS[plan]["price_id"]:
        raise HTTPException(500, f"Price ID para '{plan}' no configurado")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": PLANS[plan]["price_id"], "quantity": 1}],
        success_url="https://inmogen-ia.com/dashboard?success=1",
        cancel_url="https://inmogen-ia.com/pricing",
        # Pasamos user_id y plan en client_reference_id Y metadata
        # para tenerlo disponible tanto en checkout.session.completed
        # como en invoice.paid (renovaciones mensuales)
        client_reference_id=x_user_id,
        metadata={"user_id": x_user_id, "plan": plan},
        subscription_data={"metadata": {"user_id": x_user_id, "plan": plan}},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "STRIPE_WEBHOOK_SECRET no configurado")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError as e:
        logger.warning("Stripe webhook signature inválida: %s", e)
        raise HTTPException(400, "Firma inválida")
    except Exception as e:
        logger.error("Error procesando webhook: %s", e)
        raise HTTPException(400, str(e))

    event_type = event["type"]
    logger.info("Stripe event: %s", event_type)

    db = get_db()

    # ── Primera suscripción ──────────────────────────────────────────────────
    if event_type == "checkout.session.completed":
        obj = event["data"]["object"]
        meta = obj.get("metadata", {})
        user_id = meta.get("user_id") or obj.get("client_reference_id")
        plan = meta.get("plan")

        if not user_id or not plan or plan not in PLANS:
            logger.warning("checkout.session.completed sin user_id/plan válido: %s", meta)
            return {"ok": True}

        credits = PLANS[plan]["credits"]
        logger.info("Asignando %d créditos plan=%s a user=%s", credits, plan, user_id)
        await db.users.update_one(
            {"clerk_id": user_id},
            {"$set": {"plan": plan, "credits": credits}},
            upsert=True,
        )

    # ── Renovación mensual ───────────────────────────────────────────────────
    elif event_type == "invoice.paid":
        obj = event["data"]["object"]
        # En renovaciones el metadata está en la suscripción
        sub_id = obj.get("subscription")
        if sub_id:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                sub = stripe.Subscription.retrieve(sub_id)
                meta = sub.get("metadata", {})
                user_id = meta.get("user_id")
                plan = meta.get("plan")
                if user_id and plan and plan in PLANS:
                    credits = PLANS[plan]["credits"]
                    logger.info("Renovación: asignando %d créditos plan=%s a user=%s", credits, plan, user_id)
                    await db.users.update_one(
                        {"clerk_id": user_id},
                        {"$set": {"plan": plan, "credits": credits}},
                        upsert=True,
                    )
            except Exception as e:
                logger.error("Error recuperando suscripción en invoice.paid: %s", e)

    # ── Cancelación ─────────────────────────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        obj = event["data"]["object"]
        meta = obj.get("metadata", {})
        user_id = meta.get("user_id")
        if user_id:
            logger.info("Suscripción cancelada para user=%s", user_id)
            await db.users.update_one(
                {"clerk_id": user_id},
                {"$set": {"plan": "free", "credits": 0}},
            )

    return {"ok": True}


@router.get("/status")
async def billing_status(x_user_id: str = Header(...)):
    """Retorna créditos y plan actual del usuario."""
    db = get_db()
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user:
        return {"plan": "free", "credits": 0}
    return {"plan": user.get("plan", "free"), "credits": user.get("credits", 0)}
