import React, { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ItemsProvider, useItems } from './context/ItemsContext';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import CategorySection from './components/CategorySection';
import CompletedView from './components/CompletedView';
import RandomItemModal from './components/RandomItemModal';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { CATEGORIES } from './data/itemsData';

function MainTrackerApp() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const {
    filteredItems,
    viewMode,
    setSearchQuery,
    setSelectedCategory,
    setStatusFilter,
  } = useItems();

  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  const groupedByCategory = useMemo(() => {
    const groups = {};

    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setStatusFilter('all');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center mc-dirt-bg text-slate-200">
        <div className="mc-panel p-6 text-center">
          <div className="w-8 h-8 border-4 border-[#ffff55] border-t-transparent animate-spin mx-auto mb-3" />
          <span className="text-xs font-minecraft text-[#ffff55] mc-shadow-yellow">
            GENERATING WORLD...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mc-dirt-bg text-slate-100 flex flex-col font-pixel selection:bg-[#55ffff]/40 selection:text-white">
      {/* Site Password & Player Name Modal */}
      <AuthModal />

      {isAuthenticated && (
        <>
          {/* Top Dashboard Header */}
          <Header />

          {/* Sticky Filters & Search */}
          <FilterBar onOpenRandomModal={() => setIsRandomModalOpen(true)} />

          {/* Main Body Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
            {viewMode === 'completed' ? (
              <CompletedView />
            ) : (
              <div>
                {filteredItems.length === 0 ? (
                  <div className="py-16 text-center mc-panel p-6 max-w-md mx-auto">
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="text-sm font-minecraft text-[#ffff55] mc-shadow-yellow mb-2">
                      NO ITEMS FOUND
                    </h3>
                    <p className="text-xs font-pixel text-[#aaaaaa] mb-4">
                      No items matched your current filter criteria.
                    </p>
                    <button
                      onClick={resetAllFilters}
                      className="mc-btn-emerald px-4 py-2 text-xs"
                    >
                      RESET FILTERS
                    </button>
                  </div>
                ) : (
                  <div>
                    {CATEGORIES.map((category) => {
                      const categoryItems = groupedByCategory[category];
                      if (!categoryItems || categoryItems.length === 0) {
                        return null;
                      }

                      return (
                        <CategorySection
                          key={category}
                          categoryName={category}
                          items={categoryItems}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Random Target Picker Modal */}
          <RandomItemModal
            isOpen={isRandomModalOpen}
            onClose={() => setIsRandomModalOpen(false)}
          />

          {/* Undo Action Toast */}
          <Toast />

          {/* Footer */}
          <footer className="border-t-4 border-black bg-[#16120e] py-4 text-center text-[10px] font-pixel text-[#777777]">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="mc-shadow-sm">Minecraft "All Items" Vanilla Survival Tracker</p>
              <div className="flex items-center gap-3 text-[#aaaaaa]">
                <a
                  href="https://minecraft.wiki"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#55ffff] transition mc-shadow-sm"
                >
                  Minecraft Wiki
                </a>
                <span>•</span>
                <span>1,420 Items Tracked</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ItemsProvider>
        <MainTrackerApp />
      </ItemsProvider>
    </AuthProvider>
  );
}
