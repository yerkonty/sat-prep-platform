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
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-primary mb-4">
          <BookOpen className="w-10 h-10" />
        </Link>
        <h2 className="text-center text-2xl font-extrabold text-foreground">
          Join MaxSAT Academy
        </h2>
        <p className="mt-1 text-center text-sm text-text-2">
          Create your account to get started
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-6 px-5 shadow-sm border border-border sm:rounded-2xl">
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

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-text-3">or</span>
            </div>
          </div>

          <p className="text-center text-text-2 text-sm">
            To register with email and password, you need an invite link from your instructor.
          </p>

          <p className="mt-5 text-center text-sm text-text-3">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-accent transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
