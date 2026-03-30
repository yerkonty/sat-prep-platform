'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Question {
  id: string;
  section?: string;
  type?: string;
  domain?: string;
  category?: string;
  difficulty?: string;
  content: string;
  options: string[];
  explanation?: string;
}

interface AnswerResult {
  is_correct: boolean;
  correct_answer: number;
  explanation: string;
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    section: '',
    domain: '',
    difficulty: ''
  });
  const [sections, setSections] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);

  useEffect(() => {
    fetchFilters();
    fetchQuestions();
  }, []);

  const fetchFilters = async () => {
    try {
      const [sectionsRes, domainsRes] = await Promise.all([
        api.get('/api/questions/sections'),
        api.get('/api/questions/domains')
      ]);
      setSections(sectionsRes.data.sections || []);
      setDomains(domainsRes.data.domains || []);
    } catch (error) {
      console.error('Failed to fetch filters');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.section) params.append('section', filters.section);
      if (filters.domain) params.append('domain', filters.domain);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      params.append('limit', '10');

      const response = await api.get(`/api/questions?${params}`);
      setQuestions(response.data);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setResult(null);
    } catch (error) {
      console.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    try {
      const response = await api.post<AnswerResult>('/api/questions/answer', {
        question_id: currentQuestion.id,
        answer: selectedAnswer,
        time_taken: 30
      });
      setResult(response.data);
      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit answer');
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setResult(null);
    } else {
      fetchQuestions();
    }
  };

  const currentQuestion = questions[currentIndex];
  const isCorrect = result?.is_correct ?? false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Practice Questions</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.section}
            onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>

          <select
            value={filters.domain}
            onChange={(e) => setFilters(prev => ({ ...prev, domain: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Domains</option>
            {domains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            onClick={fetchQuestions}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Question Card */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading questions...</div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500 mb-4">No questions found</div>
          <button
            onClick={fetchQuestions}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load Questions
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Progress */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              currentQuestion?.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              currentQuestion?.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentQuestion?.difficulty || 'mixed'}
            </span>
          </div>

          {/* Question Type */}
          <div className="text-sm text-blue-600 mb-2">
            {(currentQuestion?.section || currentQuestion?.type || 'general')} • {(currentQuestion?.domain || currentQuestion?.category || 'general')}
          </div>

          {/* Question Content */}
          <div className="text-lg text-gray-900 mb-6">
            {currentQuestion.content}
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQuestion?.options?.map((option, index) => (
              <button
                key={index}
                disabled={showResult}
                onClick={() => setSelectedAnswer(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedAnswer === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  showResult && result && index === result.correct_answer
                    ? 'border-green-500 bg-green-50'
                    : ''
                } ${
                  showResult && selectedAnswer === index && !isCorrect
                    ? 'border-red-500 bg-red-50'
                    : ''
                }`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            ))}
          </div>

          {/* Explanation */}
          {showResult && (result?.explanation || currentQuestion?.explanation) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">Explanation</h4>
              <p className="text-gray-700">{result?.explanation || currentQuestion?.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            {!showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
