import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Ace Your Digital SAT
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered SAT preparation with unlimited practice questions, 
            personalized feedback, and expert tutoring.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 text-lg font-medium rounded-lg hover:bg-blue-50"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Question Bank</h3>
            <p className="text-gray-600">
              Practice with real SAT questions from official College Board tests
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Tutor</h3>
            <p className="text-gray-600">
              Get instant explanations and study tips from our AI-powered tutor
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Progress Tracking</h3>
            <p className="text-gray-600">
              Track your performance and get personalized recommendations
            </p>
          </div>
        </div>

        {/* Pricing Teaser */}
        <div className="mt-24 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Simple, Affordable Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="border-2 border-blue-500 rounded-xl p-6 relative">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg">Current</div>
              <h3 className="text-xl font-bold text-gray-900">Free</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">$0</div>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Unlimited practice questions</li>
                <li>✓ 1 mock exam/month</li>
                <li>✓ 3 AI messages/day</li>
              </ul>
            </div>
            <div className="border-2 border-purple-500 rounded-xl p-6 relative">
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-2 py-1 rounded-bl-lg">Upgrade</div>
              <h3 className="text-xl font-bold text-gray-900">Basic</h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">$9.99<span className="text-sm font-normal">/mo</span></div>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>✓ Everything in Free</li>
                <li>✓ 3 mock exams/month</li>
                <li>✓ 50 AI messages/day</li>
                <li>✓ <strong>Custom Question Sets</strong></li>
                <li className="text-sm text-gray-500">Mix categories to create random practice sets</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Ready to start your SAT journey?</p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2024 SAT Prep Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
