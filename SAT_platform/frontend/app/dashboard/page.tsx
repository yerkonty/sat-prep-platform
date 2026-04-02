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
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [latestAssessment, setLatestAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestAssessment = async () => {
      try {
        // Attempt to fetch from the new endpoint. Fallback to mock data if it fails.
        const response = await api.get('/api/v1/student/latest-test-summary');
        setLatestAssessment(response.data);
      } catch (error) {
        console.warn('Endpoint not ready yet, using mock data for dashboard refactor.');
        setLatestAssessment({
          title: "Practice Test #4",
          score: 1240,
          previous_score: 1200,
          math: 640,
          math_change: 20,
          ebrw: 600,
          ebrw_change: 20,
          completion_date: "Mar 25, 2026",
          time_elapsed: "2h 15m",
          weaknesses: [
            { id: 1, topic: "Linear Equations", description: "Difficulty with multi-step algebra problems" },
            { id: 2, topic: "Punctuation Rules", description: "Misusing semicolons and colons" },
            { id: 3, topic: "Data Interpretation", description: "Misreading scatterplot axes" }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLatestAssessment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const scoreDelta = latestAssessment.score - latestAssessment.previous_score;
  const isPositive = scoreDelta > 0;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
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

        {/* Action Grid */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">Your Study Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/practice" className="group block h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Continue Practice</h3>
              <p className="text-gray-500 text-sm flex-grow mb-4">Jump right back into your personalized question bank.</p>
              <div className="flex items-center text-sm font-medium text-emerald-600 mt-auto">
                Start Session <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
          <Link href="/ai-tutor" className="group block h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">AI Tutor</h3>
              <p className="text-gray-500 text-sm flex-grow mb-4">Get instant help and detailed explanations for any topic.</p>
              <div className="flex items-center text-sm font-medium text-emerald-600 mt-auto">
                Ask a Question <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
          <Link href="/flashcards" className="group block h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Flashcards</h3>
              <p className="text-gray-500 text-sm flex-grow mb-4">Review essential vocabulary and key math formulas.</p>
              <div className="flex items-center text-sm font-medium text-emerald-600 mt-auto">
                Start Review <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
          <Link href="/progress" className="group block h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Progress</h3>
              <p className="text-gray-500 text-sm flex-grow mb-4">Track your improvements and identify weak spots.</p>
              <div className="flex items-center text-sm font-medium text-emerald-600 mt-auto">
                View Analytics <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Split-View Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column: Latest Assessment Dashboard */}
          <div className="lg:col-span-2 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6 drop-shadow-sm">Latest Performance: {latestAssessment.title}</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-grow flex flex-col justify-between">
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Composite Score</p>
                  <div className="flex items-baseline mt-2">
                    <span className="text-6xl font-extrabold text-gray-900 tracking-tight">{latestAssessment.score}</span>
                    <span className="ml-2 text-lg text-gray-400 font-medium">/ 1600</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`flex items-center ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} px-3 py-1.5 rounded-full text-sm font-bold shadow-sm`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 mr-1.5" /> : <TrendingDown className="w-4 h-4 mr-1.5" />}
                    {isPositive ? '+' : ''}{scoreDelta} pts
                  </div>
                  <span className="text-xs text-gray-400 mt-2 font-medium">vs previous</span>
                </div>
              </div>

              <div className="space-y-6 flex-grow border-y border-gray-100 py-6">
                {/* Math Breakdown */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-700">Math</span>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-900 mr-2">{latestAssessment.math}</span>
                      <span className={`${latestAssessment.math_change > 0 ? 'text-emerald-500' : 'text-rose-500'} text-xs font-semibold`}>
                        ({latestAssessment.math_change > 0 ? '+' : ''}{latestAssessment.math_change})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(latestAssessment.math / 800) * 100}%` }}></div>
                  </div>
                </div>

                {/* EBRW Breakdown */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-700">Reading & Writing</span>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-900 mr-2">{latestAssessment.ebrw}</span>
                      <span className={`${latestAssessment.ebrw_change > 0 ? 'text-emerald-500' : 'text-rose-500'} text-xs font-semibold`}>
                        ({latestAssessment.ebrw_change > 0 ? '+' : ''}{latestAssessment.ebrw_change})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(latestAssessment.ebrw / 800) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mt-6 pt-2">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {latestAssessment.completion_date}</div>
                <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {latestAssessment.time_elapsed}</div>
              </div>

            </div>
          </div>

          {/* Right Column: Actionable Diagnostics Engine */}
          <div className="lg:col-span-3 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6 drop-shadow-sm">Diagnostic & Action Plan</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex-grow">
              <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                <h3 className="font-bold text-orange-900">Priority Improvement Areas</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {latestAssessment.weaknesses.map((weakness: any, index: number) => (
                  <div key={weakness.id || index} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{weakness.topic}</h4>
                      <p className="text-gray-600 text-sm">{weakness.description}</p>
                    </div>
                    <Link 
                      href={`/practice?topic=${encodeURIComponent(weakness.topic)}`}
                      className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Study Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
