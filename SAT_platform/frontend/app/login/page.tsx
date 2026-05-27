'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Mail, Lock } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      setError('');
      await loginWithGoogle(response.credential);
      router.push('/dashboard');
    } catch {
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-primary mb-4">
          <BookOpen className="w-10 h-10" />
        </Link>
        <h2 className="text-center text-2xl font-extrabold text-foreground">
          Welcome back
        </h2>
        <p className="mt-1 text-center text-sm text-text-2">
          Sign in to your MaxSAT Academy account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-6 px-4 shadow-sm border border-border sm:rounded-2xl sm:px-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              size="large"
              width="100%"
              text="signin_with"
              shape="pill"
            />
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-text-3">or sign in with email</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-2">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-text-3" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm text-foreground bg-card"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-2">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-text-3" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm text-foreground bg-card"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-accent transition-colors active:scale-[0.97]"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-text-3">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:text-accent transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
