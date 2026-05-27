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
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">SAT Flashcards</h1>
            <p className="text-text-3 text-sm">Pick a deck to start studying</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 text-text-3">
              <Layers className="w-10 h-10 mx-auto mb-3 text-text-3/40" />
              No decks available yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => startStudy(deck)}
                  className="text-left p-5 bg-card rounded-xl border border-border hover:border-accent/40 hover:shadow-md transition-[transform,border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease)] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-1.5 bg-accent/10 rounded-lg">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    {deck.is_shared && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Shared
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-foreground mb-0.5">{deck.name}</h2>
                  <p className="text-sm text-text-3 tabular-nums">{deck.card_count} cards</p>
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={exitStudy}
          className="flex items-center gap-2 text-sm text-text-3 hover:text-foreground mb-5 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to decks
        </button>

        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-foreground mb-1">{activeDeck?.name}</h1>
          <p className="text-sm text-text-3 tabular-nums">
            {reviewedCount} reviewed · {queue.length} left
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!card ? (
          <div className="bg-card border border-border rounded-2xl shadow-sm p-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-accent" />
            <h2 className="text-lg font-semibold text-foreground mb-2">All caught up</h2>
            <p className="text-text-3 mb-5 text-sm">
              {reviewedCount > 0
                ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Nothing else is due right now.`
                : 'No cards are due in this deck right now. Check back later.'}
            </p>
            <button
              onClick={exitStudy}
              className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-accent transition-colors font-medium active:scale-[0.97]"
            >
              Back to decks
            </button>
          </div>
        ) : (
          <>
            <div
              className="relative h-72 w-full cursor-pointer group"
              onClick={() => setIsFlipped((f) => !f)}
              style={{ perspective: '1000px' }}
            >
              <div
                className="w-full h-full transition-transform duration-[var(--dur-slow)] ease-[var(--ease-in-out)] relative"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute w-full h-full bg-card border-2 border-border rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center hover:border-accent/30 transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider text-text-3">
                    Front
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">{card.front}</h2>
                  <div className="absolute bottom-5 flex items-center gap-2 text-accent text-sm">
                    <RotateCw className="w-4 h-4" /> Click to flip
                  </div>
                </div>

                <div
                  className="absolute w-full h-full bg-accent/5 border-2 border-accent/20 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider text-accent/50">
                    Back
                  </span>
                  <p className="text-xl font-medium text-primary">{card.back}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => grade('needs_review')}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm active:scale-[0.97]"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Needs review
              </button>
              <button
                onClick={() => grade('got_it')}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm active:scale-[0.97]"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Got it
              </button>
            </div>

            <p className="text-center text-xs text-text-3 mt-3 tabular-nums">
              Card {reviewedCount + 1} of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
