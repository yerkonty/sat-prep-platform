'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_questions: 0,
    correct_answers: 0,
    accuracy: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/progress/analytics');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Student'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Continue your SAT preparation journey
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase">Questions Answered</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : stats.total_questions}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase">Correct Answers</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.correct_answers}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 uppercase">Accuracy</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {loading ? '...' : `${stats.accuracy}%`}
          </div>
        </div>
      </div>

      {/* Subscription Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Current Plan: {user?.subscription_plan || 'free'}</h2>
            <p className="text-blue-100 mt-1">
              {user?.subscription_plan === 'free' 
                ? 'Upgrade to unlock unlimited questions and AI messages' 
                : 'Enjoy your premium features'}
            </p>
          </div>
          {user?.subscription_plan === 'free' && (
            <Link 
              href="/pricing" 
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/practice" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-bold text-gray-900">Practice</h3>
            <p className="text-sm text-gray-500 mt-1">Answer SAT questions</p>
          </div>
        </Link>
        <Link href="/ai-tutor" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-gray-900">AI Tutor</h3>
            <p className="text-sm text-gray-500 mt-1">Get instant help</p>
          </div>
        </Link>
        <Link href="/flashcards" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-gray-900">Flashcards</h3>
            <p className="text-sm text-gray-500 mt-1">Review vocab & formulas</p>
          </div>
        </Link>
        <Link href="/progress" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-gray-900">Progress</h3>
            <p className="text-sm text-gray-500 mt-1">View analytics</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
