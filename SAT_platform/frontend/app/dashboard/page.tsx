'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  ClipboardList,
  Clock,
  Layers,
  Loader2,
  PlayCircle,
  Target,
} from 'lucide-react';

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
  by_skill: SkillBreakdown[];
  weak_skills: SkillBreakdown[];
  recent_activity: RecentActivityItem[];
}

function formatTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeeklyActivity(activity: RecentActivityItem[]): number[] {
  const counts = new Array(7).fill(0);
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - todayIndex);
  weekStart.setHours(0, 0, 0, 0);

  for (const item of activity) {
    if (!item.answered_at) continue;
    const d = new Date(item.answered_at);
    if (d >= weekStart) {
      const dayIdx = (d.getDay() + 6) % 7;
      counts[dayIdx]++;
    }
  }
  return counts;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<AnalyticsResponse>('/api/progress/analytics');
        setAnalytics(data);
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const hasProgress = !!analytics && analytics.total_questions > 0;
  const sectionsStudied = analytics?.by_section.length ?? 0;
  const sectionNames = analytics?.by_section.map((s) => s.section === 'math' ? 'Math' : 'Reading').join(', ') || '';
  const recentActivity = analytics?.recent_activity ?? [];
  const weakSkills = analytics?.weak_skills ?? [];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Greeting ── */}
        <div className="mb-6 animate-in">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, <span className="text-primary">{user?.name || 'Student'}</span>
          </h1>
          <p className="text-text-3 text-sm mt-1">
            {hasProgress ? 'Keep pushing — consistency is key.' : 'Ready to start your SAT preparation?'}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<ClipboardList className="w-5 h-5 text-primary" />}
            label="Questions answered"
            value={String(analytics?.total_questions ?? 0)}
            hint="Across all sections"
            stagger={1}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-accent" />}
            label="Accuracy"
            value={`${analytics?.accuracy ?? 0}%`}
            hint={hasProgress ? `${analytics!.correct_answers} correct` : 'No data yet'}
            stagger={2}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Time studied"
            value={formatTime(analytics?.time_spent_seconds ?? 0)}
            hint="Total practice time"
            stagger={3}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-highlight" />}
            label="Sections"
            value={String(sectionsStudied)}
            hint={sectionNames || 'None yet'}
            stagger={4}
          />
        </div>

        {/* ── Quick Start ── */}
        <div className="mb-6 animate-in stagger-3">
          <h2 className="text-sm font-bold text-foreground mb-3">Quick start</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction href="/practice?module=math" icon={<BookOpen className="w-5 h-5" />} label="Practice Math" hint="Algebra · 12 questions" />
            <QuickAction href="/test" icon={<ClipboardList className="w-5 h-5" />} label="Practice Test" hint="Full SAT simulation" />
            <QuickAction href="/flashcards" icon={<Layers className="w-5 h-5" />} label="Flashcards" hint="Review vocabulary" />
            <QuickAction href="/ai-tutor" icon={<Bot className="w-5 h-5" />} label="AI Tutor" hint="Ask anything" />
          </div>
        </div>

        {/* ── Main Grid: Activity + Focus Areas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Activity */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in stagger-4">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Recent activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-5 py-10 text-center text-text-3 text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 text-text-3/40" />
                No activity yet. Start a practice session.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.slice(0, 6).map((a, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-primary/[0.02] transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${a.is_correct ? 'bg-highlight' : 'bg-rose-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{a.snippet}</p>
                      <p className="text-xs text-text-3 mt-0.5">
                        {a.section === 'math' ? 'Math' : 'Reading'} · {a.skill || a.domain || 'General'}
                      </p>
                    </div>
                    <span className="text-xs text-text-3 tabular-nums shrink-0 mt-0.5">{timeAgo(a.answered_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Focus Areas */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in stagger-5">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-bold text-foreground">Focus areas</h2>
            </div>
            {weakSkills.length === 0 ? (
              <div className="px-5 py-10 text-center text-text-3 text-sm">
                {hasProgress
                  ? 'Answer at least 3 questions in a skill to see focus areas.'
                  : 'Start practicing to discover your weak spots.'}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {weakSkills.slice(0, 4).map((w) => (
                  <div key={w.skill}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{w.skill}</span>
                        <span className="text-xs text-text-3">{w.section === 'math' ? 'Math' : 'Reading & Writing'}</span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${
                        w.accuracy < 50 ? 'text-rose-500' : w.accuracy < 70 ? 'text-amber-500' : 'text-accent'
                      }`}>
                        {w.accuracy}% ({w.correct}/{w.total})
                      </span>
                    </div>
                    <div className="w-full bg-foreground/5 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-[width] duration-700 ease-[var(--ease)] ${
                          w.accuracy < 50 ? 'bg-rose-400' : w.accuracy < 70 ? 'bg-amber-400' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(100, w.accuracy)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly Activity ── */}
        {hasProgress && <WeeklyChart activity={recentActivity} />}

        {/* ── Section Performance ── */}
        {hasProgress && (
          <div className="mt-5 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Section performance</h2>
              <Link href="/progress" className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {analytics!.by_section.map((s) => (
                <div key={s.section} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    s.section === 'math' ? 'bg-primary/10' : 'bg-accent/10'
                  }`}>
                    {s.section === 'math'
                      ? <BookOpen className="w-5 h-5 text-primary" />
                      : <ClipboardList className="w-5 h-5 text-accent" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {s.section === 'math' ? 'Math' : 'Reading & Writing'}
                      </span>
                      <span className="text-sm font-bold text-foreground tabular-nums">{s.accuracy}%</span>
                    </div>
                    <div className="w-full bg-foreground/5 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-[width] duration-700 ease-[var(--ease)] ${
                          s.section === 'math' ? 'bg-primary' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(100, s.accuracy)}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-3 mt-1 tabular-nums">{s.correct}/{s.total} correct</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State CTA ── */}
        {!hasProgress && (
          <div className="mt-6 bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
            <Target className="w-10 h-10 text-text-3/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-2">No practice data yet</h3>
            <p className="text-text-3 mb-5 max-w-xs mx-auto text-sm">
              Answer a few practice questions to see your accuracy, time spent, and weakest skills here.
            </p>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-accent transition-colors font-medium active:scale-[0.97]"
            >
              <PlayCircle className="w-5 h-5" /> Start practicing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const STAGGER_CLASS = ['', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6'] as const;

function StatCard({ icon, label, value, hint, stagger = 1 }: { icon: React.ReactNode; label: string; value: string; hint: string; stagger?: number }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-4 shadow-sm animate-in ${STAGGER_CLASS[stagger]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-text-3">{label}</span>
      </div>
      <div className="text-2xl font-black text-foreground tracking-tight tabular-nums">{value}</div>
      <p className="text-xs text-text-3 mt-0.5">{hint}</p>
    </div>
  );
}

function QuickAction({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-card rounded-xl border border-border p-4 hover:border-accent/40 hover:shadow-md transition-[transform,border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease)] active:scale-[0.98] group"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-text-3 truncate">{hint}</p>
      </div>
    </Link>
  );
}

function WeeklyChart({ activity }: { activity: RecentActivityItem[] }) {
  const counts = getWeeklyActivity(activity);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="mt-5 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">This week</h2>
        </div>
        <span className="text-xs text-text-3 tabular-nums">{total} questions</span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-2 h-[120px]">
          {DAY_LABELS.map((day, i) => {
            const pct = max > 0 ? (counts[i] / max) * 100 : 0;
            const isToday = i === (new Date().getDay() + 6) % 7;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                {counts[i] > 0 && (
                  <span className="text-xs font-bold text-foreground tabular-nums">{counts[i]}</span>
                )}
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-md origin-bottom ${
                      counts[i] > 0 ? 'bg-highlight' : 'bg-foreground/5'
                    }`}
                    style={{
                      height: counts[i] > 0 ? `${Math.max(pct, 12)}%` : '12%',
                      animation: `growUp 500ms cubic-bezier(0.23, 1, 0.32, 1) ${i * 60}ms both`,
                    }}
                  />
                </div>
                <span className={`text-xs tabular-nums ${isToday ? 'font-bold text-primary' : 'text-text-3'}`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
