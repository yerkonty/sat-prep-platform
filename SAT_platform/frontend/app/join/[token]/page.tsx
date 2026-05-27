'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Mail, Lock, Loader2 } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteReason, setInviteReason] = useState('');
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api.get(`/api/auth/join/${token}`)
      .then((res) => {
        if (res.data.valid) {
          setInviteValid(true);
        } else {
          setInviteValid(false);
          setInviteReason(res.data.reason || 'Invalid invite link.');
        }
      })
      .catch(() => {
        setInviteValid(false);
        setInviteReason('Could not validate invite link.');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await register(email, password, name, token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      setError(message);
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

  if (inviteValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (inviteValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid invite</h2>
          <p className="text-text-2">{inviteReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary mb-4">
          <BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-center text-2xl font-extrabold text-foreground">
          Join MaxSAT Academy
        </h2>
        <p className="mt-1 text-center text-sm text-text-2">
          Create your account to get started
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
              text="signup_with"
              shape="pill"
            />
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-text-3">or sign up with email</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-2">
                Full name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-text-3" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm text-foreground bg-card"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

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
              Create account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
