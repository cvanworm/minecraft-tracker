import React from 'react';
import { useItems } from '../context/ItemsContext';
import ItemCard from './ItemCard';

export default function CategorySection({ categoryName, items }) {
  const { collapsedCategories, toggleCategoryCollapse, stats } = useItems();

  const isCollapsed = Boolean(collapsedCategories[categoryName]);
  const catStats = stats.categoryStats[categoryName] || { total: items.length, completed: 0 };
  const pct = catStats.total > 0 ? Math.round((catStats.completed / catStats.total) * 100) : 0;
  const isAllDone = catStats.total > 0 && catStats.completed === catStats.total;

  return (
    <div className="mc-panel mb-3 overflow-hidden">
      {/* Category Header */}
      <button
        type="button"
        onClick={() => toggleCategoryCollapse(categoryName)}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-[#332f2c] hover:bg-[#3d3834] border-b-2 border-black transition text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-minecraft text-xs text-[#ffff55] mc-shadow-yellow w-5 text-center shrink-0">
            {isCollapsed ? '[+]' : '[-]'}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold font-minecraft text-white mc-shadow truncate">
                {categoryName}
              </h3>
              {isAllDone && (
                <span className="text-[9px] font-minecraft text-[#55ff55] bg-[#122e15] border border-black px-1.5 py-0.2 mc-shadow-green">
                  COMPLETE
                </span>
              )}
            </div>

            <p className="text-[10px] font-pixel text-[#aaaaaa] mt-0.5 mc-shadow-sm">
              <span className="text-[#55ff55]">{catStats.completed}</span> / {catStats.total} COLLECTED ({pct}%)
            </p>
          </div>
        </div>

        {/* Mini progress bar on the right */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 sm:w-24 h-2.5 bg-[#0a0f07] border border-black overflow-hidden hidden sm:block">
            <div
              className={`h-full transition-all duration-300 ${
                isAllDone
                  ? 'bg-[#55ff55]'
                  : 'bg-gradient-to-r from-[#55ff55] to-[#ffff55]'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <span className="text-[10px] font-minecraft text-[#ffff55] w-9 text-right mc-shadow-yellow">
            {pct}%
          </span>
        </div>
      </button>

      {/* Item List (Grid) */}
      {!isCollapsed && (
        <div className="p-2 sm:p-2.5 bg-[#181512]">
          {items.length === 0 ? (
            <div className="py-4 text-center text-[10px] font-pixel text-[#777777] italic">
              No items match your active filters in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2">
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
