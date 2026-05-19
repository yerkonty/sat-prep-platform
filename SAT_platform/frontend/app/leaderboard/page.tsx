'use client';

import { useState, useEffect } from 'react';
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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-[#1A1A1A]/40 text-lg">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-[#00592B] mb-8">Class Leaderboard</h1>

        <div className="bg-white rounded-2xl border border-[#00592B]/10 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-semibold text-[#1A1A1A]/60 border-b border-[#00592B]/5">
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3 text-right">Questions</th>
                <th className="px-6 py-3 text-right">Accuracy</th>
                <th className="px-6 py-3 text-right">Best Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b border-[#00592B]/5 transition-colors ${
                    entry.is_current_user
                      ? 'bg-[#1CE585]/10 border-l-4 border-l-[#1CE585]'
                      : 'hover:bg-[#00592B]/[0.02]'
                  }`}
                >
                  <td className={`px-6 py-4 font-black text-lg ${RANK_STYLES[entry.rank] || 'text-[#1A1A1A]/40'}`}>
                    {entry.rank <= 3 ? ['', '1st', '2nd', '3rd'][entry.rank] : `#${entry.rank}`}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                    {entry.display_name}
                    {entry.is_current_user && (
                      <span className="ml-2 text-xs font-bold text-[#00592B] bg-[#1CE585]/20 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[#1A1A1A]/70">{entry.questions_answered}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[#1A1A1A]">{entry.accuracy}%</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-[#00592B]">
                    {entry.best_exam_score !== null ? entry.best_exam_score : '-'}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#1A1A1A]/40">
                    No students on the leaderboard yet.
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
