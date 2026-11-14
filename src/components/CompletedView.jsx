import React, { useState, useMemo } from 'react';
import { useItems } from '../context/ItemsContext';
import { ITEMS_BY_ID, RARITY_COLORS } from '../data/itemsData';
import ItemIcon from './ItemIcon';
import { Trophy, ExternalLink, RotateCcw, Search } from 'lucide-react';

export default function CompletedView() {
  const { progress, toggleComplete } = useItems();
  const [playerFilter, setPlayerFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

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

    list.sort((a, b) => {
      if (!a.completed_at) return 1;
      if (!b.completed_at) return -1;
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

    return list;
  }, [progress]);

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
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Trophy Room Banner */}
      <div className="mc-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#3a2f0e] border-2 border-black text-[#ffaa00]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-minecraft text-[#ffff55] mc-shadow-yellow">
                THE TROPHY ROOM
              </h2>
              <p className="text-[11px] font-pixel text-[#aaaaaa] mc-shadow-sm">
                Log of all {completedItems.length} items discovered in survival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-minecraft text-[#aaaaaa]">PLAYER:</span>
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="mc-input px-2.5 py-1 text-[10px] font-pixel cursor-pointer"
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

        {/* Search */}
        <div className="mt-3 relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search completed items..."
            className="mc-input w-full pl-8 pr-3 py-1.5 text-[11px] placeholder-[#666666]"
          />
        </div>
      </div>

      {/* Grid of completed items */}
      {completedItems.length === 0 ? (
        <div className="text-center py-16 px-4 mc-panel">
          <div className="w-10 h-10 mx-auto mb-2 text-2xl">🏆</div>
          <h3 className="text-sm font-minecraft text-[#ffff55] mc-shadow-yellow">No items collected yet!</h3>
          <p className="text-xs font-pixel text-[#888888] max-w-sm mx-auto mt-1">
            Head to the Checklist tab and check off items as you find them in Minecraft!
          </p>
        </div>
      ) : filteredCompleted.length === 0 ? (
        <div className="text-center py-8 text-xs font-pixel text-[#777777]">
          No items found matching "{localSearch}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredCompleted.map((item) => {
            const colorInfo = RARITY_COLORS[item.rarity] || RARITY_COLORS.Common;
            const wikiUrl = `https://minecraft.wiki/w/Special:Search?search=${encodeURIComponent(item.name)}`;

            return (
              <div
                key={item.id}
                className="mc-slot p-2.5 flex flex-col justify-between border-2 border-black"
              >
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon item={item} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-pixel font-bold ${colorInfo.text} mc-shadow-sm truncate`}>
                          {item.name}
                        </span>
                        <span
                          className={`px-1 py-0.2 text-[8px] font-minecraft border border-black uppercase ${colorInfo.badge}`}
                        >
                          {item.rarity}
                        </span>
                      </div>
                      <p className="text-[9px] font-pixel text-[#888888] mt-0.5 line-clamp-1" title={item.category}>
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <a
                    href={wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View ${item.name} on Minecraft Wiki`}
                    className="p-1 text-[#777777] hover:text-[#55ffff] transition shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-1.5 border-t border-[#222222] flex items-center justify-between text-[9px] font-pixel">
                  <span className="text-[#55ff55] mc-shadow-sm">
                    Found by <strong className="text-white">{item.completed_by}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[#666666]">{formatDate(item.completed_at)}</span>
                    <button
                      type="button"
                      onClick={() => toggleComplete(item.id)}
                      title="Move back to unchecked list"
                      className="mc-btn px-1.5 py-0.5 text-[8px] text-[#ff5555] hover:text-white"
                    >
                      <RotateCcw className="w-2.5 h-2.5 inline" />
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
