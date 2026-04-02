'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    try {
      const response = await api.post('/api/subscriptions/upgrade', { plan });
      alert(`Successfully upgraded to ${plan}!`);
    } catch (error) {
      alert('Upgrade failed. This is a demo - Stripe integration needed.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Unlimited practice questions',
        '1 mock exam per month',
        '3 AI messages per day',
        'Basic progress tracking',
        'Public flashcard decks'
      ],
      cta: user?.subscription_plan === 'free' ? 'Current Plan' : 'Get Started',
      popular: false
    },
    {
      name: 'Basic',
      price: '$9.99',
      period: 'per month',
      description: 'For serious SAT preppers',
      features: [
        'Everything in Free',
        '3 mock exams per month',
        '50 AI messages per day',
        'Advanced analytics',
        'Custom flashcard decks',
        'Question set creation',
        'Priority support'
      ],
      cta: user?.subscription_plan === 'basic' ? 'Current Plan' : 'Upgrade Now',
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Affordable Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your SAT preparation needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-emerald-500 relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-sm px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  Most Popular
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="ml-2 text-gray-500">/{plan.period}</span>
              </div>
              <p className="mt-2 text-gray-500">{plan.description}</p>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.name.toLowerCase())}
                disabled={loading !== null || user?.subscription_plan === plan.name.toLowerCase()}
                className={`mt-8 w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.name.toLowerCase() 
                  ? 'Processing...' 
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 mb-4">
            Need a custom plan for your school or organization?
          </p>
          <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Contact us for enterprise pricing →
          </Link>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900">Can I cancel anytime?</h3>
              <p className="text-gray-600 mt-2">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">What payment methods do you accept?</h3>
              <p className="text-gray-600 mt-2">
                We accept all major credit cards, debit cards, and PayPal through our secure payment processor, Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Is there a refund policy?</h3>
              <p className="text-gray-600 mt-2">
                We offer a 7-day money-back guarantee. If you're not satisfied, contact us within 7 days of purchase for a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
