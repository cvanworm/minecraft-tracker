import React from 'react';
import { useItems } from '../context/ItemsContext';
import ItemCard from './ItemCard';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function CategorySection({ categoryName, items }) {
  const { collapsedCategories, toggleCategoryCollapse, stats } = useItems();

  const isCollapsed = Boolean(collapsedCategories[categoryName]);
  const catStats = stats.categoryStats[categoryName] || { total: items.length, completed: 0 };
  const pct = catStats.total > 0 ? Math.round((catStats.completed / catStats.total) * 100) : 0;
  const isAllDone = catStats.total > 0 && catStats.completed === catStats.total;

  return (
    <div className="border border-[#1f2438] bg-[#0f121b]/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Category Header */}
      <button
        type="button"
        onClick={() => toggleCategoryCollapse(categoryName)}
        className="w-full flex items-center justify-between p-4 bg-[#141824] hover:bg-[#181d2c] transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-slate-400">
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {categoryName}
              </h3>
              {isAllDone && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-200">{catStats.completed}</span> of{' '}
              <span className="text-slate-200">{catStats.total}</span> collected ({pct}%)
            </p>
          </div>
        </div>

        {/* Mini progress bar on the right */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-20 sm:w-28 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 hidden sm:block">
            <div
              className={`h-full transition-all duration-300 ${
                isAllDone
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 w-10 text-right">
            {pct}%
          </span>
        </div>
      </button>

      {/* Item List (Grid) */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4 bg-[#0d1017]">
          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 italic">
              No items match your active filters in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
