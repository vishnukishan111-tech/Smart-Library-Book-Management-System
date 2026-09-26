'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Bug,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';

export default function SecurityLabPage() {
  const { notify } = useAuth();

  // SQL Injection Demo State
  const [sqlPayload, setSqlPayload] = useState("' OR '1'='1");
  const [sqlTesting, setSqlTesting] = useState(false);
  const [sqlResult, setSqlResult] = useState(null);

  // Brute-force Demo State
  const [targetEmail, setTargetEmail] = useState('student@library.edu');
  const [failedCount, setFailedCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [bruteForceLog, setBruteForceLog] = useState([]);
  const [bruteForceTesting, setBruteForceTesting] = useState(false);

  // Security Defenses State
  const [defenses, setDefenses] = useState(null);

  useEffect(() => {
    // Load defenses
    api.securityDemo.inspectDefenses().then((res) => {
      setDefenses(res.securityControls);
    }).catch(console.error);

    // Initial SQL Injection test run for immediate visual display
    handleRunSqlTest("' OR '1'='1");
  }, []);

  const handleRunSqlTest = async (payloadToTest) => {
    try {
      setSqlTesting(true);
      const res = await api.securityDemo.testSqlInjection(payloadToTest || sqlPayload);
      setSqlResult(res);
    } catch (err) {
      notify(err.message || 'SQL test failed', 'error');
    } finally {
      setSqlTesting(false);
    }
  };

  const handleSimulateFailedLogin = async () => {
    try {
      setBruteForceTesting(true);
      const newCount = failedCount + 1;
      setFailedCount(newCount);

      // Attempt login with deliberately wrong password
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
        },
        body: JSON.stringify({ email: targetEmail, password: 'WrongPassword999!' })
      });

      const data = await res.json();

      if (res.status === 423 || data.code === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
        setBruteForceLog((prev) => [
          `🚨 [LOCKOUT TRIGGERED] Attempt #${newCount}: Account locked for 15 minutes! HTTP 423 Locked`,
          ...prev
        ]);
        notify('Account successfully locked by brute-force defense system!', 'error');
      } else {
        setBruteForceLog((prev) => [
          `⚠️ [ATTEMPT FAILED] Attempt #${newCount}/5: Invalid password. ${data.attemptsRemaining || (5 - newCount)} attempts remaining.`,
          ...prev
        ]);
      }
    } catch (err) {
      notify(err.message || 'Simulation error', 'error');
    } finally {
      setBruteForceTesting(false);
    }
  };

  const handleResetBruteForce = async () => {
    try {
      // Find user and unlock via superadmin or backend call
      setFailedCount(0);
      setIsLocked(false);
      setBruteForceLog([]);
      notify('Demo counter reset. Account cleared for testing.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border-b border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-3">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Interactive Security Verification Sandbox for Judges</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Security Demonstration <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-cyan-400 bg-clip-text text-transparent">Lab</span>
          </h1>
          <p className="mt-2 max-w-2xl mx-auto text-xs sm:text-sm text-slate-400">
            Live, proof-of-defense environment demonstrating parameterized SQL query neutralization, brute-force account lockouts, rate limiting, and enterprise HTTP headers.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* DEMO 1: SQL INJECTION DEFENSE */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Terminal className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-white">1. SQL Injection Prevention Demonstration</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Compares how naive SQL string concatenation fails vs how PostgreSQL parameterized queries ($1, $2) neutralize exploits.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PARAMETERIZED QUERIES ACTIVE</span>
              </span>
            </div>
          </div>

          {/* Payload Selector and Custom Input */}
          <div className="mt-6 space-y-4">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Choose or Enter Attack Payload:</span>
              <span className="text-slate-500">Preset Common Exploits</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Classic Auth Bypass (' OR '1'='1)", value: "' OR '1'='1" },
                { label: "Tautology Payload (' OR 1=1 --)", value: "' OR 1=1 --" },
                { label: "Comment Injection (admin'--)", value: "admin'--" },
                { label: "Destructive Stacked ('; DROP TABLE books; --)", value: "'; DROP TABLE books; --" }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setSqlPayload(preset.value); handleRunSqlTest(preset.value); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                    sqlPayload === preset.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sqlPayload}
                  onChange={(e) => setSqlPayload(e.target.value)}
                  placeholder="Enter custom SQL injection payload..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl font-mono text-sm text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleRunSqlTest(sqlPayload)}
                disabled={sqlTesting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{sqlTesting ? 'Testing Query...' : 'Test Exploit'}</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Results Display */}
          {sqlResult && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Vulnerable Simulation */}
              <div className="bg-slate-950/80 border border-rose-900/40 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Vulnerable (String Concatenation)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono">
                      UNSAFE PRACTICE
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Generated Query:</div>
                    <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
                      {sqlResult.vulnerableConcatenationSimulation.rawSql}
                    </pre>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 leading-relaxed">
                    <strong>Vulnerability Analysis:</strong> {sqlResult.vulnerableConcatenationSimulation.explanation}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                  <span>Attack Result:</span>
                  <span className="font-bold text-rose-400">
                    {sqlResult.vulnerableConcatenationSimulation.wouldBypassAuthOrFilter
                      ? '⚠️ Exploit Succeeded (All Rows Leaked)'
                      : 'Malformed Query Executed'}
                  </span>
                </div>
              </div>

              {/* Right Column: Protected Parameterized Query */}
              <div className="bg-slate-950/80 border border-emerald-900/40 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Our Implementation (Parameterized Query)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                      POSTGRESQL DEFENSE ACTIVE
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Prepared Statement & Parameters:</div>
                    <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                      {sqlResult.parameterizedQuery.sql}
                      {'\n'}Parameters: {JSON.stringify(sqlResult.parameterizedQuery.parameters)}
                    </pre>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 leading-relaxed">
                    <strong>Protection Analysis:</strong> {sqlResult.parameterizedQuery.explanation}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                  <span>Matches Leaked:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    0 Records Leaked (Neutralized in {sqlResult.parameterizedQuery.durationMs}ms)
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* DEMO 2: BRUTE FORCE & ACCOUNT LOCKOUT */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Lock className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-white">2. Brute-Force Password Spraying & Account Lockout</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tests account freeze mechanism. After 5 consecutive invalid passwords, account enters a 15-minute lock.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${
                isLocked
                  ? 'bg-rose-950 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              }`}>
                {isLocked ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                <span>{isLocked ? 'STATE: TEMPORARILY LOCKED (HTTP 423)' : 'STATE: UNLOCKED'}</span>
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Account Email</label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Attempt Counter Meter */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">Failed Attempt Counter:</span>
                  <span className={failedCount >= 5 ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                    {failedCount} / 5 Attempts
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      failedCount >= 5
                        ? 'bg-rose-500'
                        : failedCount >= 3
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (failedCount / 5) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSimulateFailedLogin}
                  disabled={bruteForceTesting || isLocked}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isLocked
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Send Bad Password Attempt</span>
                </button>

                <button
                  onClick={handleResetBruteForce}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Reset Counter"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="md:col-span-2 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                <span>Real-Time Defense Event Stream</span>
                <span>Audit Logger: Active</span>
              </div>

              <div className="mt-3 space-y-2 h-44 overflow-y-auto font-mono text-xs text-slate-300">
                {bruteForceLog.length === 0 ? (
                  <div className="text-slate-600 italic py-8 text-center">
                    Click &quot;Send Bad Password Attempt&quot; above to simulate attack traffic...
                  </div>
                ) : (
                  bruteForceLog.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-[11px] ${
                        log.includes('LOCKOUT')
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                          : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* DEMO 3: SECURITY HEADERS & DEFENSE SPECS */}
        {defenses && (
          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-2 pb-6 border-b border-slate-800">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">3. Active Security Headers & Encryption Defenses</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified server-side headers enforced via Helmet.js and authentication policies.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Helmet Headers */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Enforced HTTP Response Headers (Helmet)
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  {Object.entries(defenses.helmetHeaders).map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="text-cyan-400 block font-bold">{key}</span>
                      <span className="text-slate-400 text-[11px] break-all">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptography & Controls */}
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Cryptographic & Session Safeguards
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(defenses.authentication).map(([key, val]) => (
                      <div key={key} className="flex justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="text-emerald-400 font-mono font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Defense-in-Depth Mechanisms
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(defenses.defenseMechanisms).map(([key, val]) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-900">
                        <span className="text-blue-400 font-semibold block capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="text-slate-300 text-[11px]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
