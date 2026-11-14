import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { RARITIES, RARITY_COLORS } from '../data/itemsData';
import { Trophy, User, ArrowRightLeft, Radio, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';

export default function Header() {
  const { currentUser, setShowSwitchModal } = useAuth();
  const { stats, syncStatus } = useItems();

  const {
    totalItems,
    completedCount,
    percentage,
    rarityBreakdown,
    leaderboard,
  } = stats;

  return (
    <header className="border-b border-[#1f2433] bg-[#0e1118]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        
        {/* Top row: Brand + Sync Status + User profile */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0b0d13] rounded-[10px] flex items-center justify-center text-xl">
                ⛏️
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Minecraft All-Items Tracker
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Vanilla 1.21+
                </span>
              </div>
              <p className="text-xs text-slate-400">Survival Item Collection Co-op</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync status pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                syncStatus === 'connected'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : syncStatus === 'syncing' || syncStatus === 'connecting'
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
              title={
                syncStatus === 'connected'
                  ? 'Realtime Supabase sync connected'
                  : syncStatus === 'local-only'
                  ? 'Operating in local storage mode'
                  : 'Syncing changes...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-400'
                    : syncStatus === 'syncing' || syncStatus === 'connecting'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {syncStatus === 'connected'
                  ? 'Realtime Live'
                  : syncStatus === 'local-only'
                  ? 'Local Mode'
                  : 'Connecting...'}
              </span>
            </div>

            {/* Current user pill */}
            <div className="flex items-center gap-1.5 bg-[#161a26] border border-[#232838] pl-2.5 pr-1.5 py-1 rounded-xl">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-slate-200">{currentUser || 'Player'}</span>
              <button
                onClick={() => setShowSwitchModal(true)}
                title="Switch Player"
                className="ml-1 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
              >
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle row: Overall Progress Bar */}
        <div className="bg-[#141824] border border-[#1f2438] rounded-xl p-4 shadow-sm mb-4">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Total Collection Progress
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  {completedCount.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {totalItems.toLocaleString()} items
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-cyan-400 font-mono">
                {percentage}%
              </span>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-3 bg-[#0b0d13] rounded-full overflow-hidden border border-slate-800/80 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${Math.max(percentage, 0.5)}%` }}
            />
          </div>
        </div>

        {/* Bottom row: Rarity Breakdown Gauges & Player Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          {/* Rarity Tiers Counters (Spans 2 columns on lg) */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#141824] border border-[#1f2438] p-3 rounded-xl">
            {RARITIES.map((tier) => {
              const tierStats = rarityBreakdown[tier] || { total: 0, completed: 0 };
              const tierPct = tierStats.total > 0 ? Math.round((tierStats.completed / tierStats.total) * 100) : 0;
              const colorInfo = RARITY_COLORS[tier];

              return (
                <div
                  key={tier}
                  className="flex flex-col justify-between p-2 rounded-lg bg-[#0e111a] border border-[#1d2233]"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${colorInfo.dot}`} />
                      {tier}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{tierPct}%</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 mb-1.5">
                    {tierStats.completed} <span className="text-[10px] text-slate-500">/ {tierStats.total}</span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
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

          {/* Friendly Player Leaderboard */}
          <div className="bg-[#141824] border border-[#1f2438] p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Player Leaderboard
              </span>
              <span className="text-[10px] text-slate-500">
                {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-1">
                No items collected yet. Check off your first item to take the lead!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto pr-1">
                {leaderboard.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      idx === 0
                        ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                        : 'bg-[#0f121b] border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{idx === 0 ? '👑' : `#${idx + 1}`}</span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({p.count})</span>
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
