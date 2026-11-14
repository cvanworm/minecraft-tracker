import React from 'react';
import { useItems } from '../context/ItemsContext';
import { RARITIES, RARITY_COLORS, CATEGORIES } from '../data/itemsData';
import {
  Search,
  X,
  Dices,
  Layers,
  CheckCircle,
  Clock,
  Compass,
  ChevronsUpDown,
  Filter,
  CheckSquare,
  Crosshair,
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
    <div className="sticky top-[182px] sm:top-[166px] z-30 bg-[#0e1118]/95 backdrop-blur-md border-b border-[#1f2433] shadow-md py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3">
        
        {/* Row 1: Search + View Mode Tabs + Random Target Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Instant Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 1,420 items (e.g. Netherite, Potion, Disc)..."
              className="w-full bg-[#131622] border border-[#23283a] rounded-xl pl-10 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                title="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Checklist vs Completed (Trophy Room) */}
          <div className="flex items-center bg-[#131622] border border-[#23283a] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('checklist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'checklist'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklist</span>
            </button>
            <button
              onClick={() => setViewMode('completed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Completed ({stats.completedCount})</span>
            </button>
          </div>

          {/* "Pick a Random Target" Button */}
          <button
            onClick={onOpenRandomModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition active:scale-[0.98]"
            title="Roll 1 random uncollected item"
          >
            <Dices className="w-4 h-4" />
            <span className="hidden sm:inline">Pick Random Target</span>
            <span className="sm:hidden">Random</span>
          </button>
        </div>

        {/* Row 2: Category Selector + Status Filter + Rarity Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#131622] border border-[#23283a] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer w-full"
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
          <div className="flex items-center bg-[#131622] border border-[#23283a] p-0.5 rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'remaining', label: 'Remaining' },
              { id: 'completed', label: 'Completed' },
              { id: 'claimed_by_me', label: 'Claimed by Me' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  statusFilter === st.id
                    ? 'bg-slate-700/80 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Rarity Multi-Select Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Rarity:</span>
            {RARITIES.map((rarity) => {
              const isSelected = selectedRarities.includes(rarity);
              const colorInfo = RARITY_COLORS[rarity];

              return (
                <button
                  key={rarity}
                  onClick={() => toggleRarity(rarity)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                    isSelected
                      ? colorInfo.badge
                      : 'bg-transparent text-slate-500 border-slate-800 opacity-50 hover:opacity-80'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? colorInfo.dot : 'bg-slate-600'}`}
                  />
                  <span>{rarity}</span>
                </button>
              );
            })}

            {selectedRarities.length < RARITIES.length && (
              <button
                onClick={handleSelectAllRarities}
                className="text-[10px] text-cyan-400 hover:underline ml-1"
              >
                Select All
              </button>
            )}
          </div>

          {/* Expand / Collapse All & Match Counter */}
          <div className="flex items-center gap-3 text-slate-400 text-[11px] ml-auto">
            <span>
              Showing <strong className="text-white font-mono">{filteredItems.length}</strong> items
            </span>

            {viewMode === 'checklist' && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                <button
                  onClick={expandAll}
                  className="hover:text-cyan-400 transition"
                  title="Expand all categories"
                >
                  Expand
                </button>
                <span>/</span>
                <button
                  onClick={collapseAll}
                  className="hover:text-cyan-400 transition"
                  title="Collapse all categories"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
