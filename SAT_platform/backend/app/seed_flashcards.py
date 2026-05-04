"""Seed shared flashcard decks at startup. Idempotent."""
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
import uuid

from app.models import FlashcardDeck, Flashcard


SHARED_DECKS = [
    {
        "name": "SAT Vocabulary Essentials",
        "cards": [
            ("Ambiguous", "Open to more than one interpretation; unclear."),
            ("Benevolent", "Kind, well-meaning, and generous."),
            ("Candid", "Truthful and straightforward; frank."),
            ("Diligent", "Showing care and persistent effort in one's work."),
            ("Eloquent", "Fluent and persuasive in speaking or writing."),
            ("Frugal", "Sparing or economical with money or food."),
            ("Gregarious", "Fond of the company of others; sociable."),
            ("Hackneyed", "Lacking originality; overused and unoriginal."),
            ("Impartial", "Treating all sides equally; unbiased."),
            ("Juxtapose", "To place close together for contrasting effect."),
            ("Lucid", "Clear and easy to understand."),
            ("Mitigate", "To make less severe, harmful, or painful."),
            ("Nuance", "A subtle difference in meaning, tone, or expression."),
            ("Obsolete", "No longer in use; outdated."),
            ("Pragmatic", "Dealing with things practically rather than theoretically."),
            ("Quell", "To suppress or put an end to."),
            ("Resilient", "Able to recover quickly from difficult conditions."),
            ("Skeptical", "Not easily convinced; doubting."),
            ("Tenacious", "Tending to keep a firm hold; persistent."),
            ("Ubiquitous", "Present, appearing, or found everywhere."),
            ("Vindicate", "To clear of blame or suspicion."),
            ("Wary", "Feeling or showing caution about possible dangers."),
            ("Zealous", "Showing great energy or enthusiasm for a cause."),
            ("Pernicious", "Having a harmful effect, especially in a gradual way."),
            ("Conciliate", "To overcome the distrust or hostility of; placate."),
        ],
    },
    {
        "name": "SAT Math Formulas",
        "cards": [
            ("Area of a circle", "A = πr²"),
            ("Circumference of a circle", "C = 2πr"),
            ("Area of a triangle", "A = ½ × base × height"),
            ("Pythagorean theorem", "a² + b² = c²"),
            ("Quadratic formula", "x = (−b ± √(b² − 4ac)) / 2a"),
            ("Slope of a line", "m = (y₂ − y₁) / (x₂ − x₁)"),
            ("Slope-intercept form", "y = mx + b"),
            ("Point-slope form", "y − y₁ = m(x − x₁)"),
            ("Distance formula", "d = √((x₂ − x₁)² + (y₂ − y₁)²)"),
            ("Midpoint formula", "M = ((x₁ + x₂)/2, (y₁ + y₂)/2)"),
            ("Equation of a circle", "(x − h)² + (y − k)² = r²"),
            ("Volume of a rectangular prism", "V = l × w × h"),
            ("Volume of a cylinder", "V = πr²h"),
            ("Volume of a sphere", "V = (4/3)πr³"),
            ("Volume of a cone", "V = (1/3)πr²h"),
            ("Sum of interior angles of a polygon", "(n − 2) × 180°"),
            ("Sin / Cos / Tan (SOH-CAH-TOA)", "sin = opp/hyp, cos = adj/hyp, tan = opp/adj"),
            ("Special right triangle 30-60-90", "sides in ratio 1 : √3 : 2"),
            ("Special right triangle 45-45-90", "sides in ratio 1 : 1 : √2"),
            ("Probability", "P(event) = favorable outcomes / total outcomes"),
            ("Average (mean)", "sum of values / number of values"),
            ("Percent change", "((new − old) / old) × 100%"),
            ("Exponent rule (multiplication)", "aᵐ × aⁿ = aᵐ⁺ⁿ"),
            ("Exponent rule (power of a power)", "(aᵐ)ⁿ = aᵐⁿ"),
            ("Difference of squares", "a² − b² = (a + b)(a − b)"),
        ],
    },
]


def seed_shared_decks(engine: Engine) -> None:
    """Create the shared decks + cards if they don't already exist. Match by deck name."""
    with Session(engine) as db:
        for spec in SHARED_DECKS:
            deck = (
                db.query(FlashcardDeck)
                .filter(FlashcardDeck.name == spec["name"], FlashcardDeck.user_id.is_(None))
                .first()
            )
            if deck is None:
                deck = FlashcardDeck(
                    id=str(uuid.uuid4()),
                    user_id=None,
                    name=spec["name"],
                    is_shared=True,
                )
                db.add(deck)
                db.flush()

            existing_fronts = {
                c.front for c in db.query(Flashcard).filter(Flashcard.deck_id == deck.id).all()
            }
            for front, back in spec["cards"]:
                if front in existing_fronts:
                    continue
                db.add(Flashcard(
                    id=str(uuid.uuid4()),
                    deck_id=deck.id,
                    front=front,
                    back=back,
                ))
        db.commit()
