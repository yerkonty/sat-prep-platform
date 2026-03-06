'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ProgressPage() {
  const [stats, setStats] = useState({
    total_questions: 0,
    correct_answers: 0,
    accuracy: 0,
    by_type: {},
    by_difficulty: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/progress/analytics');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Progress</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : stats.total_questions === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">No progress yet</p>
          <p className="text-sm text-gray-400 mt-2">Start practicing to see your progress!</p>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 uppercase">Total Questions</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {stats.total_questions}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 uppercase">Correct Answers</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {stats.correct_answers}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 uppercase">Overall Accuracy</div>
              <div className="text-3xl font-bold text-purple-600 mt-2">
                {stats.accuracy}%
              </div>
            </div>
          </div>

          {/* Accuracy Bar */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Accuracy Overview</h2>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${stats.accuracy}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h2 className="font-bold text-gray-900 mb-2">Keep Going!</h2>
            <p className="text-gray-600">
              {stats.accuracy >= 80 
                ? "Excellent work! You're performing great. Keep practicing to maintain your score."
                : stats.accuracy >= 50 
                ? "Good progress! Focus on understanding the explanations for wrong answers."
                : "Keep practicing! Regular practice will help you improve quickly."
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
}
