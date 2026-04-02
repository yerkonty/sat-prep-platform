'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  subscription_plan: string;
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
    } catch (error) {
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
      const response = await api.put('/api/auth/profile', { name });
      setMessage('Profile updated successfully!');
      if (user) {
        user.name = name;
      }
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to update profile');
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
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to change password');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan
              </label>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium capitalize">
                  {profile?.subscription_plan || 'free'}
                </span>
                {profile?.subscription_plan === 'free' && (
                  <a href="/pricing" className="text-sm text-emerald-600 hover:text-emerald-700">
                    Upgrade →
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* AI Messages Usage */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">AI Messages Usage</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Daily messages</p>
            <p className="text-2xl font-bold text-gray-900">
              {profile?.ai_messages_used || 0} / {profile?.ai_messages_limit || 3}
            </p>
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-3">
            <div 
              className="bg-emerald-600 h-3 rounded-full"
              style={{ width: `${((profile?.ai_messages_used || 0) / (profile?.ai_messages_limit || 3)) * 100}%` }}
            ></div>
          </div>
        </div>
        {profile?.subscription_plan === 'free' && (
          <p className="text-sm text-gray-500 mt-3">
            Upgrade to Basic for 50 AI messages per day
          </p>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
        </p>
        <button
          onClick={handleLogout}
          className="w-full py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow p-6 border border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          className="w-full py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
          disabled
          title="Feature coming soon"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
