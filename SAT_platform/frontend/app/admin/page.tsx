'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Student {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  questions_answered: number;
  accuracy: number;
  last_active: string | null;
  created_at: string | null;
}

interface Invite {
  id: string;
  token: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/admin/students');
      setStudents(res.data);
    } catch { /* handled by auth interceptor */ }
  };

  const fetchInvites = async () => {
    try {
      const res = await api.get('/api/admin/invites');
      setInvites(res.data);
    } catch { /* handled by auth interceptor */ }
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    api.get('/api/admin/students').then((res) => setStudents(res.data)).catch(() => {});
    api.get('/api/admin/invites').then((res) => setInvites(res.data)).catch(() => {});
  }, [user, router]);

  const createInvite = async () => {
    try {
      await api.post('/api/admin/invites', {
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_in_days: expiresInDays ? parseInt(expiresInDays) : null,
      });
      setMaxUses('');
      setExpiresInDays('');
      fetchInvites();
    } catch { /* handled */ }
  };

  const revokeInvite = async (id: string) => {
    try {
      await api.delete(`/api/admin/invites/${id}`);
      fetchInvites();
    } catch { /* handled */ }
  };

  const toggleActive = async (id: string) => {
    try {
      await api.put(`/api/admin/students/${id}/deactivate`);
      fetchStudents();
    } catch { /* handled */ }
  };

  const copyInviteLink = (token: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/join/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.is_active).length;
  const avgAccuracy = students.length
    ? (students.reduce((sum, s) => sum + s.accuracy, 0) / students.length).toFixed(1)
    : '0.0';

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-[#00592B] mb-8">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-[#00592B]/10 shadow-sm">
            <div className="text-sm font-semibold text-[#1A1A1A]/60">Total Students</div>
            <div className="text-3xl font-black text-[#00592B]">{totalStudents}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#00592B]/10 shadow-sm">
            <div className="text-sm font-semibold text-[#1A1A1A]/60">Active Students</div>
            <div className="text-3xl font-black text-[#1CE585]">{activeStudents}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#00592B]/10 shadow-sm">
            <div className="text-sm font-semibold text-[#1A1A1A]/60">Avg Accuracy</div>
            <div className="text-3xl font-black text-[#00592B]">{avgAccuracy}%</div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-[#00592B]/10 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#00592B]/10">
            <h2 className="text-lg font-bold text-[#00592B]">Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-[#1A1A1A]/60 border-b border-[#00592B]/5">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Questions</th>
                  <th className="px-6 py-3">Accuracy</th>
                  <th className="px-6 py-3">Last Active</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-[#00592B]/5 hover:bg-[#00592B]/[0.02]">
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">{s.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-[#1A1A1A]/70">{s.email}</td>
                    <td className="px-6 py-4 text-sm">{s.questions_answered}</td>
                    <td className="px-6 py-4 text-sm">{s.accuracy}%</td>
                    <td className="px-6 py-4 text-sm text-[#1A1A1A]/50">
                      {s.last_active ? new Date(s.last_active).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(s.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          s.is_active
                            ? 'bg-[#1CE585]/20 text-[#00592B] hover:bg-red-100 hover:text-red-600'
                            : 'bg-red-100 text-red-600 hover:bg-[#1CE585]/20 hover:text-[#00592B]'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#1A1A1A]/40">
                      No students yet. Create an invite link below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Links */}
        <div className="bg-white rounded-2xl border border-[#00592B]/10 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#00592B]/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#00592B]">Invite Links</h2>
          </div>
          <div className="p-6 border-b border-[#00592B]/5">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="px-3 py-2 border border-[#00592B]/20 rounded-xl text-sm w-32 focus:outline-none focus:ring-1 focus:ring-[#1CE585] text-[#1A1A1A] bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1">Expires In (days)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Never"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="px-3 py-2 border border-[#00592B]/20 rounded-xl text-sm w-32 focus:outline-none focus:ring-1 focus:ring-[#1CE585] text-[#1A1A1A] bg-white"
                />
              </div>
              <button
                onClick={createInvite}
                className="px-5 py-2 bg-[#00592B] text-white rounded-xl text-sm font-bold hover:bg-[#10B981] transition-colors"
              >
                Create Invite
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-[#1A1A1A]/60 border-b border-[#00592B]/5">
                  <th className="px-6 py-3">Link</th>
                  <th className="px-6 py-3">Uses</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#00592B]/5">
                    <td className="px-6 py-4 text-sm font-mono text-[#1A1A1A]/70 max-w-[200px] truncate">
                      /join/{inv.token.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {inv.uses_count}{inv.max_uses !== null ? ` / ${inv.max_uses}` : ' / unlimited'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#1A1A1A]/50">
                      {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        inv.is_active ? 'bg-[#1CE585]/20 text-[#00592B]' : 'bg-red-100 text-red-600'
                      }`}>
                        {inv.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => copyInviteLink(inv.token, inv.id)}
                        className="px-3 py-1 text-xs font-bold text-[#00592B] bg-[#00592B]/5 rounded-lg hover:bg-[#00592B]/10 transition-colors"
                      >
                        {copiedId === inv.id ? 'Copied!' : 'Copy'}
                      </button>
                      {inv.is_active && (
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#1A1A1A]/40">
                      No invite links created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
