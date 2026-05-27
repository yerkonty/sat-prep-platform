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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-background py-8 px-6">
        <div className="max-w-3xl mx-auto p-5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
          {error || 'No analytics available.'}
        </div>
      </div>
    );
  }

  const hasProgress = analytics.total_questions > 0;
  const mathSection = analytics.by_section.find((s) => s.section === 'math');
  const rwSection = analytics.by_section.find((s) => s.section === 'rw');

  return (
    <div className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Progress</h1>
          <p className="text-text-3 mt-1 text-sm">
            Track your performance and focus on high-yield improvements.
          </p>
        </div>

        {!hasProgress ? (
          <div className="bg-card p-10 rounded-2xl shadow-sm border border-border text-center">
            <Target className="w-10 h-10 mx-auto text-text-3 mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No practice data yet</h2>
            <p className="text-text-3 mb-5 text-sm">Answer a few questions to start seeing analytics here.</p>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-accent transition-colors font-medium active:scale-[0.97]"
            >
              <PlayCircle className="w-5 h-5" /> Start practicing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" label="Questions answered" value={String(analytics.total_questions)} hint="Across all sections" />
              <StatCard icon={<Target className="w-5 h-5 text-accent" />} iconBg="bg-accent/10" label="Overall accuracy" value={`${analytics.accuracy}%`} hint={`${analytics.correct_answers} correct`} />
              <StatCard icon={<Clock className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" label="Time spent" value={formatTime(analytics.time_spent_seconds)} hint="Total practice time" />
              <StatCard icon={<BarChart3 className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" label="Sections studied" value={String(analytics.by_section.length)} hint={analytics.by_section.map((s) => SECTION_LABEL[s.section] || s.section).join(', ') || '—'} />
            </div>

            {(mathSection || rwSection) && (
              <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
                <h3 className="text-base font-bold text-foreground mb-5">Section performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {rwSection && <SectionBar label="Reading & Writing" data={rwSection} barClass="bg-accent" />}
                  {mathSection && <SectionBar label="Math" data={mathSection} barClass="bg-primary" />}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col">
                <h3 className="text-base font-bold text-foreground mb-4">Recent activity</h3>
                {analytics.recent_activity.length === 0 ? (
                  <p className="text-text-3 text-sm">Nothing yet.</p>
                ) : (
                  <div className="space-y-2 flex-1">
                    {analytics.recent_activity.slice(0, 6).map((item) => (
                      <div
                        key={`${item.question_id}-${item.answered_at}`}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50"
                      >
                        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${item.is_correct ? 'bg-accent/10' : 'bg-rose-100'}`}>
                          {item.is_correct ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.snippet || '(no preview)'}</p>
                          <p className="text-xs text-text-3 mt-0.5">
                            {SECTION_LABEL[item.section] || item.section}
                            {item.skill ? ` · ${item.skill}` : ''} · {formatRelative(item.answered_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border-2 border-accent/20 p-5 rounded-2xl shadow-sm flex flex-col">
                <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Improvement focus
                </h3>
                <p className="text-text-3 text-sm mb-4">
                  {analytics.weak_skills.length === 0
                    ? 'Answer at least 3 questions in a skill to see weakest areas.'
                    : 'Skills with the lowest accuracy (min 3 attempts).'}
                </p>

                <div className="space-y-3 flex-1">
                  {analytics.weak_skills.map((item) => (
                    <div key={item.skill} className="p-3 rounded-xl border border-border hover:border-accent/30 hover:shadow-sm transition-[border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease)] group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{item.skill}</h4>
                          <p className="text-xs text-text-3 mt-0.5 uppercase tracking-wide font-medium">
                            {SECTION_LABEL[item.section] || item.section}
                            {item.domain ? ` · ${item.domain}` : ''}
                          </p>
                        </div>
                        <div className="bg-rose-50 px-2 py-0.5 rounded text-rose-600 font-bold text-sm tabular-nums">
                          {item.accuracy}% ({item.correct}/{item.total})
                        </div>
                      </div>
                      <Link
                        href={`/practice?skill=${encodeURIComponent(item.skill)}`}
                        className="flex items-center justify-between w-full bg-accent/10 text-primary px-3 py-2 rounded-lg font-medium text-sm transition-colors group-hover:bg-primary group-hover:text-white active:scale-[0.97]"
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

function StatCard({ icon, iconBg, label, value, hint }: { icon: React.ReactNode; iconBg: string; label: string; value: string; hint: string }) {
  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center mb-3`}>{icon}</div>
      <h3 className="text-text-3 text-sm font-medium">{label}</h3>
      <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
      <p className="text-text-3 text-xs mt-1 truncate">{hint}</p>
    </div>
  );
}

function SectionBar({ label, data, barClass }: { label: string; data: SectionBreakdown; barClass: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold text-text-2">{label}</span>
        <span className="text-text-3">
          <span className="font-bold text-foreground tabular-nums">{data.accuracy}%</span> · {data.correct}/{data.total}
        </span>
      </div>
      <div className="w-full bg-foreground/10 rounded-full h-2">
        <div className={`${barClass} h-2 rounded-full transition-[width] duration-700 ease-[var(--ease)]`} style={{ width: `${Math.min(100, data.accuracy)}%` }} />
      </div>
    </div>
  );
}
