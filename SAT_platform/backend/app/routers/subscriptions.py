from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import stripe

from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])

PLANS = {
    "basic": {
        "name": "MaxSAT Basic Plan",
        "amount": 999,       # $9.99 in cents
        "currency": "usd",
        "ai_limit": 50,
    }
}


def get_stripe():
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutRequest(BaseModel):
    plan: str


class CheckoutResponse(BaseModel):
    checkout_url: str


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    request: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_stripe()
    plan = PLANS.get(request.plan.lower())
    if not plan:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {request.plan}")

    if current_user.subscription_plan == request.plan.lower():
        raise HTTPException(status_code=400, detail="Already on this plan")

    backend_url = "https://sat-prep-platform-1.onrender.com"

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": plan["currency"],
                    "product_data": {"name": plan["name"]},
                    "unit_amount": plan["amount"],
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url=f"{backend_url}/api/subscriptions/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/pricing",
        metadata={"user_id": current_user.id, "plan": request.plan.lower()},
    )

    return CheckoutResponse(checkout_url=session.url)


@router.get("/success")
def subscription_success(session_id: str, db: Session = Depends(get_db)):
    """Stripe redirects here after successful payment. Upgrades the user plan."""
    get_stripe()
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if session.payment_status != "paid" and session.status != "complete":
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/pricing?error=payment_failed")

    user_id = session.metadata.get("user_id")
    plan = session.metadata.get("plan", "basic")

    if not user_id:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/pricing?error=missing_user")

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.subscription_plan = plan
        user.ai_messages_limit = PLANS.get(plan, {}).get("ai_limit", 50)
        if session.customer:
            user.stripe_customer_id = session.customer
        db.commit()

    return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard?upgraded=true")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe webhook for async event handling (e.g. subscription cancellations)."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"]["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.subscription_plan = "free"
            user.ai_messages_limit = 5
            db.commit()

    return {"received": True}
