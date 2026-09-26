'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  User,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Copy
} from 'lucide-react';

export default function LoginPage() {
  const { login, register, verify2FA, notify, quickDemoLogin } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');

  // Security Feedback State
  const [lockoutError, setLockoutError] = useState(null);
  const [attemptWarning, setAttemptWarning] = useState(null);

  // 2FA Verification State
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLockoutError(null);
    setAttemptWarning(null);
    setLoading(true);

    try {
      const res = await login(email, password);

      // Handle 2FA Challenge
      if (res?.twoFactorRequired) {
        setTwoFactorPending(true);
        setTempToken(res.tempToken);
        setSimulatedOtp(res.simulatedOtp);
        notify('2FA OTP Required. Check your simulated authentication code.', 'info');
        return;
      }

      router.push('/');
    } catch (err) {
      if (err.data?.code === 'ACCOUNT_LOCKED') {
        setLockoutError(err.data.error);
      } else if (err.data?.failedAttempts) {
        setAttemptWarning({
          failedAttempts: err.data.failedAttempts,
          maxAttempts: err.data.maxAttempts,
          remaining: err.data.attemptsRemaining
        });
      } else {
        notify(err.message || 'Login failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        studentId: studentId || undefined
      });
      router.push('/');
    } catch (err) {
      notify(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verify2FA(tempToken, otpInput);
      router.push('/');
    } catch (err) {
      notify(err.message || 'Invalid OTP code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleType) => {
    if (roleType === 'student') {
      setEmail('student@library.edu');
      setPassword('Password123!');
    } else if (roleType === 'admin') {
      setEmail('librarian@library.edu');
      setPassword('Password123!');
    } else if (roleType === 'super_admin') {
      setEmail('superadmin@library.edu');
      setPassword('Password123!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/20 mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {twoFactorPending
              ? 'Two-Factor Authentication'
              : mode === 'login'
              ? 'Secure Portal Sign In'
              : 'Register Student Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {twoFactorPending
              ? 'Enter the 6-digit one-time passcode to verify identity'
              : 'Protected with bcrypt hashing, rate limiting & brute-force lockouts'}
          </p>
        </div>

        {/* 1-Click Quick Demo Login Shortcuts for Judges */}
        {!twoFactorPending && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-6 shadow-lg">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Demo Credentials</span>
              <span className="text-[10px] text-emerald-400 font-mono">1-Click Auto-Fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('student')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-blue-400">Student</div>
                <div className="text-[10px] text-slate-400 truncate">Alex Chen</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-emerald-400">Librarian</div>
                <div className="text-[10px] text-slate-400 truncate">Sarah Connor</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('super_admin')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-purple-400">Super Admin</div>
                <div className="text-[10px] text-slate-400 truncate">Marcus Vance</div>
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Lockout Warning Banner */}
          {lockoutError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-sm text-rose-100">ACCOUNT LOCKED</strong>
                <p className="mt-0.5 leading-relaxed">{lockoutError}</p>
                <p className="mt-1 text-[11px] text-rose-300">
                  A security incident has been recorded in the central audit logs. You may wait for expiration or have Super Admin unlock your account.
                </p>
              </div>
            </div>
          )}

          {/* Failed Attempt Warning Banner */}
          {attemptWarning && (
            <div className="mb-5 p-3 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                Failed password attempt <strong>{attemptWarning.failedAttempts} of {attemptWarning.maxAttempts}</strong>. Account locks after {attemptWarning.remaining} more failed attempt(s).
              </div>
            </div>
          )}

          {/* 2FA Step */}
          {twoFactorPending ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {simulatedOtp && (
                <div className="p-3.5 rounded-xl bg-blue-950/50 border border-blue-500/40 text-xs text-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-300">Simulated 2FA Email Code:</span>
                    <button
                      type="button"
                      onClick={() => setOtpInput(simulatedOtp)}
                      className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Auto-Fill ({simulatedOtp})
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    In a production environment, this OTP is dispatched via SMTP/SendGrid. For testing, use the code above.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Enter 6-Digit One-Time Password (OTP)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="e.g. 849201"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-center font-mono text-lg tracking-widest text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTwoFactorPending(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otpInput.length < 6}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Verifying...' : 'Verify OTP & Enter'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tabs for Login / Register */}
              <div className="flex border-b border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors ${
                    mode === 'login'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors ${
                    mode === 'register'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Eleanor Vance"
                          className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student / Faculty ID (Optional)</label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. STU-9921"
                        className="w-full px-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@library.edu"
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {mode === 'register' && (
                    <p className="text-[10px] text-slate-500 mt-1">Minimum 8 characters with bcrypt salt factor 10</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In Securely' : 'Complete Registration'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
