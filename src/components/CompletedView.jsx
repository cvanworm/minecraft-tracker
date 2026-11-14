import React, { useState, useMemo } from 'react';
import { useItems } from '../context/ItemsContext';
import { ITEMS_BY_ID, RARITY_COLORS } from '../data/itemsData';
import { Check, Trophy, ExternalLink, Calendar, User, Search, RotateCcw } from 'lucide-react';

export default function CompletedView() {
  const { progress, toggleComplete, stats } = useItems();
  const [playerFilter, setPlayerFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

  // Collect all completed items with metadata
  const completedItems = useMemo(() => {
    const list = [];
    Object.entries(progress).forEach(([itemId, state]) => {
      if (state && state.is_completed) {
        const staticDef = ITEMS_BY_ID[itemId];
        if (staticDef) {
          list.push({
            ...staticDef,
            completed_by: state.completed_by || 'Survivor',
            completed_at: state.completed_at || null,
          });
        }
      }
    });

    // Sort by completed_at descending (most recent first)
    list.sort((a, b) => {
      if (!a.completed_at) return 1;
      if (!b.completed_at) return -1;
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

    return list;
  }, [progress]);

  // Filter completed items
  const filteredCompleted = useMemo(() => {
    return completedItems.filter((item) => {
      if (playerFilter !== 'All' && item.completed_by !== playerFilter) {
        return false;
      }
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [completedItems, playerFilter, localSearch]);

  const uniquePlayers = useMemo(() => {
    const set = new Set();
    completedItems.forEach((i) => {
      if (i.completed_by) set.add(i.completed_by);
    });
    return Array.from(set);
  }, [completedItems]);

  const formatDate = (isoString) => {
    if (!isoString) return 'Undated';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Trophy Room Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#141824] to-cyan-950/30 border border-emerald-900/40 rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">The Trophy Room</h2>
              <p className="text-xs text-slate-400">
                Log of all {completedItems.length} items discovered and secured in vanilla survival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Filter by Player:</span>
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="bg-[#0b0e16] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Players ({completedItems.length})</option>
              {uniquePlayers.map((player) => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search bar inside completed view */}
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search collected items..."
            className="w-full bg-[#0b0d13] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Grid of completed items */}
      {completedItems.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#141824]/60 border border-slate-800 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-300">No items collected yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Head over to the Checklist tab and check off items as you gather them in Minecraft!
          </p>
        </div>
      ) : filteredCompleted.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-500">
          No items found matching "{localSearch}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCompleted.map((item) => {
            const colorInfo = RARITY_COLORS[item.rarity] || RARITY_COLORS.Common;
            const wikiUrl = `https://minecraft.wiki/w/Special:Search?search=${encodeURIComponent(item.name)}`;

            return (
              <div
                key={item.id}
                className="bg-[#121520] border border-[#202538] hover:border-emerald-700/60 rounded-xl p-3.5 flex flex-col justify-between transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm tracking-tight">
                        {item.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${colorInfo.badge}`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1" title={item.category}>
                      {item.category}
                    </p>
                  </div>

                  <a
                    href={wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${item.name} on Minecraft Wiki`}
                    className="p-1 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <User className="w-3 h-3" />
                    <span>{item.completed_by}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">
                      {formatDate(item.completed_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleComplete(item.id)}
                      title="Move back to unchecked list"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
