'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Deck {
  id: string;
  name: string;
  card_count: number;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [newDeckName, setNewDeckName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecks();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Flashcards</h1>

      {/* Create Deck */}
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

      {/* Decks Grid */}
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
            <div key={deck.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="font-bold text-gray-900">{deck.name}</h3>
              <p className="text-sm text-gray-500 mt-2">{deck.card_count} cards</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
