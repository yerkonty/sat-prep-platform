'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { AxiosError } from 'axios';
import api from '@/lib/api';

interface Deck {
  id: string;
  name: string;
  card_count: number;
  is_shared: boolean;
}

interface StudyCard {
  id: string;
  front: string;
  back: string;
  deck_id: string;
  deck_name: string;
  interval_days: number;
}

type View = 'decks' | 'study';
type Quality = 'got_it' | 'needs_review';

export default function FlashcardsPage() {
  const [view, setView] = useState<View>('decks');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Deck[]>('/api/flashcards/decks');
      setDecks(data);
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      setError(ax.response?.data?.detail || 'Could not load decks. Are you signed in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'decks') loadDecks();
  }, [view, loadDecks]);

  const startStudy = async (deck: Deck) => {
    setActiveDeck(deck);
    setReviewedCount(0);
    setIsFlipped(false);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<StudyCard[]>('/api/flashcards/study', {
        params: { deck_id: deck.id, limit: 50 },
      });
      setQueue(data);
      setView('study');
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      setError(ax.response?.data?.detail || 'Could not start study session.');
      setActiveDeck(null);
    } finally {
      setLoading(false);
    }
  };

  const exitStudy = () => {
    setView('decks');
    setActiveDeck(null);
    setQueue([]);
    setIsFlipped(false);
  };

  const grade = async (quality: Quality) => {
    if (submitting || queue.length === 0) return;
    const card = queue[0];
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/flashcards/cards/${card.id}/review`, { quality });
      setIsFlipped(false);
      setReviewedCount((n) => n + 1);
      setQueue((prev) => prev.slice(1));
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      setError(ax.response?.data?.detail || 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'decks') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">SAT Flashcards</h1>
            <p className="text-[#1A1A1A]/50">Pick a deck to start studying</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 text-[#1A1A1A]/50">
              <Layers className="w-10 h-10 mx-auto mb-3 text-[#1A1A1A]/20" />
              No decks available yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => startStudy(deck)}
                  className="text-left p-6 bg-white rounded-2xl border border-[#00592B]/10 hover:border-[#10B981]/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-[#10B981]/10 rounded-lg">
                      <BookOpen className="w-5 h-5 text-[#00592B]" />
                    </div>
                    {deck.is_shared && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Shared
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">{deck.name}</h2>
                  <p className="text-sm text-[#1A1A1A]/50">{deck.card_count} cards</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const card = queue[0];
  const total = queue.length + reviewedCount;

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={exitStudy}
          className="flex items-center gap-2 text-sm text-[#1A1A1A]/50 hover:text-[#1A1A1A] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to decks
        </button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">{activeDeck?.name}</h1>
          <p className="text-sm text-[#1A1A1A]/50">
            {reviewedCount} reviewed · {queue.length} left
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!card ? (
          <div className="bg-white border border-[#00592B]/10 rounded-2xl shadow-sm p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-[#10B981]" />
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">All caught up!</h2>
            <p className="text-[#1A1A1A]/50 mb-6">
              {reviewedCount > 0
                ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Nothing else is due right now.`
                : 'No cards are due in this deck right now. Check back later.'}
            </p>
            <button
              onClick={exitStudy}
              className="px-6 py-3 bg-[#00592B] text-white rounded-xl hover:bg-[#10B981] transition-colors font-medium"
            >
              Back to decks
            </button>
          </div>
        ) : (
          <>
            <div
              className="relative h-80 w-full cursor-pointer group"
              onClick={() => setIsFlipped((f) => !f)}
              style={{ perspective: '1000px' }}
            >
              <div
                className="w-full h-full transition-transform duration-500 relative"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute w-full h-full bg-white border-2 border-[#00592B]/10 rounded-2xl shadow-md flex flex-col items-center justify-center p-8 text-center hover:border-[#10B981]/30 transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/30">
                    Front
                  </span>
                  <h2 className="text-2xl font-semibold text-[#1A1A1A]">{card.front}</h2>
                  <div className="absolute bottom-6 flex items-center gap-2 text-[#10B981] text-sm">
                    <RotateCw className="w-4 h-4" /> Click to flip
                  </div>
                </div>

                <div
                  className="absolute w-full h-full bg-[#10B981]/5 border-2 border-[#10B981]/20 rounded-2xl shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-[#10B981]/50">
                    Back
                  </span>
                  <p className="text-2xl font-medium text-[#00592B]">{card.back}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => grade('needs_review')}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Needs Review
              </button>
              <button
                onClick={() => grade('got_it')}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00592B] text-white hover:bg-[#10B981] disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Got it
              </button>
            </div>

            <p className="text-center text-xs text-[#1A1A1A]/40 mt-4">
              Card {reviewedCount + 1} of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
