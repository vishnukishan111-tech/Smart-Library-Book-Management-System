'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  BookOpen,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Shield,
  Sparkles,
  ArrowRight,
  BookMarked,
  Info
} from 'lucide-react';

export default function CatalogPage() {
  const { user, notify, quickDemoLogin } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availability, setAvailability] = useState('all');

  // Modal State
  const [selectedBookForBorrow, setSelectedBookForBorrow] = useState(null);
  const [borrowing, setBorrowing] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.books.getAll({
        search: activeSearch,
        category: selectedCategory === 'All' ? '' : selectedCategory,
        availability
      });
      setBooks(data.books || []);
      if (data.categories && data.categories.length > 0) {
        setCategories(['All', ...data.categories]);
      }
    } catch (err) {
      notify(err.message || 'Failed to fetch catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeSearch, selectedCategory, availability, notify]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const handleBorrowClick = (book) => {
    if (!user) {
      notify('Please log in with a student or admin account to borrow books.', 'info');
      router.push('/login');
      return;
    }
    setSelectedBookForBorrow(book);
  };

  const confirmBorrow = async () => {
    if (!selectedBookForBorrow) return;
    try {
      setBorrowing(true);
      const res = await api.borrow.borrowBook(selectedBookForBorrow.id);
      notify(res.message || `Successfully borrowed "${selectedBookForBorrow.title}"!`, 'success');
      setSelectedBookForBorrow(null);
      // Refresh catalog to reflect real-time decrement in copies
      fetchBooks();
    } catch (err) {
      notify(err.message || 'Borrow request failed', 'error');
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium mb-4">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Secure Campus Book Management &bull; Real-Time Inventory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Smart Library <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Catalog System</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-400">
            Search physical and digital campus collections with live copy availability, automated 14-day borrowing workflows, and military-grade database security.
          </p>

          {/* Quick Demo Persona Callout if guest */}
          {!user && (
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2 text-xs">
              <span className="text-slate-400">Try instant demo login:</span>
              <button
                onClick={() => quickDemoLogin('student')}
                className="px-3 py-1.5 rounded-md bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/60 font-medium transition-all"
              >
                🎓 Alex Chen (Student)
              </button>
              <button
                onClick={() => quickDemoLogin('admin')}
                className="px-3 py-1.5 rounded-md bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-medium transition-all"
              >
                📚 Sarah Connor (Librarian)
              </button>
              <button
                onClick={() => quickDemoLogin('super_admin')}
                className="px-3 py-1.5 rounded-md bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700/60 font-medium transition-all"
              >
                🛡️ Marcus Vance (Super Admin)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search & Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Title, Author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div className="w-full md:w-48">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available Now</option>
                <option value="unavailable">Fully Borrowed</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{books.length}</span> titles found
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Real-Time Availability Active
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl h-96 animate-pulse p-4 flex flex-col justify-between">
                <div className="bg-slate-800 rounded-xl h-48 w-full mb-4"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Books Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search criteria or resetting the category filter.
            </p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('All'); setAvailability('all'); }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {books.map((book) => {
              const isAvailable = book.available_copies > 0;
              return (
                <div
                  key={book.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col group"
                >
                  {/* Book Image */}
                  <div className="relative h-52 bg-slate-950 overflow-hidden">
                    <img
                      src={book.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-cyan-400 border border-slate-700 backdrop-blur-sm">
                        {book.category}
                      </span>
                    </div>

                    {/* Availability Pill */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 backdrop-blur-sm ${
                          isAvailable
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{book.available_copies}/{book.total_copies} left</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Checked Out</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Book Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 font-medium">
                        by {book.author}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {book.description || 'Standard textbook edition preserved in campus archival collection.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          Shelf: <strong className="text-slate-300">{book.shelf_location || 'A-101'}</strong>
                        </span>
                        <span className="font-mono text-slate-500">
                          {book.published_year}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleBorrowClick(book)}
                        disabled={!isAvailable}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isAvailable
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 active:scale-98'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>{isAvailable ? 'Borrow This Title' : 'Currently Unavailable'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Borrow Confirmation Modal */}
      {selectedBookForBorrow && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-blue-400" />
                Confirm Book Loan
              </h3>
              <button
                onClick={() => setSelectedBookForBorrow(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              <div className="flex gap-4">
                <img
                  src={selectedBookForBorrow.cover_image}
                  alt={selectedBookForBorrow.title}
                  className="w-20 h-28 object-cover rounded-lg border border-slate-800"
                />
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedBookForBorrow.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">by {selectedBookForBorrow.author}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">ISBN: {selectedBookForBorrow.isbn}</p>
                  <div className="mt-2 text-xs text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded inline-block">
                    Shelf Location: {selectedBookForBorrow.shelf_location}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Duration:</span>
                  <span className="font-medium text-white">14 Calendar Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Due Date:</span>
                  <span className="font-medium text-emerald-400">
                    {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Late Fee Policy:</span>
                  <span className="font-medium text-amber-400">$1.00 / day after due date</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedBookForBorrow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBorrow}
                disabled={borrowing}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
              >
                {borrowing ? 'Processing Loan...' : 'Confirm & Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
