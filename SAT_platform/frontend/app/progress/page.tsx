'use client';

import { useEffect, useState } from 'react';
import {
  Target,
  TrendingUp,
  Clock,
  BookOpen,
  AlertTriangle,
  PlayCircle,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface SkillBreakdown {
  skill: string;
  domain: string | null;
  section: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface SectionBreakdown {
  section: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface RecentActivityItem {
  question_id: string;
  is_correct: boolean;
  section: string;
  skill: string | null;
  domain: string | null;
  difficulty: string | null;
  snippet: string;
  answered_at: string | null;
}

interface AnalyticsResponse {
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  time_spent_seconds: number;
  by_section: SectionBreakdown[];
  weak_skills: SkillBreakdown[];
  recent_activity: RecentActivityItem[];
}

const SECTION_LABEL: Record<string, string> = {
  rw: 'Reading & Writing',
  math: 'Math',
  other: 'Other',
};

function formatTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<AnalyticsResponse>('/api/progress/analytics');
        setAnalytics(data);
      } catch {
        setError('Could not load analytics. Are you signed in?');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] py-12 px-6">
        <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-100 rounded-xl text-red-700">
          {error || 'No analytics available.'}
        </div>
      </div>
    );
  }

  const hasProgress = analytics.total_questions > 0;
  const mathSection = analytics.by_section.find((s) => s.section === 'math');
  const rwSection = analytics.by_section.find((s) => s.section === 'rw');

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Your Progress</h1>
            <p className="text-[#1A1A1A]/50 mt-1">
              Track your performance and focus on high-yield improvements.
            </p>
          </div>
        </div>

        {!hasProgress ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-[#00592B]/10 text-center">
            <Target className="w-12 h-12 mx-auto text-[#1A1A1A]/20 mb-4" />
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">
              No practice data yet
            </h2>
            <p className="text-[#1A1A1A]/50 mb-6">
              Answer a few practice questions to start seeing analytics here.
            </p>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00592B] text-white rounded-xl hover:bg-[#10B981] transition-colors font-medium"
            >
              <PlayCircle className="w-5 h-5" /> Start Practicing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={<BookOpen className="w-5 h-5 text-[#00592B]" />}
                iconBg="bg-[#00592B]/10"
                label="Questions Answered"
                value={String(analytics.total_questions)}
                hint="Across all sections"
              />
              <StatCard
                icon={<Target className="w-5 h-5 text-[#10B981]" />}
                iconBg="bg-[#10B981]/10"
                label="Overall Accuracy"
                value={`${analytics.accuracy}%`}
                hint={`${analytics.correct_answers} correct`}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-[#00592B]" />}
                iconBg="bg-[#00592B]/10"
                label="Time Spent"
                value={formatTime(analytics.time_spent_seconds)}
                hint="Total practice time"
              />
              <StatCard
                icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                label="Sections Studied"
                value={String(analytics.by_section.length)}
                hint={analytics.by_section.map((s) => SECTION_LABEL[s.section] || s.section).join(', ') || '—'}
              />
            </div>

            {(mathSection || rwSection) && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#00592B]/10">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">Section Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rwSection && <SectionBar label="Reading & Writing" data={rwSection} barClass="bg-[#10B981]" />}
                  {mathSection && <SectionBar label="Math" data={mathSection} barClass="bg-[#00592B]" />}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#00592B]/10 flex flex-col">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">Recent Activity</h3>
                {analytics.recent_activity.length === 0 ? (
                  <p className="text-[#1A1A1A]/50 text-sm">Nothing yet.</p>
                ) : (
                  <div className="space-y-3 flex-1">
                    {analytics.recent_activity.slice(0, 6).map((item) => (
                      <div
                        key={`${item.question_id}-${item.answered_at}`}
                        className="flex items-start gap-3 p-3 rounded-xl border border-[#00592B]/5 bg-[#FAFAF8]/50"
                      >
                        <div
                          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                            item.is_correct ? 'bg-[#10B981]/10' : 'bg-rose-100'
                          }`}
                        >
                          {item.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1A1A1A] truncate">{item.snippet || '(no preview)'}</p>
                          <p className="text-xs text-[#1A1A1A]/50 mt-1">
                            {SECTION_LABEL[item.section] || item.section}
                            {item.skill ? ` · ${item.skill}` : ''} · {formatRelative(item.answered_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-[#10B981]/20 p-6 rounded-2xl shadow-sm flex flex-col">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Improvement Focus
                </h3>
                <p className="text-[#1A1A1A]/50 text-sm mb-6">
                  {analytics.weak_skills.length === 0
                    ? 'Answer at least 3 questions in a skill to see weakest areas.'
                    : 'Skills with the lowest accuracy across your practice (min 3 attempts).'}
                </p>

                <div className="space-y-4 flex-1">
                  {analytics.weak_skills.map((item) => (
                    <div
                      key={item.skill}
                      className="p-4 rounded-xl border border-[#00592B]/10 hover:border-[#10B981]/30 hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A]">{item.skill}</h4>
                          <p className="text-xs text-[#1A1A1A]/40 mt-1 uppercase tracking-wide font-medium">
                            {SECTION_LABEL[item.section] || item.section}
                            {item.domain ? ` · ${item.domain}` : ''}
                          </p>
                        </div>
                        <div className="bg-rose-50 px-2 py-1 rounded text-rose-600 font-bold text-sm">
                          {item.accuracy}% ({item.correct}/{item.total})
                        </div>
                      </div>
                      <Link
                        href={`/practice?skill=${encodeURIComponent(item.skill)}`}
                        className="flex items-center justify-between w-full bg-[#10B981]/10 text-[#00592B] px-4 py-2 rounded-lg font-medium transition-colors group-hover:bg-[#00592B] group-hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <PlayCircle className="w-4 h-4" /> Practice this skill
                        </span>
                        <TrendingUp className="w-4 h-4 opacity-50" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#00592B]/10">
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
      <h3 className="text-[#1A1A1A]/50 text-sm font-medium">{label}</h3>
      <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{value}</p>
      <p className="text-[#1A1A1A]/40 text-sm mt-2 truncate">{hint}</p>
    </div>
  );
}

function SectionBar({ label, data, barClass }: { label: string; data: SectionBreakdown; barClass: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold text-[#1A1A1A]/70">{label}</span>
        <span className="text-[#1A1A1A]/50">
          <span className="font-bold text-[#1A1A1A]">{data.accuracy}%</span> · {data.correct}/{data.total}
        </span>
      </div>
      <div className="w-full bg-[#1A1A1A]/10 rounded-full h-2.5">
        <div
          className={`${barClass} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, data.accuracy)}%` }}
        />
      </div>
    </div>
  );
}
