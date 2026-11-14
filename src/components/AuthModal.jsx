import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Sparkles, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthenticated,
    currentUser,
    login,
    switchUser,
    showSwitchModal,
    setShowSwitchModal,
  } = useAuth();

  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');

  // If already authenticated and not in switch user mode, don't show
  if (isAuthenticated && !showSwitchModal) {
    return null;
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    const result = login(password, username);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleSwitchSubmit = (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setError('Please enter a display name');
      return;
    }
    switchUser(newUsername.trim());
    setNewUsername('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#13161f] border border-[#232838] rounded-2xl p-6 md:p-8 shadow-2xl text-slate-100">
        
        {/* Decorative corner glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {showSwitchModal ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-cyan-950/70 border border-cyan-800/60 rounded-xl text-cyan-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Switch Player</h2>
                <p className="text-sm text-slate-400">Current player: <span className="font-semibold text-cyan-400">{currentUser}</span></p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 text-sm text-rose-400 bg-rose-950/50 border border-rose-800/60 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSwitchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Player Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-[#0b0d13] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="w-1/2 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 px-4 rounded-xl text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20 transition"
                >
                  Switch
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-950/70 border border-cyan-800/60 rounded-xl text-cyan-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Minecraft All-Items Tracker</h2>
                <p className="text-xs text-slate-400">Survival Item Hunt Co-op</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-5 leading-relaxed">
              Enter the shared site password and your Minecraft username to begin tracking and claiming items live.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 text-sm text-rose-400 bg-rose-950/50 border border-rose-800/60 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Shared Site Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter site password"
                    className="w-full bg-[#0b0d13] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Default: <code className="text-slate-400">minecraft</code> (or set via <code className="text-slate-400">VITE_SITE_PASSWORD</code>)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Minecraft Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Calvin"
                    className="w-full bg-[#0b0d13] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/25 transition active:scale-[0.99]"
              >
                Enter Tracker
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
