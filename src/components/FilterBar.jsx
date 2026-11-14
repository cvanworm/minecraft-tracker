import React from 'react';
import { useItems } from '../context/ItemsContext';
import { RARITIES, RARITY_COLORS, CATEGORIES } from '../data/itemsData';
import {
  Search,
  X,
  Dices,
  Layers,
  CheckSquare,
  Trophy,
} from 'lucide-react';

export default function FilterBar({ onOpenRandomModal }) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedRarities,
    toggleRarity,
    setSelectedRarities,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    collapseAll,
    expandAll,
    filteredItems,
    stats,
  } = useItems();

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSelectAllRarities = () => {
    setSelectedRarities(RARITIES);
  };

  return (
    <div className="sticky top-0 z-30 bg-[#1c1815] border-b-4 border-black shadow-xl py-2.5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-2.5">
        
        {/* Row 1: Search + View Mode Tabs + Random Target Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Instant Search input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 1,420 items..."
              className="mc-input w-full pl-9 pr-8 py-2 text-xs placeholder-[#666666]"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Checklist vs Completed (Tabs) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('checklist')}
              className={`px-3 py-1.5 text-[10px] font-minecraft border-2 border-black transition ${
                viewMode === 'checklist'
                  ? 'mc-btn-emerald'
                  : 'mc-btn opacity-80'
              }`}
            >
              <CheckSquare className="w-3 h-3 inline mr-1" />
              <span>CHECKLIST</span>
            </button>
            <button
              onClick={() => setViewMode('completed')}
              className={`px-3 py-1.5 text-[10px] font-minecraft border-2 border-black transition ${
                viewMode === 'completed'
                  ? 'mc-btn-gold'
                  : 'mc-btn opacity-80'
              }`}
            >
              <Trophy className="w-3 h-3 inline mr-1" />
              <span>COMPLETED ({stats.completedCount})</span>
            </button>
          </div>

          {/* "Pick a Random Target" Button */}
          <button
            onClick={onOpenRandomModal}
            className="mc-btn-gold px-3 py-2 text-[10px] font-minecraft flex items-center gap-1.5 shrink-0"
            title="Roll 1 random uncollected item"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>RANDOM TARGET</span>
          </button>
        </div>

        {/* Row 2: Category Selector + Status Filter + Rarity Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <Layers className="w-3.5 h-3.5 text-[#aaaaaa] shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mc-input px-2.5 py-1 text-[11px] font-pixel cursor-pointer w-full"
            >
              <option value="All">All Categories (21)</option>
              {CATEGORIES.map((cat) => {
                const catStats = stats.categoryStats[cat];
                return (
                  <option key={cat} value={cat}>
                    {cat} {catStats ? `(${catStats.completed}/${catStats.total})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'remaining', label: 'Remaining' },
              { id: 'completed', label: 'Done' },
              { id: 'claimed_by_me', label: 'Hunting' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2 py-1 text-[10px] font-minecraft border border-black ${
                  statusFilter === st.id
                    ? 'bg-[#3b3b3b] text-[#ffff55] shadow-[inset_1px_1px_0_#fff,inset_-1px_-1px_0_#000]'
                    : 'bg-[#181818] text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Rarity Multi-Select Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {RARITIES.map((rarity) => {
              const isSelected = selectedRarities.includes(rarity);
              const colorInfo = RARITY_COLORS[rarity];

              return (
                <button
                  key={rarity}
                  onClick={() => toggleRarity(rarity)}
                  className={`px-2 py-0.5 text-[9px] font-minecraft border-2 border-black transition ${
                    isSelected
                      ? `${colorInfo.badge} shadow-[inset_1px_1px_0px_rgba(255,255,255,0.4)]`
                      : 'bg-[#121212] text-[#555555] opacity-50 hover:opacity-80'
                  }`}
                >
                  <span className="mc-shadow-sm">{rarity}</span>
                </button>
              );
            })}

            {selectedRarities.length < RARITIES.length && (
              <button
                onClick={handleSelectAllRarities}
                className="text-[9px] font-minecraft text-[#55ffff] hover:underline ml-1"
              >
                ALL
              </button>
            )}
          </div>

          {/* Count and Collapse Toggles */}
          <div className="flex items-center gap-2 text-[#888888] text-[10px] font-pixel ml-auto">
            <span>
              <strong className="text-white font-minecraft">{filteredItems.length}</strong> ITEMS
            </span>

            {viewMode === 'checklist' && (
              <div className="flex items-center gap-1 pl-1 border-l border-[#333333]">
                <button
                  onClick={expandAll}
                  className="hover:text-[#ffff55] transition"
                  title="Expand all categories"
                >
                  [+]
                </button>
                <span>/</span>
                <button
                  onClick={collapseAll}
                  className="hover:text-[#ffff55] transition"
                  title="Collapse all categories"
                >
                  [-]
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
