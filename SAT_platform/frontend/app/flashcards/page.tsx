'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Deck {
  id: string;
  name: string;
  card_count: number;
}

interface Card {
  id: string;
  front: string;
  back: string;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [newDeckName, setNewDeckName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewCard, setShowNewCard] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  useEffect(() => {
    if (selectedDeck) {
      fetchCards(selectedDeck.id);
    }
  }, [selectedDeck]);

  const fetchDecks = async () => {
    try {
      const response = await api.get('/api/flashcards/decks');
      setDecks(response.data);
    } catch (error) {
      console.error('Failed to fetch decks');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async (deckId: string) => {
    try {
      const response = await api.get(`/api/flashcards/decks/${deckId}/cards`);
      setCards(response.data);
    } catch (error) {
      console.error('Failed to fetch cards');
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    try {
      await api.post('/api/flashcards/decks', { name: newDeckName });
      setNewDeckName('');
      fetchDecks();
    } catch (error) {
      console.error('Failed to create deck');
    }
  };

  const createCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck) return;
    try {
      await api.post('/api/flashcards/cards', {
        deck_id: selectedDeck.id,
        front: newCardFront,
        back: newCardBack
      });
      setNewCardFront('');
      setNewCardBack('');
      setShowNewCard(false);
      fetchCards(selectedDeck.id);
      fetchDecks();
    } catch (error) {
      console.error('Failed to create card');
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const currentCard = cards[currentCardIndex];

  if (selectedDeck) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setSelectedDeck(null); setStudyMode(false); }}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Decks
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedDeck.name}</h1>
          <button
            onClick={() => setStudyMode(!studyMode)}
            className={`px-4 py-2 rounded-lg ${studyMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
          >
            {studyMode ? 'Exit Study' : 'Study Mode'}
          </button>
        </div>

        {studyMode && cards.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-4">
              Card {currentCardIndex + 1} of {cards.length}
            </div>
            
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="min-h-[300px] flex items-center justify-center cursor-pointer perspective-1000"
            >
              <div className={`w-full max-w-2xl min-h-[250px] p-8 rounded-xl shadow-lg transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                   style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', transformStyle: 'preserve-3d' }}>
                <div className="text-white text-center" style={{ backfaceVisibility: 'hidden' }}>
                  <div className="text-sm uppercase tracking-wide mb-4 text-purple-200">Front</div>
                  <div className="text-2xl font-bold">{currentCard?.front}</div>
                  <div className="mt-6 text-sm text-purple-200">Click to flip</div>
                </div>
                <div className="text-white text-center absolute inset-0 p-8 flex flex-col justify-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                  <div className="text-sm uppercase tracking-wide mb-4 text-purple-200">Back</div>
                  <div className="text-2xl font-bold">{currentCard?.back}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={prevCard}
                className="px-6 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
              >
                Previous
              </button>
              <button
                onClick={nextCard}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              {!showNewCard ? (
                <button
                  onClick={() => setShowNewCard(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500"
                >
                  + Add New Card
                </button>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newCardFront}
                    onChange={(e) => setNewCardFront(e.target.value)}
                    placeholder="Front (question/term)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newCardBack}
                    onChange={(e) => setNewCardBack(e.target.value)}
                    placeholder="Back (answer/definition)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createCard}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Card
                    </button>
                    <button
                      onClick={() => setShowNewCard(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {cards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500">No cards in this deck</p>
                <p className="text-sm text-gray-400 mt-2">Add your first card above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 uppercase">Front</div>
                        <div className="font-medium text-gray-900">{card.front}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 uppercase">Back</div>
                        <div className="font-medium text-gray-700">{card.back}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Flashcards</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="New deck name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createDeck}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Deck
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : decks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-gray-500">No flashcard decks yet</p>
          <p className="text-sm text-gray-400 mt-2">Create your first deck above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {decks.map(deck => (
            <div 
              key={deck.id} 
              onClick={() => setSelectedDeck(deck)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <h3 className="font-bold text-gray-900">{deck.name}</h3>
              <p className="text-sm text-gray-500 mt-2">{deck.card_count} cards</p>
              <button className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                View Deck →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
