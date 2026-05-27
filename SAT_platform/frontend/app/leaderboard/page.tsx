'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import api from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  questions_answered: number;
  accuracy: number;
  best_exam_score: number | null;
  is_current_user: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-neutral-400',
  3: 'text-amber-600',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/leaderboard')
      .then((res) => setEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-primary mb-6">Class Leaderboard</h1>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-semibold text-text-2 border-b border-border">
                <th className="px-5 py-3 w-16">Rank</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3 text-right">Questions</th>
                <th className="px-5 py-3 text-right">Accuracy</th>
                <th className="px-5 py-3 text-right">Best Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b border-border transition-colors ${
                    entry.is_current_user
                      ? 'bg-highlight/10 border-l-4 border-l-highlight'
                      : 'hover:bg-primary/[0.03]'
                  }`}
                >
                  <td className={`px-5 py-3.5 font-black text-base tabular-nums ${RANK_STYLES[entry.rank] || 'text-text-3'}`}>
                    {entry.rank <= 3 ? ['', '1st', '2nd', '3rd'][entry.rank] : `#${entry.rank}`}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {entry.display_name}
                    {entry.is_current_user && (
                      <span className="ml-2 text-xs font-bold text-primary bg-highlight/20 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-text-2 tabular-nums">{entry.questions_answered}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-medium text-foreground tabular-nums">{entry.accuracy}%</td>
                  <td className="px-5 py-3.5 text-right text-sm font-bold text-primary tabular-nums">
                    {entry.best_exam_score !== null ? entry.best_exam_score : '-'}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Trophy className="w-10 h-10 text-text-3 mx-auto mb-3" />
                    <p className="text-foreground font-semibold mb-1">No students on the leaderboard yet</p>
                    <p className="text-text-3 text-sm">Start practicing to claim the top spot.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
