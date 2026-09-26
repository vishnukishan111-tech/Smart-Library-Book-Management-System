'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  BookMarked,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Calendar,
  Search,
  BookOpen,
  MapPin,
  ShieldCheck
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, notify } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    overdueCount: 0,
    returnedCount: 0,
    totalFines: '0.00'
  });
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.borrow.getMyHistory();
      setHistory(res.records || []);
      setStats(res.stats || {
        activeCount: 0,
        overdueCount: 0,
        returnedCount: 0,
        totalFines: '0.00'
      });
    } catch (err) {
      notify(err.message || 'Failed to load borrowing history', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, fetchStudentData]);

  const handleReturn = async (recordId, title) => {
    try {
      setReturningId(recordId);
      const res = await api.borrow.returnBook(recordId);
      notify(res.message || `Returned "${title}"`, 'success');
      await fetchStudentData();
    } catch (err) {
      notify(err.message || 'Return failed', 'error');
    } finally {
      setReturningId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-white">Student Portal Requires Login</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          Please sign in to view your borrowed titles, track due dates, and return books.
        </p>
        <Link
          href="/login"
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  const activeRecords = history.filter((r) => r.status === 'borrowed' || r.status === 'overdue');
  const pastRecords = history.filter((r) => r.status === 'returned');

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">Student Loan Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                {user.studentId || 'STU-PORTAL'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active loan tracking, automated due date reminders, and return receipt records for <strong>{user.name}</strong>.
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Borrow New Books</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Active Loans */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Loans</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <BookMarked className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{stats.activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Currently checked out</div>
          </div>

          {/* Overdue Titles */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Overdue Alert</span>
              <div className={`p-2 rounded-lg ${stats.overdueCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats.overdueCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats.overdueCount > 0 ? 'Requires immediate return' : 'All loans in good standing'}
            </div>
          </div>

          {/* Returned History */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Returned</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{stats.returnedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Completed loan cycles</div>
          </div>

          {/* Outstanding Fines */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Assessed Fines</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black ${parseFloat(stats.totalFines) > 0 ? 'text-amber-400' : 'text-white'}`}>
              ${stats.totalFines}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">$1.00 / day overdue fee</div>
          </div>
        </div>

        {/* Active Borrowed Books Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Current Active Loans ({activeRecords.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Click &quot;Return Book&quot; to check in any title</span>
          </div>

          {loading ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 animate-pulse">
              Loading current loans...
            </div>
          ) : activeRecords.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/70 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">No Active Loans</h3>
              <p className="text-xs text-slate-400 mt-1">You have no pending books to return right now.</p>
              <Link
                href="/"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Browse Catalog to Borrow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRecords.map((record) => {
                const isOverdue = record.status === 'overdue' || new Date(record.due_date) < new Date();
                const dueDate = new Date(record.due_date);
                const daysRemaining = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={record.id}
                    className={`rounded-2xl p-5 border shadow-xl flex gap-4 transition-all ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-600/40'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <img
                      src={record.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
                      alt={record.title}
                      className="w-20 h-28 object-cover rounded-xl border border-slate-800 shrink-0"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400">
                            {record.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-rose-900/70 text-rose-300 border border-rose-600/50'
                                : 'bg-emerald-900/70 text-emerald-300 border border-emerald-600/50'
                            }`}
                          >
                            {isOverdue ? 'OVERDUE' : `${daysRemaining} days left`}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-sm mt-1.5 line-clamp-1">{record.title}</h3>
                        <p className="text-xs text-slate-400">by {record.author}</p>
                        <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Shelf: {record.shelf_location || 'A-101'}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="text-[11px]">
                          <span className="text-slate-500">Due: </span>
                          <strong className={isOverdue ? 'text-rose-400' : 'text-slate-300'}>
                            {dueDate.toLocaleDateString()}
                          </strong>
                          {parseFloat(record.fine_amount) > 0 && (
                            <span className="text-amber-400 font-bold ml-2">
                              Fine: ${parseFloat(record.fine_amount).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleReturn(record.id, record.title)}
                          disabled={returningId === record.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all hover:text-white"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${returningId === record.id ? 'animate-spin' : ''}`} />
                          <span>{returningId === record.id ? 'Returning...' : 'Return Book'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Complete Borrowing History Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Borrowing History & Return Receipts ({pastRecords.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Borrow Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Fines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pastRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No returned records found yet.
                    </td>
                  </tr>
                ) : (
                  pastRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{record.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ISBN: {record.isbn}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(record.borrow_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(record.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {record.return_date ? new Date(record.return_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                          RETURNED
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        ${parseFloat(record.fine_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
