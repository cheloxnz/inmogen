import logging
import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

PLANS = {
    "starter": {"credits": 30,   "price_id": settings.STRIPE_PRICE_STARTER},
    "pro":     {"credits": 100,  "price_id": settings.STRIPE_PRICE_PRO},
    "scale":   {"credits": 9999, "price_id": settings.STRIPE_PRICE_SCALE},
}

CREDIT_PACKS = {
    "pack_10":  {"credits": 10,  "price_id": settings.STRIPE_PRICE_PACK_10},
    "pack_25":  {"credits": 25,  "price_id": settings.STRIPE_PRICE_PACK_25},
    "pack_50":  {"credits": 50,  "price_id": settings.STRIPE_PRICE_PACK_50},
    "pack_100": {"credits": 100, "price_id": settings.STRIPE_PRICE_PACK_100},
}


# ── Suscripciones mensuales ───────────────────────────────────────────────────

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
        client_reference_id=x_user_id,
        metadata={"user_id": x_user_id, "plan": plan},
        subscription_data={"metadata": {"user_id": x_user_id, "plan": plan}},
    )
    return {"checkout_url": session.url}


# ── Paquetes de créditos (one-time) ──────────────────────────────────────────

@router.post("/checkout-pack")
async def create_pack_checkout(pack: str, x_user_id: str = Header(...)):
    if pack not in CREDIT_PACKS:
        raise HTTPException(400, "Pack inválido")
    price_id = CREDIT_PACKS[pack]["price_id"]
    if not price_id:
        raise HTTPException(500, f"Price ID para '{pack}' no configurado en el servidor")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url="https://inmogen-ia.com/dashboard?credits=1",
        cancel_url="https://inmogen-ia.com/pricing",
        client_reference_id=x_user_id,
        metadata={"user_id": x_user_id, "pack": pack, "credits": str(CREDIT_PACKS[pack]["credits"])},
    )
    return {"checkout_url": session.url}


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "STRIPE_WEBHOOK_SECRET no configurado")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
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
        mode = obj.get("mode")

        if mode == "subscription":
            plan = meta.get("plan")
            if user_id and plan and plan in PLANS:
                credits = PLANS[plan]["credits"]
                logger.info("Suscripción: %d créditos plan=%s user=%s", credits, plan, user_id)
                await db.users.update_one(
                    {"clerk_id": user_id},
                    {"$set": {"plan": plan, "credits": credits}},
                    upsert=True,
                )

        elif mode == "payment":
            # Pack de créditos one-time
            pack = meta.get("pack")
            credits_str = meta.get("credits", "0")
            credits = int(credits_str) if credits_str.isdigit() else 0
            if user_id and credits > 0:
                logger.info("Pack: +%d créditos user=%s", credits, user_id)
                await db.users.update_one(
                    {"clerk_id": user_id},
                    {"$inc": {"credits": credits}},
                    upsert=True,
                )

    # ── Renovación mensual ───────────────────────────────────────────────────
    elif event_type == "invoice.paid":
        obj = event["data"]["object"]
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
                    logger.info("Renovación: %d créditos plan=%s user=%s", credits, plan, user_id)
                    await db.users.update_one(
                        {"clerk_id": user_id},
                        {"$set": {"plan": plan, "credits": credits}},
                        upsert=True,
                    )
            except Exception as e:
                logger.error("Error en invoice.paid: %s", e)

    # ── Cancelación ─────────────────────────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        obj = event["data"]["object"]
        user_id = obj.get("metadata", {}).get("user_id")
        if user_id:
            logger.info("Cancelación user=%s", user_id)
            await db.users.update_one(
                {"clerk_id": user_id},
                {"$set": {"plan": "free", "credits": 0}},
            )

    return {"ok": True}


@router.get("/status")
async def billing_status(x_user_id: str = Header(...)):
    db = get_db()
    user = await db.users.find_one({"clerk_id": x_user_id})
    if not user:
        return {"plan": "free", "credits": 0}
    return {"plan": user.get("plan", "free"), "credits": user.get("credits", 0)}
