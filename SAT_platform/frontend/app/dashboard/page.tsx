'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Play,
  BrainCircuit,
  Target,
  Activity,
  Sparkles,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  BookOpen,
  Loader2,
  PlayCircle,
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

interface AnalyticsResponse {
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  time_spent_seconds: number;
  by_section: SectionBreakdown[];
  weak_skills: SkillBreakdown[];
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
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const hasProgress = !!analytics && analytics.total_questions > 0;
  const mathSection = analytics?.by_section.find((s) => s.section === 'math');
  const rwSection = analytics?.by_section.find((s) => s.section === 'rw');
  const weakSkills = analytics?.weak_skills ?? [];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back, <span className="text-emerald-600">{user?.name || 'Student'}</span>
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Ready to continue your SAT preparation journey?
            </p>
          </div>
          {user?.subscription_plan === 'free' && (
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 border border-emerald-200 bg-emerald-50 text-sm font-medium rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2 text-emerald-500" />
              Upgrade to Premium
            </Link>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Your Study Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <ActionCard href="/practice" icon={<Play className="w-6 h-6" />} title="Continue Practice" body="Jump right back into your personalized question bank." cta="Start Session" />
          <ActionCard href="/ai-tutor" icon={<BrainCircuit className="w-6 h-6" />} title="AI Tutor" body="Get instant help and detailed explanations for any topic." cta="Ask a Question" />
          <ActionCard href="/flashcards" icon={<Target className="w-6 h-6" />} title="Flashcards" body="Review essential vocabulary and key math formulas." cta="Start Review" />
          <ActionCard href="/progress" icon={<Activity className="w-6 h-6" />} title="Progress" body="Track your improvements and identify weak spots." cta="View Analytics" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Practice Snapshot</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-grow flex flex-col">
              {!hasProgress ? (
                <EmptyPractice />
              ) : (
                <>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Overall Accuracy</p>
                      <div className="flex items-baseline mt-2">
                        <span className="text-6xl font-extrabold text-gray-900 tracking-tight">{analytics!.accuracy}</span>
                        <span className="ml-2 text-lg text-gray-400 font-medium">%</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {analytics!.correct_answers} / {analytics!.total_questions} questions correct
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                        <Clock className="w-4 h-4 mr-1.5" /> {formatTime(analytics!.time_spent_seconds)}
                      </div>
                      <span className="text-xs text-gray-400 mt-2 font-medium">studied</span>
                    </div>
                  </div>

                  <div className="space-y-6 flex-grow border-y border-gray-100 py-6">
                    <SectionBar label="Math" data={mathSection} barClass="bg-blue-500" />
                    <SectionBar label="Reading & Writing" data={rwSection} barClass="bg-purple-500" />
                  </div>

                  <Link
                    href="/progress"
                    className="mt-6 inline-flex items-center justify-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    See full analytics <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Diagnostic & Action Plan</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex-grow">
              <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                <h3 className="font-bold text-orange-900">Priority Improvement Areas</h3>
              </div>
              {weakSkills.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  {hasProgress
                    ? 'Answer at least 3 questions in a skill to see your weakest areas here.'
                    : 'No practice data yet — start a session to surface your weakest skills.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {weakSkills.map((w) => (
                    <div
                      key={w.skill}
                      className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{w.skill}</h4>
                        <p className="text-gray-600 text-sm">
                          {SECTION_LABEL[w.section] || w.section}
                          {w.domain ? ` · ${w.domain}` : ''} —{' '}
                          <span className="font-semibold text-rose-600">{w.accuracy}%</span> accuracy ({w.correct}/{w.total})
                        </p>
                      </div>
                      <Link
                        href={`/practice?skill=${encodeURIComponent(w.skill)}`}
                        className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 font-semibold rounded-xl transition-colors shadow-sm"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Study Now
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, body, cta }: { href: string; icon: React.ReactNode; title: string; body: string; cta: string }) {
  return (
    <Link href={href} className="group block h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">{title}</h3>
        <p className="text-gray-500 text-sm flex-grow mb-4">{body}</p>
        <div className="flex items-center text-sm font-medium text-emerald-600 mt-auto">
          {cta} <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function SectionBar({ label, data, barClass }: { label: string; data: SectionBreakdown | undefined; barClass: string }) {
  if (!data) {
    return (
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-gray-700">{label}</span>
          <span className="text-gray-400">no data yet</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="h-2.5 rounded-full" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold text-gray-700">{label}</span>
        <div className="flex items-center">
          <span className="font-bold text-gray-900 mr-2">{data.accuracy}%</span>
          <span className="text-xs text-gray-500">({data.correct}/{data.total})</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`${barClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, data.accuracy)}%` }} />
      </div>
    </div>
  );
}

function EmptyPractice() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
      <Target className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No practice data yet</h3>
      <p className="text-gray-500 mb-6 max-w-xs">
        Answer a few practice questions to see your accuracy, time spent, and weakest skills here.
      </p>
      <Link
        href="/practice"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
      >
        <PlayCircle className="w-5 h-5" /> Start practicing
      </Link>
    </div>
  );
}
