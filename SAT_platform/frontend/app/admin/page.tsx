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
  invite_token_preview: string | null;
}

interface SkillBreakdown {
  skill: string;
  domain: string | null;
  section: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface DomainBreakdown {
  domain: string;
  section: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface RecentActivity {
  question_id: string;
  is_correct: boolean;
  section: string;
  skill: string | null;
  domain: string | null;
  difficulty: string | null;
  snippet: string;
  answered_at: string | null;
}

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  last_active: string | null;
  created_at: string | null;
  invite: { token_preview: string; created_at: string | null } | null;
  analytics: {
    total_questions: number;
    correct_answers: number;
    accuracy: number;
    time_spent_seconds: number;
    by_type: Record<string, number>;
    by_difficulty: Record<string, number>;
    by_section: { section: string; total: number; correct: number; accuracy: number }[];
    by_domain: DomainBreakdown[];
    by_skill: SkillBreakdown[];
    weak_skills: SkillBreakdown[];
    recent_activity: RecentActivity[];
  };
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

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'red' | 'green';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-text-2 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-text-2 hover:bg-background rounded-xl transition-colors active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${
              confirmColor === 'red'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary hover:bg-accent'
            } active:scale-[0.97]`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentDetailPanel({
  detail,
  onClose,
}: {
  detail: StudentDetail;
  onClose: () => void;
}) {
  const { analytics } = detail;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-primary">{detail.name || 'Unnamed'}</h2>
            <p className="text-sm text-text-2">{detail.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-foreground text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="bg-background rounded-xl px-4 py-2">
              <span className="text-text-3">Joined </span>
              <span className="font-semibold text-foreground">
                {detail.created_at ? new Date(detail.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="bg-background rounded-xl px-4 py-2">
              <span className="text-text-3">Last Active </span>
              <span className="font-semibold text-foreground">
                {detail.last_active ? new Date(detail.last_active).toLocaleDateString() : 'Never'}
              </span>
            </div>
            {detail.invite && (
              <div className="bg-background rounded-xl px-4 py-2">
                <span className="text-text-3">Invite </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {detail.invite.token_preview}
                </span>
              </div>
            )}
            <div className={`rounded-xl px-4 py-2 ${detail.is_active ? 'bg-highlight/10' : 'bg-red-50'}`}>
              <span className={`font-bold text-sm ${detail.is_active ? 'text-primary' : 'text-red-600'}`}>
                {detail.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Questions', value: analytics.total_questions },
              { label: 'Correct', value: analytics.correct_answers },
              { label: 'Accuracy', value: `${analytics.accuracy}%` },
              {
                label: 'Time Spent',
                value:
                  analytics.time_spent_seconds >= 3600
                    ? `${Math.floor(analytics.time_spent_seconds / 3600)}h ${Math.floor((analytics.time_spent_seconds % 3600) / 60)}m`
                    : `${Math.floor(analytics.time_spent_seconds / 60)}m`,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-background rounded-xl p-3 text-center">
                <div className="text-xs font-semibold text-text-3">{stat.label}</div>
                <div className="text-xl font-black text-primary">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* By difficulty */}
          {Object.keys(analytics.by_difficulty).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-2 mb-2">By Difficulty</h3>
              <div className="flex gap-3">
                {Object.entries(analytics.by_difficulty).map(([diff, count]) => (
                  <div key={diff} className="bg-background rounded-xl px-4 py-2 text-center flex-1">
                    <div className="text-xs text-text-3 capitalize">{diff}</div>
                    <div className="text-lg font-bold text-foreground">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By domain */}
          {analytics.by_domain.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-2 mb-2">By Domain</h3>
              <div className="space-y-2">
                {analytics.by_domain.map((d) => (
                  <div key={d.domain} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{d.domain}</span>
                        <span className="text-text-3">
                          {d.correct}/{d.total} ({d.accuracy}%)
                        </span>
                      </div>
                      <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-highlight rounded-full transition-all"
                          style={{ width: `${d.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak skills */}
          {analytics.weak_skills.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-red-500/80 mb-2">Weak Skills</h3>
              <div className="space-y-1">
                {analytics.weak_skills.map((s) => (
                  <div
                    key={s.skill}
                    className="flex justify-between items-center bg-red-50 rounded-xl px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{s.skill}</span>
                    <span className="text-red-600 font-bold">{s.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {analytics.recent_activity.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-2 mb-2">Recent Activity</h3>
              <div className="space-y-1">
                {analytics.recent_activity.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0"
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        a.is_correct ? 'bg-highlight' : 'bg-red-400'
                      }`}
                    >
                      {a.is_correct ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{a.snippet}</p>
                      <p className="text-text-3 text-xs">
                        {[a.section?.toUpperCase(), a.domain, a.difficulty]
                          .filter(Boolean)
                          .join(' · ')}
                        {a.answered_at &&
                          ` · ${new Date(a.answered_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.total_questions === 0 && (
            <div className="text-center py-8 text-text-3">
              This student hasn&apos;t answered any questions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: 'red' | 'green';
    onConfirm: () => void;
  } | null>(null);

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

  const openStudentDetail = async (studentId: string) => {
    setLoadingStudentId(studentId);
    try {
      const res = await api.get(`/api/admin/students/${studentId}`);
      setSelectedStudent(res.data);
    } catch { /* handled */ }
    setLoadingStudentId(null);
  };

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

  const revokeInvite = (id: string) => {
    setConfirmAction({
      title: 'Revoke Invite Link',
      message: 'This invite link will be permanently deactivated. Students who already registered with it will not be affected.',
      confirmLabel: 'Revoke',
      confirmColor: 'red',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.delete(`/api/admin/invites/${id}`);
          fetchInvites();
        } catch { /* handled */ }
      },
    });
  };

  const toggleActive = (student: Student) => {
    const willDeactivate = student.is_active;
    setConfirmAction({
      title: willDeactivate ? 'Deactivate Student' : 'Reactivate Student',
      message: willDeactivate
        ? `${student.name || student.email} will be unable to log in or access the platform.`
        : `${student.name || student.email} will regain access to the platform.`,
      confirmLabel: willDeactivate ? 'Deactivate' : 'Reactivate',
      confirmColor: willDeactivate ? 'red' : 'green',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.put(`/api/admin/students/${student.id}/deactivate`);
          fetchStudents();
        } catch { /* handled */ }
      },
    });
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
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-primary mb-8">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="text-sm font-semibold text-text-2">Total students</div>
            <div className="text-3xl font-black text-primary tabular-nums">{totalStudents}</div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="text-sm font-semibold text-text-2">Active students</div>
            <div className="text-3xl font-black text-highlight tabular-nums">{activeStudents}</div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="text-sm font-semibold text-text-2">Avg accuracy</div>
            <div className="text-3xl font-black text-primary tabular-nums">{avgAccuracy}%</div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-primary">Students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-text-2 border-b border-border">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Questions</th>
                  <th className="px-6 py-3">Accuracy</th>
                  <th className="px-6 py-3">Invite</th>
                  <th className="px-6 py-3">Last Active</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border hover:bg-primary/[0.02] cursor-pointer"
                    onClick={() => openStudentDetail(s.id)}
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {loadingStudentId === s.id && (
                          <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                        )}
                        {s.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-2">{s.email}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">{s.questions_answered}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">{s.accuracy}%</td>
                    <td className="px-6 py-4 text-xs font-mono text-text-3">
                      {s.invite_token_preview || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-3">
                      {s.last_active ? new Date(s.last_active).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(s);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          s.is_active
                            ? 'bg-highlight/20 text-primary hover:bg-red-100 hover:text-red-600'
                            : 'bg-red-100 text-red-600 hover:bg-highlight/20 hover:text-primary'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-text-3">
                      No students yet. Create an invite link below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Links */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Invite Links</h2>
          </div>
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl text-sm w-32 focus:outline-none focus:ring-1 focus:ring-highlight text-foreground bg-card"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1">Expires In (days)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Never"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl text-sm w-32 focus:outline-none focus:ring-1 focus:ring-highlight text-foreground bg-card"
                />
              </div>
              <button
                onClick={createInvite}
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-accent transition-colors active:scale-[0.97]"
              >
                Create Invite
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-text-2 border-b border-border">
                  <th className="px-6 py-3">Link</th>
                  <th className="px-6 py-3">Uses</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-border">
                    <td className="px-6 py-4 text-sm font-mono text-text-2 max-w-[200px] truncate">
                      /join/{inv.token.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {inv.uses_count}{inv.max_uses !== null ? ` / ${inv.max_uses}` : ' / unlimited'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-3">
                      {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        inv.is_active ? 'bg-highlight/20 text-primary' : 'bg-red-100 text-red-600'
                      }`}>
                        {inv.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => copyInviteLink(inv.token, inv.id)}
                        className="px-3 py-1 text-xs font-bold text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors active:scale-[0.97]"
                      >
                        {copiedId === inv.id ? 'Copied' : 'Copy'}
                      </button>
                      {inv.is_active && (
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors active:scale-[0.97]"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-3">
                      No invite links created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student detail slide-out */}
      {selectedStudent && (
        <StudentDetailPanel
          detail={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          confirmColor={confirmAction.confirmColor}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
