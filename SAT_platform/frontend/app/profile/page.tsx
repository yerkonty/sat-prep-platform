'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  ai_messages_used: number;
  ai_messages_limit: number;
  created_at: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      setProfile(response.data);
      setName(response.data.name);
    } catch {
      console.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await api.put('/api/auth/profile', { name });
      setMessage('Profile updated successfully');
      if (user) {
        user.name = name;
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setMessage(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSaving(false);
      return;
    }

    try {
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setMessage(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {message && (
          <div className={`p-3 rounded-xl text-sm font-medium ${message.includes('success') ? 'bg-accent/10 text-primary border border-accent/20' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message}
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-4">Profile information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background text-text-3 text-sm"
                />
                <p className="text-xs text-text-3 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-card text-foreground text-sm"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full py-2.5 bg-primary text-white rounded-xl hover:bg-accent disabled:opacity-50 font-medium transition-colors text-sm active:scale-[0.97]"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-3">AI messages usage</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-2 text-sm">Daily messages</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {profile?.ai_messages_used || 0} / {profile?.ai_messages_limit || 3}
              </p>
            </div>
            <div className="w-32 bg-foreground/10 rounded-full h-2.5">
              <div
                className="bg-accent h-2.5 rounded-full transition-[width] duration-700 ease-[var(--ease)]"
                style={{ width: `${((profile?.ai_messages_used || 0) / (profile?.ai_messages_limit || 3)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-4">Change password</h2>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1">Current password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-card text-foreground text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1">New password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-card text-foreground text-sm" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1">Confirm new password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent bg-card text-foreground text-sm" required minLength={6} />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full py-2.5 bg-foreground text-background rounded-xl hover:opacity-80 disabled:opacity-50 font-medium transition-colors text-sm active:scale-[0.97]"
            >
              {saving ? 'Changing...' : 'Change password'}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-2">Account</h2>
          <p className="text-sm text-text-3 mb-3">
            Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors text-sm active:scale-[0.97]"
          >
            Sign out
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-red-200 p-5">
          <h2 className="text-lg font-bold text-red-600 mb-2">Danger zone</h2>
          <p className="text-sm text-text-3 mb-3">
            Once you delete your account, there is no going back.
          </p>
          <button
            className="w-full py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            disabled
            title="Feature coming soon"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
