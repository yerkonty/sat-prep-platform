"use client";

import { useEffect, useState } from 'react';
import { Target, TrendingUp, Clock, BookOpen, AlertTriangle, PlayCircle, BarChart3, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

type AnalyticsResponse = {
  total_questions: number;
  correct_answers: number;
  accuracy: number;
};

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({
    total_questions: 0,
    correct_answers: 0,
    accuracy: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsResponse>('/api/progress/analytics');
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
        setAnalytics({ total_questions: 0, correct_answers: 0, accuracy: 0 });
      }
    };

    fetchAnalytics();
  }, []);

  // Mock data reflecting latest test performance and needed improvements
  const latest_test_results = {
    title: 'Full Practice Test #2',
    dateCompleted: 'Oct 24, 2023',
    totalScore: 1350,
    mathScore: 680,
    ebrwScore: 670,
  };

  const actionableDiagnostics = [
    { id: 1, topic: 'Quadratic Equations', accuracy: '40%', section: 'Math' },
    { id: 2, topic: 'Command of Evidence', accuracy: '55%', section: 'Reading & Writing' },
    { id: 3, topic: 'Advanced Grammar', accuracy: '60%', section: 'Reading & Writing' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Your Progress</h1>
            <p className="text-neutral-500 mt-1">Track your performance and focus on high-yield improvements.</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm font-medium">
            <BarChart3 className="w-4 h-4" /> Export Report
          </button>
        </div>

        {/* Row 1: Overview Stats & Latest Test Performance */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Questions Answered (1/4) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-neutral-500 text-sm font-medium">Questions Answered</h3>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{analytics.total_questions}</p>
            <p className="text-neutral-400 text-sm mt-2">Across all sections</p>
          </div>

          {/* Time Spent (1/4) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-neutral-500 text-sm font-medium">Time Spent</h3>
            <p className="text-3xl font-bold text-neutral-900 mt-1">12h 45m</p>
            <p className="text-neutral-400 text-sm mt-2">~1.5 hrs / day</p>
          </div>

          {/* Latest Test Performance (2/4) */}
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-6 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-emerald-800 font-bold flex items-center gap-2">
                    <Target className="w-5 h-5" /> Latest Test Performance
                  </h3>
                  <p className="text-emerald-600/80 text-sm mt-1">{latest_test_results.title}  {latest_test_results.dateCompleted}</p>
                </div>
                <div className="text-right">
                  <span className="block text-4xl font-black text-emerald-900">{latest_test_results.totalScore}</span>
                  <span className="text-emerald-700 text-sm font-medium">Total Score</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                  <span className="text-emerald-800/70 text-xs font-bold uppercase tracking-wider">Math</span>
                  <p className="text-2xl font-bold text-emerald-900">{latest_test_results.mathScore}</p>
                </div>
                <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                  <span className="text-emerald-800/70 text-xs font-bold uppercase tracking-wider">EBRW</span>
                  <p className="text-2xl font-bold text-emerald-900">{latest_test_results.ebrwScore}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Recent Activity & Actionable Diagnostic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col">
            <h3 className="text-lg font-bold text-neutral-900 mb-6">Recent Activity</h3>
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-800">Reading Practice Test</h4>
                    <p className="text-sm text-neutral-500">Today, 2:30 PM</p>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">95%</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-800">Advanced Algebra</h4>
                    <p className="text-sm text-neutral-500">Yesterday</p>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">88%</span>
              </div>
            </div>

            <button className="w-full mt-6 py-3 text-sm font-medium text-neutral-600 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1">
              View All History <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Actionable Diagnostic */}
          <div className="bg-white border-2 border-emerald-100 p-6 rounded-2xl shadow-sm relative flex flex-col">
            <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Improvement Focus
            </h3>
            <p className="text-neutral-500 text-sm mb-6">Top 3 topics dragging your score down based on your last test.</p>

            <div className="space-y-4 flex-1">
              {actionableDiagnostics.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-neutral-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-neutral-800">{item.topic}</h4>
                      <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wide font-medium">{item.section}</p>
                    </div>
                    <div className="bg-rose-50 px-2 py-1 rounded text-rose-600 font-bold text-sm">
                      {item.accuracy} accuracy
                    </div>
                  </div>
                  <Link href="/practice" className="flex items-center justify-between w-full bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <span className="flex items-center gap-2"><PlayCircle className="w-4 h-4" /> Start Practice</span>
                    <TrendingUp className="w-4 h-4 opacity-50" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
