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
      setMessage('Profile updated successfully!');
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
      setMessage('Password changed successfully!');
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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Settings</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.includes('success') ? 'bg-[#10B981]/10 text-[#00592B] border border-[#10B981]/20' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#00592B]/10 p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Profile Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-[#1A1A1A]/10 rounded-xl bg-[#FAFAF8] text-[#1A1A1A]/50"
                />
                <p className="text-xs text-[#1A1A1A]/40 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full py-2.5 bg-[#00592B] text-white rounded-xl hover:bg-[#10B981] disabled:opacity-50 font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* AI Messages Usage */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#00592B]/10 p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">AI Messages Usage</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1A1A1A]/60">Daily messages</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {profile?.ai_messages_used || 0} / {profile?.ai_messages_limit || 3}
              </p>
            </div>
            <div className="w-32 bg-[#1A1A1A]/10 rounded-full h-3">
              <div
                className="bg-[#10B981] h-3 rounded-full transition-all"
                style={{ width: `${((profile?.ai_messages_used || 0) / (profile?.ai_messages_limit || 3)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#00592B]/10 p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-white text-[#1A1A1A]"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-white text-[#1A1A1A]"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full py-2.5 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#1A1A1A]/80 disabled:opacity-50 font-medium transition-colors"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#00592B]/10 p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Account</h2>
          <p className="text-sm text-[#1A1A1A]/50 mb-4">
            Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-sm text-[#1A1A1A]/50 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            className="w-full py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled
            title="Feature coming soon"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
