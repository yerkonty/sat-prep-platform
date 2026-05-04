from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import FlashcardDeck, Flashcard
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])

MAX_INTERVAL_DAYS = 30
RELEARN_MINUTES = 10


class FlashcardDeckResponse(BaseModel):
    id: str
    name: str
    card_count: int
    is_shared: bool
    
    class Config:
        from_attributes = True


class FlashcardResponse(BaseModel):
    id: str
    front: str
    back: str

    class Config:
        from_attributes = True


class StudyCardResponse(BaseModel):
    id: str
    front: str
    back: str
    deck_id: str
    deck_name: str
    interval_days: int


class ReviewRequest(BaseModel):
    quality: Literal["got_it", "needs_review"]


class ReviewResponse(BaseModel):
    id: str
    next_review: datetime
    interval_days: int


class CreateDeckRequest(BaseModel):
    name: str
    is_shared: Optional[bool] = False


class CreateCardRequest(BaseModel):
    deck_id: str
    front: str
    back: str


class ShareDeckRequest(BaseModel):
    is_shared: bool


@router.get("/decks", response_model=List[FlashcardDeckResponse])
def get_decks(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's flashcard decks"""
    decks = db.query(FlashcardDeck).filter(
        or_(
            FlashcardDeck.user_id == current_user.id,
            FlashcardDeck.user_id == None,
            FlashcardDeck.is_shared == True
        )
    ).all()
    
    result = []
    for deck in decks:
        card_count = db.query(Flashcard).filter(Flashcard.deck_id == deck.id).count()
        result.append(FlashcardDeckResponse(
            id=deck.id,
            name=deck.name,
            card_count=card_count,
            is_shared=bool(deck.is_shared)
        ))
    
    return result


@router.post("/decks", response_model=FlashcardDeckResponse)
def create_deck(
    request: CreateDeckRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new flashcard deck"""
    deck = FlashcardDeck(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=request.name,
        is_shared=bool(request.is_shared)
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    
    return FlashcardDeckResponse(id=deck.id, name=deck.name, card_count=0, is_shared=bool(deck.is_shared))


@router.get("/decks/{deck_id}/cards", response_model=List[FlashcardResponse])
def get_cards(
    deck_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards in a deck"""
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == deck_id).first()
    if not deck or not (
        deck.user_id == current_user.id or deck.is_shared or deck.user_id is None
    ):
        raise HTTPException(status_code=404, detail="Deck not found or not shared")

    cards = db.query(Flashcard).filter(Flashcard.deck_id == deck_id).all()
    return cards


@router.post("/cards", response_model=FlashcardResponse)
def create_card(
    request: CreateCardRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new flashcard"""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == request.deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    card = Flashcard(
        id=str(uuid.uuid4()),
        deck_id=request.deck_id,
        front=request.front,
        back=request.back
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    
    return card


@router.put("/decks/{deck_id}/share", response_model=FlashcardDeckResponse)
def share_deck(
    deck_id: str,
    request: ShareDeckRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle sharing for a deck (owner only)."""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    deck.is_shared = request.is_shared
    db.commit()
    db.refresh(deck)

    card_count = db.query(Flashcard).filter(Flashcard.deck_id == deck.id).count()
    return FlashcardDeckResponse(
        id=deck.id,
        name=deck.name,
        card_count=card_count,
        is_shared=bool(deck.is_shared)
    )


def _accessible_deck_ids(db: Session, user_id: str, deck_id: Optional[str]) -> List[str]:
    """Return deck IDs the user can study from. If deck_id is given, restrict to that one."""
    q = db.query(FlashcardDeck).filter(
        or_(
            FlashcardDeck.user_id == user_id,
            FlashcardDeck.user_id == None,
            FlashcardDeck.is_shared == True,
        )
    )
    if deck_id:
        q = q.filter(FlashcardDeck.id == deck_id)
    return [d.id for d in q.all()]


@router.get("/study", response_model=List[StudyCardResponse])
def get_due_cards(
    deck_id: Optional[str] = None,
    limit: int = 50,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return cards whose next_review is due now, oldest first."""
    deck_ids = _accessible_deck_ids(db, current_user.id, deck_id)
    if not deck_ids:
        return []

    now = datetime.utcnow()
    rows = (
        db.query(Flashcard, FlashcardDeck.name)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .filter(Flashcard.deck_id.in_(deck_ids))
        .filter(Flashcard.next_review <= now)
        .order_by(Flashcard.next_review.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return [
        StudyCardResponse(
            id=card.id,
            front=card.front,
            back=card.back,
            deck_id=card.deck_id,
            deck_name=deck_name,
            interval_days=card.interval_days or 0,
        )
        for card, deck_name in rows
    ]


@router.post("/cards/{card_id}/review", response_model=ReviewResponse)
def review_card(
    card_id: str,
    request: ReviewRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a review and reschedule the card via simple SRS."""
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == card.deck_id).first()
    if not deck or not (deck.user_id == current_user.id or deck.is_shared or deck.user_id is None):
        raise HTTPException(status_code=404, detail="Card not accessible")

    now = datetime.utcnow()
    if request.quality == "needs_review":
        card.interval_days = 0
        card.next_review = now + timedelta(minutes=RELEARN_MINUTES)
    else:
        prev = card.interval_days or 0
        new_interval = 1 if prev == 0 else min(prev * 2, MAX_INTERVAL_DAYS)
        card.interval_days = new_interval
        card.next_review = now + timedelta(days=new_interval)

    db.commit()
    db.refresh(card)
    return ReviewResponse(id=card.id, next_review=card.next_review, interval_days=card.interval_days or 0)
