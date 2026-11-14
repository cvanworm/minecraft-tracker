import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';

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
      setError('Please enter a player name');
      return;
    }
    switchUser(newUsername.trim());
    setNewUsername('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-md mc-panel p-6 text-slate-100">
        
        {showSwitchModal ? (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#383838] border-2 border-black flex items-center justify-center text-[#55ffff]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-minecraft text-[#ffff55] mc-shadow-yellow">
                  SWITCH PLAYER
                </h2>
                <p className="text-[10px] font-pixel text-[#aaaaaa]">
                  Current player: <span className="text-[#55ffff]">{currentUser}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2 text-[10px] font-pixel text-[#ff5555] bg-[#331111] border-2 border-black">
                {error}
              </div>
            )}

            <form onSubmit={handleSwitchSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-minecraft uppercase tracking-wider text-[#aaaaaa] mb-1">
                  New Player Name:
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  className="mc-input w-full px-3 py-2 text-xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="mc-btn py-2 text-[10px]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="mc-btn-emerald py-2 text-[10px]"
                >
                  CONFIRM
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-[#383838] border-2 border-black flex items-center justify-center text-xl shrink-0">
                ⛏️
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold font-minecraft text-white mc-shadow">
                  MINECRAFT ALL-ITEMS
                </h2>
                <p className="text-[10px] font-pixel text-[#aaaaaa]">
                  Multiplayer Survival Tracker
                </p>
              </div>
            </div>

            <p className="text-[11px] font-pixel text-[#cccccc] mb-4 leading-relaxed mc-shadow-sm">
              Enter the shared server password and your Minecraft player name to join the hunt.
            </p>

            {error && (
              <div className="mb-3 p-2 text-[10px] font-pixel text-[#ff5555] bg-[#331111] border-2 border-black">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-minecraft uppercase tracking-wider text-[#aaaaaa] mb-1">
                  Site Password:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="minecraft"
                  className="mc-input w-full px-3 py-2 text-xs"
                  autoFocus
                />
                <p className="mt-1 text-[9px] font-pixel text-[#777777]">
                  Default: <span className="text-[#ffff55]">minecraft</span>
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-minecraft uppercase tracking-wider text-[#aaaaaa] mb-1">
                  Your Minecraft Player Name:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Calvin"
                  className="mc-input w-full px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="mc-btn-emerald w-full mt-2 py-2.5 text-xs tracking-wider"
              >
                JOIN WORLD
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
