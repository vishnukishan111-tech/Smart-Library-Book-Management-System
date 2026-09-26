'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Shield,
  Layers,
  MapPin,
  Calendar
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, role, notify } = useAuth();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'records'
  const [loading, setLoading] = useState(true);

  // Books Inventory State
  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBookForEdit, setSelectedBookForEdit] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Borrow Records State
  const [records, setRecords] = useState([]);
  const [recordsSummary, setRecordsSummary] = useState(null);
  const [recordsStatusFilter, setRecordsStatusFilter] = useState('all');
  const [recordsSearch, setRecordsSearch] = useState('');

  // Form State for Add / Edit Book
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Computer Science',
    cover_image: '',
    total_copies: 5,
    shelf_location: 'CS-Sec-A1',
    published_year: 2024,
    description: ''
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.books.getAll({ search: bookSearch });
      setBooks(res.books || []);
    } catch (err) {
      notify(err.message || 'Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.borrow.getAllRecords({
        status: recordsStatusFilter,
        search: recordsSearch
      });
      setRecords(res.records || []);
      setRecordsSummary(res.summary);
    } catch (err) {
      notify(err.message || 'Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (role === 'admin' || role === 'super_admin')) {
      if (activeTab === 'inventory') fetchInventory();
      else fetchRecords();
    }
  }, [user, role, activeTab, recordsStatusFilter]);

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      await api.books.create(formData);
      notify(`Successfully added "${formData.title}" to catalog!`, 'success');
      setShowAddModal(false);
      setFormData({
        isbn: '',
        title: '',
        author: '',
        category: 'Computer Science',
        cover_image: '',
        total_copies: 5,
        shelf_location: 'CS-Sec-A1',
        published_year: 2024,
        description: ''
      });
      fetchInventory();
    } catch (err) {
      notify(err.message || 'Failed to create book', 'error');
    }
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    if (!selectedBookForEdit) return;
    try {
      await api.books.update(selectedBookForEdit.id, formData);
      notify('Book details updated successfully!', 'success');
      setSelectedBookForEdit(null);
      fetchInventory();
    } catch (err) {
      notify(err.message || 'Failed to update book', 'error');
    }
  };

  const handleDeleteBook = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}" from catalog?`)) return;
    try {
      await api.books.delete(id);
      notify(`Deleted "${title}" from catalog`, 'success');
      fetchInventory();
    } catch (err) {
      notify(err.message || 'Delete operation failed', 'error');
    }
  };

  const handleAdminReturn = async (recordId, bookTitle) => {
    try {
      const res = await api.borrow.returnBook(recordId);
      notify(res.message || `Processed return for "${bookTitle}"`, 'success');
      fetchRecords();
    } catch (err) {
      notify(err.message || 'Return processing failed', 'error');
    }
  };

  const openEditModal = (book) => {
    setSelectedBookForEdit(book);
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      cover_image: book.cover_image,
      total_copies: book.total_copies,
      available_copies: book.available_copies,
      shelf_location: book.shelf_location,
      published_year: book.published_year,
      description: book.description || ''
    });
  };

  if (!user || (role !== 'admin' && role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white">Librarian Access Restricted</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          You must be logged in as an <strong>Admin / Librarian</strong> or <strong>Super Admin</strong> to access inventory management.
        </p>
        <Link
          href="/login"
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
        >
          Sign In as Librarian
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
              <h1 className="text-2xl sm:text-3xl font-black text-white">Librarian Administration Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase">
                {role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Catalog inventory control, real-time copy reallocation, and campus-wide loan tracking.
            </p>
          </div>

          {activeTab === 'inventory' && (
            <button
              onClick={() => {
                setFormData({
                  isbn: `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                  title: '',
                  author: '',
                  category: 'Computer Science',
                  cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
                  total_copies: 5,
                  shelf_location: 'CS-Sec-A1',
                  published_year: 2024,
                  description: ''
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Book to Catalog</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Catalog & Book Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Borrow & Return Records Tracker</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* TAB 1: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div>
            {/* Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or ISBN..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInventory()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchInventory}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Search
              </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Book Details</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Shelf</th>
                      <th className="py-3.5 px-4">Copies (Avail / Total)</th>
                      <th className="py-3.5 px-4">Year</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 animate-pulse">
                          Loading catalog inventory...
                        </td>
                      </tr>
                    ) : books.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No books found.
                        </td>
                      </tr>
                    ) : (
                      books.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white flex items-center gap-3">
                            <img
                              src={b.cover_image}
                              alt={b.title}
                              className="w-10 h-14 object-cover rounded-lg border border-slate-800 shrink-0"
                            />
                            <div>
                              <div className="text-sm line-clamp-1">{b.title}</div>
                              <div className="text-[11px] text-slate-400 font-normal">by {b.author}</div>
                              <div className="text-[10px] text-slate-500 font-mono">ISBN: {b.isbn}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-cyan-400">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {b.shelf_location || 'A-101'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                b.available_copies > 0
                                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              {b.available_copies} / {b.total_copies} available
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {b.published_year}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => openEditModal(b)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                                title="Edit Book & Stock"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBook(b.id, b.title)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors"
                                title="Delete Book"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* TAB 2: BORROW & RETURN RECORDS TRACKER */}
        {activeTab === 'records' && (
          <div>
            {/* Summary Metrics */}
            {recordsSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-slate-400 uppercase">Total Records</div>
                  <div className="text-xl font-black text-white mt-1">{recordsSummary.total}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-blue-400 uppercase">Active Borrowed</div>
                  <div className="text-xl font-black text-blue-400 mt-1">{recordsSummary.active_borrowed}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-rose-400 uppercase">Overdue</div>
                  <div className="text-xl font-black text-rose-400 mt-1">{recordsSummary.overdue}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-emerald-400 uppercase">Returned</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{recordsSummary.returned}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-amber-400 uppercase">Total Fines</div>
                  <div className="text-xl font-black text-amber-400 mt-1">${parseFloat(recordsSummary.total_fines || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, student ID, email, or book title..."
                  value={recordsSearch}
                  onChange={(e) => setRecordsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={recordsStatusFilter}
                onChange={(e) => setRecordsStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="borrowed">Active Borrowed</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned</option>
              </select>

              <button
                onClick={fetchRecords}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
              >
                Apply
              </button>
            </div>

            {/* Records Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Record ID</th>
                      <th className="py-3.5 px-4">Borrower / Student</th>
                      <th className="py-3.5 px-4">Book Title</th>
                      <th className="py-3.5 px-4">Borrow Date</th>
                      <th className="py-3.5 px-4">Due Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Fine</th>
                      <th className="py-3.5 px-4 text-right">Desk Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 animate-pulse">
                          Loading borrowing records...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          No borrowing records found for this filter.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const isOverdue = r.status === 'overdue';
                        const isReturned = r.status === 'returned';

                        return (
                          <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-500">
                              #{r.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{r.user_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{r.student_id} &bull; {r.user_email}</div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-200">
                              {r.book_title}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(r.borrow_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {new Date(r.due_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isReturned
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                    : isOverdue
                                    ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                                    : 'bg-blue-950/70 text-blue-400 border border-blue-500/40'
                                }`}
                              >
                                {r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              ${parseFloat(r.fine_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!isReturned ? (
                                <button
                                  onClick={() => handleAdminReturn(r.id, r.book_title)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all shadow-sm"
                                  title="Check in this book at librarian desk"
                                >
                                  Check In
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Completed</span>
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
          </div>
        )}
      </div>

      {/* Add / Edit Book Modal */}
      {(showAddModal || selectedBookForEdit) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>{showAddModal ? 'Add New Book to Inventory' : 'Edit Book & Availability'}</span>
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setSelectedBookForEdit(null); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={showAddModal ? handleCreateBook : handleUpdateBook} className="mt-4 space-y-3.5 text-xs">
              {showAddModal && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ISBN Number</label>
                  <input
                    type="text"
                    required
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="978-0131103627"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Clean Architecture"
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Author(s)</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Robert C. Martin"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Software Engineering"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_copies}
                    onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                {!showAddModal && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Available Copies</label>
                    <input
                      type="number"
                      min="0"
                      max={formData.total_copies}
                      value={formData.available_copies}
                      onChange={(e) => setFormData({ ...formData, available_copies: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={formData.shelf_location}
                    onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                    placeholder="CS-Sec-A1"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Published Year</label>
                  <input
                    type="number"
                    value={formData.published_year}
                    onChange={(e) => setFormData({ ...formData, published_year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary or syllabus references..."
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setSelectedBookForEdit(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  {showAddModal ? 'Save to Catalog' : 'Update Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
