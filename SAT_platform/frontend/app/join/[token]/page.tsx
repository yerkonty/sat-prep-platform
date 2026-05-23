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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (inviteValid === false) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#00592B]/10 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Invalid Invite</h2>
          <p className="text-[#1A1A1A]/60">{inviteReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-[#00592B] mb-6">
          <BookOpen className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1A1A1A]">
          Join MaxSAT Academy
        </h2>
        <p className="mt-2 text-center text-sm text-[#1A1A1A]/60">
          Create your account to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#00592B]/10 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-6">
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1A1A1A]/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#1A1A1A]/40">or sign up with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A]/70">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#1A1A1A]/30" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-[#10B981] focus:border-[#10B981] sm:text-sm text-[#1A1A1A] bg-white"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A]/70">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#1A1A1A]/30" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-[#10B981] focus:border-[#10B981] sm:text-sm text-[#1A1A1A] bg-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A]/70">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#1A1A1A]/30" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-[#10B981] focus:border-[#10B981] sm:text-sm text-[#1A1A1A] bg-white"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#00592B] hover:bg-[#10B981] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10B981] transition-colors"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
