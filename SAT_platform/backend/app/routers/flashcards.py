from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.database import get_db
from app.models import FlashcardDeck, Flashcard
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


class FlashcardDeckResponse(BaseModel):
    id: str
    name: str
    card_count: int
    
    class Config:
        from_attributes = True


class FlashcardResponse(BaseModel):
    id: str
    front: str
    back: str
    
    class Config:
        from_attributes = True


class CreateDeckRequest(BaseModel):
    name: str


class CreateCardRequest(BaseModel):
    deck_id: str
    front: str
    back: str


@router.get("/decks", response_model=List[FlashcardDeckResponse])
def get_decks(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's flashcard decks"""
    decks = db.query(FlashcardDeck).filter(
        (FlashcardDeck.user_id == current_user.id) | (FlashcardDeck.user_id == None)
    ).all()
    
    result = []
    for deck in decks:
        card_count = db.query(Flashcard).filter(Flashcard.deck_id == deck.id).count()
        result.append(FlashcardDeckResponse(
            id=deck.id,
            name=deck.name,
            card_count=card_count
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
        name=request.name
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    
    return FlashcardDeckResponse(id=deck.id, name=deck.name, card_count=0)


@router.get("/decks/{deck_id}/cards", response_model=List[FlashcardResponse])
def get_cards(
    deck_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards in a deck"""
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
