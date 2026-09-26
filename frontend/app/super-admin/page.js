'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  FileText,
  Activity,
  Unlock,
  CheckCircle2,
  AlertOctagon,
  Search,
  Server,
  Database,
  Lock,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function SuperAdminPage() {
  const { user, role, notify } = useAuth();

  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'logs' or 'system'
  const [loading, setLoading] = useState(true);

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilterAction, setLogFilterAction] = useState('');
  const [logFilterEmail, setLogFilterEmail] = useState('');

  // System status state
  const [systemStatus, setSystemStatus] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getUsers();
      setUsersList(res.users || []);
      setRolesList(res.roles || []);
    } catch (err) {
      notify(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAuditLogs({
        action: logFilterAction,
        email: logFilterEmail,
        limit: 150
      });
      setAuditLogs(res.logs || []);
    } catch (err) {
      notify(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSystemStatus();
      setSystemStatus(res);
    } catch (err) {
      notify(err.message || 'Failed to fetch system status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'super_admin') {
      if (activeTab === 'users') fetchUsers();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'system') fetchSystemStatus();
    }
  }, [user, role, activeTab]);

  const handleRoleChange = async (targetUserId, newRoleId) => {
    try {
      const res = await api.admin.updateUserRole(targetUserId, newRoleId);
      notify(res.message || 'Role updated successfully', 'success');
      fetchUsers();
    } catch (err) {
      notify(err.message || 'Failed to change role', 'error');
    }
  };

  const handleUnlockUser = async (targetUserId, targetName) => {
    try {
      const res = await api.admin.unlockUser(targetUserId);
      notify(res.message || `Unlocked account for ${targetName}`, 'success');
      fetchUsers();
    } catch (err) {
      notify(err.message || 'Unlock failed', 'error');
    }
  };

  if (!user || role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white">Super Admin Clearance Required</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          This governance portal is restricted to Chief System Administrators.
        </p>
        <Link
          href="/login"
          className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
        >
          Sign In as Super Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">Super Admin Control Center</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-mono font-bold">
                ROOT PRIVILEGES
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Role governance, security unlock operations, immutable audit logs, and system metrics.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'users') fetchUsers();
                else if (activeTab === 'logs') fetchLogs();
                else fetchSystemStatus();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & Roles</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Logs & Security Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'system'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Health & Engine</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* TAB 1: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Campus Accounts ({usersList.length})
              </span>
              <span className="text-xs text-slate-500">
                Live role assignments & brute-force unlock controls
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">User Details</th>
                    <th className="py-3.5 px-4">Role Assignment</th>
                    <th className="py-3.5 px-4">2FA Status</th>
                    <th className="py-3.5 px-4">Security State</th>
                    <th className="py-3.5 px-4">Active Loans</th>
                    <th className="py-3.5 px-4 text-right">Emergency Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 animate-pulse">
                        Loading users...
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const isLocked = u.lockout_until && new Date(u.lockout_until) > new Date();

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {u.student_id || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={u.role_id}
                              disabled={u.id === user.id}
                              onChange={(e) => handleRoleChange(u.id, parseInt(e.target.value, 10))}
                              className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              {rolesList.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.two_factor_enabled
                                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {u.two_factor_enabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isLocked ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 flex items-center gap-1 w-max">
                                <Lock className="w-3 h-3 text-rose-400" />
                                <span>LOCKED (5 failed attempts)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Good Standing</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {u.active_loans || 0} books
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isLocked ? (
                              <button
                                onClick={() => handleUnlockUser(u.id, u.name)}
                                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all shadow-md shadow-rose-600/30"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock User</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No action needed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div>
            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by user email..."
                  value={logFilterEmail}
                  onChange={(e) => setLogFilterEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                />
              </div>

              <input
                type="text"
                placeholder="Filter by action (e.g. BOOK_BORROWED, LOGIN_SUCCESS)..."
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="w-full sm:w-64 px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
              />

              <button
                onClick={fetchLogs}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
              >
                Search Logs
              </button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Action Event</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Entity</th>
                      <th className="py-3.5 px-4">IP Address</th>
                      <th className="py-3.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 animate-pulse">
                          Querying immutable audit logs...
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No audit entries match the current filter.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                log.action.includes('LOCKED') || log.action.includes('DENIED')
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                  : log.action.includes('SUCCESS') || log.action.includes('CREATED')
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-200">
                            {log.user_email || 'System / Anonymous'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {log.ip_address}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                            {log.details || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM HEALTH & METRICS */}
        {activeTab === 'system' && systemStatus && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Database Engine</h3>
                    <div className="text-xs text-purple-400 font-mono">{systemStatus.system.databaseEngine}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Parameterized query enforcement active. PostgreSQL / Supabase schema ready.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Security Defenses</h3>
                    <div className="text-xs text-emerald-400 font-mono">All 6 Shields Active</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Helmet headers, JWT rotation, bcrypt (10 rounds), rate limits, CSRF, and lockout.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Server Uptime</h3>
                    <div className="text-xs text-blue-400 font-mono">{systemStatus.system.serverUptimeSeconds} seconds</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Node {systemStatus.system.nodeVersion} &bull; Environment: {systemStatus.system.environment}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">Core System Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Total Users</div>
                  <div className="text-2xl font-black text-white mt-1">{systemStatus.metrics.totalUsers}</div>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Catalog Titles</div>
                  <div className="text-2xl font-black text-white mt-1">{systemStatus.metrics.totalBooks}</div>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Total Transactions</div>
                  <div className="text-2xl font-black text-white mt-1">{systemStatus.metrics.totalBorrowTransactions}</div>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Audit Trail Entries</div>
                  <div className="text-2xl font-black text-white mt-1">{systemStatus.metrics.totalAuditLogs}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
