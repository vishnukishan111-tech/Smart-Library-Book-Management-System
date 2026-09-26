'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Mail,
  Key,
  Smartphone,
  History,
  CheckCircle2,
  XCircle,
  Lock,
  Globe
} from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser, notify } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling2FA, setToggling2FA] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.auth.getProfile();
      setProfileData(res.user);
      setLoginAttempts(res.recentLoginAttempts || []);
    } catch (err) {
      notify(err.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const handleToggle2FA = async () => {
    try {
      setToggling2FA(true);
      const nextState = !profileData?.two_factor_enabled;
      const res = await api.auth.toggle2FA(nextState);
      notify(res.message, 'success');
      setProfileData((prev) => ({ ...prev, two_factor_enabled: nextState ? 1 : 0 }));
      if (user) {
        setUser({ ...user, twoFactorEnabled: nextState });
      }
    } catch (err) {
      notify(err.message || 'Failed to toggle 2FA', 'error');
    } finally {
      setToggling2FA(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <User className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-white">Sign In to View Security Profile</h2>
        <Link
          href="/login"
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  const is2FAOn = Boolean(profileData?.two_factor_enabled);

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-slate-900/60 border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-white">Account Security & Activity Monitoring</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time authentication audit trail, Two-Factor Authentication controls, and session monitoring.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* User Info & 2FA Toggle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Info */}
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Identity Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block mb-0.5">Full Name</span>
                <span className="font-bold text-white text-sm">{profileData?.name || user.name}</span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block mb-0.5">Official Email</span>
                <span className="font-mono text-slate-200">{profileData?.email || user.email}</span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block mb-0.5">Campus ID</span>
                <span className="font-mono text-cyan-400 font-bold">{profileData?.student_id || user.studentId || 'N/A'}</span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block mb-0.5">Assigned Role</span>
                <span className="font-bold text-emerald-400 uppercase">{profileData?.role || user.role}</span>
              </div>
            </div>
          </div>

          {/* 2FA Configuration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Two-Factor Auth</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Require a 6-digit one-time passcode on each sign-in attempt.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">2FA Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    is2FAOn
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {is2FAOn ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <button
                onClick={handleToggle2FA}
                disabled={toggling2FA}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  is2FAOn
                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/50'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                }`}
              >
                {toggling2FA ? 'Updating...' : is2FAOn ? 'Disable 2FA' : 'Enable 2FA (OTP)'}
              </button>
            </div>
          </div>
        </div>

        {/* Activity Monitoring Table (Requirement 5) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Recent Authentication Attempts (Activity Monitoring)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every successful login, password error, and account lockout event logged for forensic review.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Last 10 Attempts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">User-Agent / Device</th>
                  <th className="py-3 px-4">Diagnostic Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 animate-pulse">
                      Retrieving security activity logs...
                    </td>
                  </tr>
                ) : loginAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No recent authentication events recorded.
                    </td>
                  </tr>
                ) : (
                  loginAttempts.map((attempt) => {
                    const isSuccess = attempt.status === 'SUCCESS';
                    const isLocked = attempt.status === 'LOCKED';
                    const is2FA = attempt.status === '2FA_CHALLENGE';

                    return (
                      <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(attempt.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-max ${
                              isSuccess
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                : isLocked
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                : is2FA
                                ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/40'
                                : 'bg-amber-950/70 text-amber-400 border border-amber-500/40'
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : isLocked ? (
                              <Lock className="w-3 h-3 text-rose-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-amber-400" />
                            )}
                            <span>{attempt.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {attempt.ip_address}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                          {attempt.user_agent}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {attempt.failure_reason || (isSuccess ? 'Valid credentials authenticated' : '—')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
