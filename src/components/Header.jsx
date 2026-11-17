import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { RARITIES, RARITY_COLORS } from '../data/itemsData';
import { Trophy, ArrowRightLeft, User, KeyRound, LogOut } from 'lucide-react';

export default function Header({ onOpenAccess }) {
  const { currentUser, setShowSwitchModal, logout } = useAuth();
  const { stats, syncStatus } = useItems();

  const {
    totalItems,
    completedCount,
    percentage,
    rarityBreakdown,
    leaderboard,
  } = stats;

  return (
    <header className="border-b-4 border-black bg-[#23201e] shadow-2xl relative z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        
        {/* Top row: Brand + Sync Status + User profile */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#383838] border-2 border-black shadow-[inset_2px_2px_0px_#636363,inset_-2px_-2px_0px_#1c1c1c] flex items-center justify-center text-xl shrink-0">
              ⛏️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold font-minecraft tracking-wider text-white mc-shadow">
                  MINECRAFT ALL-ITEMS
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-minecraft bg-[#383838] text-[#ffff55] border-2 border-black mc-shadow-sm">
                  1.21+
                </span>
              </div>
              <p className="text-[11px] font-pixel text-[#aaaaaa] mc-shadow-sm mt-0.5">
                Survival Item Collection Challenge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync status pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-minecraft border-2 border-black shadow-sm ${
                syncStatus === 'connected'
                  ? 'bg-[#153818] text-[#55ff55]'
                  : syncStatus === 'syncing' || syncStatus === 'connecting'
                  ? 'bg-[#383015] text-[#ffff55] animate-pulse'
                  : 'bg-[#2b2b2b] text-[#aaaaaa]'
              }`}
            >
              <span
                className={`w-2 h-2 ${
                  syncStatus === 'connected'
                    ? 'bg-[#55ff55]'
                    : syncStatus === 'syncing' || syncStatus === 'connecting'
                    ? 'bg-[#ffff55]'
                    : 'bg-[#aaaaaa]'
                }`}
              />
              <span className="mc-shadow-sm hidden sm:inline">
                {syncStatus === 'connected'
                  ? 'ONLINE'
                  : syncStatus === 'local-only'
                  ? 'LOCAL'
                  : syncStatus === 'error' ? 'SYNC ERROR' : 'SYNCING...'}
              </span>
            </div>

            {/* Current user nametag */}
            <button onClick={onOpenAccess} className="mc-btn px-2 py-1 text-[10px] flex items-center gap-1" title="Manage API keys"><KeyRound className="w-3 h-3" /> API KEYS</button>
            <div className="flex items-center gap-2 bg-[#1b1b1b] border-2 border-black px-2.5 py-1 shadow-[inset_1px_1px_0px_#333]">
              <span className="text-[10px] font-pixel text-[#55ffff] mc-shadow-sm flex items-center gap-1">
                <User className="w-3 h-3" />
                {currentUser || 'Steve'}
              </span>
              <button
                onClick={() => setShowSwitchModal(true)}
                title="Switch Player"
                className="mc-btn px-1.5 py-0.5 text-[9px] text-[#ffffff] hover:text-[#ffffa0]"
              >
                <ArrowRightLeft className="w-2.5 h-2.5 inline" />
              </button>
            </div>
            <button onClick={logout} className="mc-btn px-2 py-1" title="Sign out" aria-label="Sign out"><LogOut className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Middle row: Authentic Minecraft XP Progress Bar */}
        <div className="mc-panel p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] sm:text-xs font-minecraft uppercase tracking-wider text-[#aaaaaa] mc-shadow-sm">
                ITEMS COLLECTED
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-minecraft text-[#55ff55] mc-shadow-green">
                  {completedCount.toLocaleString()}
                </span>
                <span className="text-xs font-minecraft text-[#888888] mc-shadow-sm">
                  / {totalItems.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl sm:text-2xl font-bold font-minecraft text-[#ffff55] mc-shadow-yellow">
                {percentage}%
              </span>
            </div>
          </div>

          {/* Minecraft XP Bar Graphic */}
          <div className="relative w-full h-5 bg-[#090e06] border-2 border-black p-0.5 overflow-hidden shadow-[inset_1px_1px_0px_#000]">
            {/* XP segments background */}
            <div
              className="h-full bg-gradient-to-r from-[#55ff55] via-[#80ff20] to-[#ffff55] transition-all duration-300 relative"
              style={{
                width: `${Math.max(percentage, 0.5)}%`,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.35) 18px, rgba(0,0,0,0.35) 20px)'
              }}
            />

            {/* Level number in center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-minecraft text-[10px] sm:text-xs font-bold mc-xp-stroke tracking-widest">
                LVL {completedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row: Rarity Tiers & Player Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          {/* Rarity Tiers Counters */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-2 mc-panel p-2.5">
            {RARITIES.map((tier) => {
              const tierStats = rarityBreakdown[tier] || { total: 0, completed: 0 };
              const tierPct = tierStats.total > 0 ? Math.round((tierStats.completed / tierStats.total) * 100) : 0;
              const colorInfo = RARITY_COLORS[tier];

              return (
                <div
                  key={tier}
                  className="mc-slot p-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[9px] font-minecraft ${colorInfo.text} mc-shadow-sm`}>
                      {tier}
                    </span>
                    <span className="text-[8px] font-pixel text-[#888888]">{tierPct}%</span>
                  </div>

                  <div className="text-[10px] font-pixel text-[#ffffff] mc-shadow-sm mb-1.5">
                    {tierStats.completed} <span className="text-[#666666]">/ {tierStats.total}</span>
                  </div>

                  {/* Mini XP bar */}
                  <div className="w-full h-1.5 bg-[#050804] border border-black overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${tierPct}%`,
                        backgroundColor: colorInfo.accent,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minecraft Tab List / Leaderboard */}
          <div className="mc-panel p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-minecraft text-[#ffff55] mc-shadow-yellow flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-[#ffaa00]" />
                LEADERBOARD
              </span>
              <span className="text-[9px] font-pixel text-[#888888]">
                {leaderboard.length} PLAYERS
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-[10px] font-pixel text-[#777777] italic py-1 mc-shadow-sm">
                No items collected yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                {leaderboard.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-pixel border-2 border-black ${
                      idx === 0
                        ? 'bg-[#3b2d0b] text-[#ffff55]'
                        : 'bg-[#181818] text-[#cccccc]'
                    }`}
                  >
                    <span>{idx === 0 ? '👑' : `#${idx + 1}`}</span>
                    <span className="font-bold mc-shadow-sm">{p.name}</span>
                    <span className="text-[#ffaa00] font-minecraft text-[8px]">({p.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
