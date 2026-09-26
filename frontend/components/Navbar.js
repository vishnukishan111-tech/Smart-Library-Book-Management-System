'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  ShieldAlert,
  UserCheck,
  LogOut,
  LogIn,
  Layers,
  Settings,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, quickDemoLogin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const handleDemoSwitch = async (targetRole) => {
    setDemoMenuOpen(false);
    await quickDemoLogin(targetRole);
    if (targetRole === 'student') router.push('/student');
    else if (targetRole === 'admin') router.push('/admin');
    else if (targetRole === 'super_admin') router.push('/super-admin');
  };

  const navLinkClass = (path) => {
    const isActive = pathname === path;
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  SmartLib <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">SECURE</span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-1 font-mono">EdTech Library OS</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/" className={navLinkClass('/')}>
              Book Catalog
            </Link>

            {user && (
              <Link href="/student" className={navLinkClass('/student')}>
                Student Loans
              </Link>
            )}

            {(role === 'admin' || role === 'super_admin') && (
              <Link href="/admin" className={navLinkClass('/admin')}>
                Librarian Portal
              </Link>
            )}

            {role === 'super_admin' && (
              <Link href="/super-admin" className={navLinkClass('/super-admin')}>
                Super Admin
              </Link>
            )}

            {/* Security Lab Highlight for Judges */}
            <Link
              href="/security-lab"
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                pathname === '/security-lab'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-amber-300 hover:text-amber-200 bg-amber-950/40 border border-amber-500/30 hover:border-amber-400'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Security Demo Lab</span>
            </Link>
          </div>

          {/* Right Section: 1-Click Demo Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                title="Quickly switch between pre-seeded role personas"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Role Persona:</span>
                <span className="text-cyan-400 font-mono uppercase text-[11px]">{role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60 mb-1">
                    1-Click Demo Personas
                  </div>
                  <button
                    onClick={() => handleDemoSwitch('student')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/70 flex items-center space-x-2 text-slate-200"
                  >
                    <span className="p-1 rounded bg-blue-500/20 text-blue-400 font-bold">STU</span>
                    <div>
                      <div className="font-semibold">Alex Chen (Student)</div>
                      <div className="text-[10px] text-slate-400">Search, borrow, track due dates</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDemoSwitch('admin')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/70 flex items-center space-x-2 text-slate-200"
                  >
                    <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">LIB</span>
                    <div>
                      <div className="font-semibold">Sarah Connor (Librarian)</div>
                      <div className="text-[10px] text-slate-400">Manage catalog, issue/return books</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDemoSwitch('super_admin')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/70 flex items-center space-x-2 text-slate-200"
                  >
                    <span className="p-1 rounded bg-purple-500/20 text-purple-400 font-bold">SA</span>
                    <div>
                      <div className="font-semibold">Marcus Vance (Super Admin)</div>
                      <div className="text-[10px] text-slate-400">User roles, unlock users, audit logs</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Profile or Login */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  title="View Security Activity & 2FA"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium hidden sm:inline">{user.name.split(' ')[0]}</span>
                </Link>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
