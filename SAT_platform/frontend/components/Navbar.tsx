'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-blue-600">
              SAT Prep
            </Link>
            {user && (
              <div className="flex space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link href="/practice" className="text-gray-700 hover:text-blue-600">
                  Practice
                </Link>
                <Link href="/ai-tutor" className="text-gray-700 hover:text-blue-600">
                  AI Tutor
                </Link>
                <Link href="/flashcards" className="text-gray-700 hover:text-blue-600">
                  Flashcards
                </Link>
                <Link href="/progress" className="text-gray-700 hover:text-blue-600">
                  Progress
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="text-gray-700 hover:text-blue-600">
                  Settings
                </Link>
                <span className="text-gray-700">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-blue-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-blue-600">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
