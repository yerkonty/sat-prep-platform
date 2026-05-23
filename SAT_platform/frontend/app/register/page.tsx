'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (token) {
      router.replace(`/join/${token}`);
    }
  }, [token, router]);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      await loginWithGoogle(response.credential);
      router.push('/dashboard');
    } catch {
      // error handled silently — user sees Google's own error UI
    }
  };

  if (token) return null;

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
        <div className="bg-white py-8 px-6 shadow-sm border border-[#00592B]/10 sm:rounded-2xl">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {}}
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
              <span className="px-4 bg-white text-[#1A1A1A]/40">or</span>
            </div>
          </div>

          <p className="text-center text-[#1A1A1A]/60 text-sm">
            To register with email and password, you need an invite link from your instructor.
          </p>

          <p className="mt-6 text-center text-sm text-[#1A1A1A]/50">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#00592B] hover:text-[#10B981]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
