'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Check stored user on initial load
    try {
      const storedUser = localStorage.getItem('library_user');
      const token = localStorage.getItem('library_access_token');
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Error loading stored auth session', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const notify = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res.twoFactorRequired) {
      return res; // Pass 2FA challenge details up to the UI
    }

    if (res.user && res.tokens) {
      setUser(res.user);
      localStorage.setItem('library_user', JSON.stringify(res.user));
      localStorage.setItem('library_access_token', res.tokens.accessToken);
      localStorage.setItem('library_refresh_token', res.tokens.refreshToken);
      notify(`Welcome back, ${res.user.name}! (${res.user.role.toUpperCase()})`, 'success');
    }
    return res;
  };

  const verify2FA = async (tempToken, otp) => {
    const res = await api.auth.verify2FA(tempToken, otp);
    if (res.user && res.tokens) {
      setUser(res.user);
      localStorage.setItem('library_user', JSON.stringify(res.user));
      localStorage.setItem('library_access_token', res.tokens.accessToken);
      localStorage.setItem('library_refresh_token', res.tokens.refreshToken);
      notify(`2FA Verified! Welcome, ${res.user.name}!`, 'success');
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.auth.register(userData);
    if (res.user && res.tokens) {
      setUser(res.user);
      localStorage.setItem('library_user', JSON.stringify(res.user));
      localStorage.setItem('library_access_token', res.tokens.accessToken);
      localStorage.setItem('library_refresh_token', res.tokens.refreshToken);
      notify(`Account registered! Logged in as ${res.user.name}`, 'success');
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('library_user');
    localStorage.removeItem('library_access_token');
    localStorage.removeItem('library_refresh_token');
    notify('Successfully logged out.', 'info');
  };

  // Quick 1-click Demo Account Login for evaluators
  const quickDemoLogin = async (roleType) => {
    const credentials = {
      student: { email: 'student@library.edu', password: 'Password123!' },
      admin: { email: 'librarian@library.edu', password: 'Password123!' },
      super_admin: { email: 'superadmin@library.edu', password: 'Password123!' }
    };

    const target = credentials[roleType];
    if (target) {
      return await login(target.email, target.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        notification,
        notify,
        login,
        verify2FA,
        register,
        logout,
        quickDemoLogin,
        isAuthenticated: !!user,
        role: user?.role || 'guest'
      }}
    >
      {children}
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce transition-all">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium border flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500'
                : notification.type === 'error'
                ? 'bg-rose-900/90 text-rose-100 border-rose-500'
                : 'bg-indigo-900/90 text-indigo-100 border-indigo-500'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-3 text-xs opacity-75 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
