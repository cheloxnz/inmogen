import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from app.core.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/billing", tags=["billing"])

PLANS = {
    "starter": {"credits": 30, "price_id": "price_starter"},
    "pro":     {"credits": 100, "price_id": "price_pro"},
    "scale":   {"credits": 9999, "price_id": "price_scale"},
}


@router.post("/checkout")
async def create_checkout(plan: str, x_user_id: str = Header(...)):
    if plan not in PLANS:
        raise HTTPException(400, "Plan inválido")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": PLANS[plan]["price_id"], "quantity": 1}],
        success_url="https://inmogen.app/dashboard?success=1",
        cancel_url="https://inmogen.app/pricing",
        metadata={"user_id": x_user_id, "plan": plan},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(400, str(e))

    if event["type"] == "checkout.session.completed":
        meta = event["data"]["object"]["metadata"]
        user_id = meta["user_id"]
        plan = meta["plan"]
        credits = PLANS[plan]["credits"]
        db = get_db()
        await db.users.update_one(
            {"clerk_id": user_id},
            {"$set": {"plan": plan, "credits": credits}},
            upsert=True,
        )
    return {"ok": True}
