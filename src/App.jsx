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
import { Sparkles, Layers, SearchX } from 'lucide-react';

function MainTrackerApp() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const {
    filteredItems,
    viewMode,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    setSelectedRarities,
    setStatusFilter,
  } = useItems();

  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  // Group filtered items by category preserving original category order
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
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d11] text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Minecraft tracker...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d11] text-slate-100 flex flex-col font-sans">
      {/* Shared Site Password & Display Name Modal */}
      <AuthModal />

      {isAuthenticated && (
        <>
          {/* Top Dashboard Header */}
          <Header />

          {/* Sticky Filters & Search */}
          <FilterBar onOpenRandomModal={() => setIsRandomModalOpen(true)} />

          {/* Main Body Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
            {viewMode === 'completed' ? (
              <CompletedView />
            ) : (
              <div>
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center bg-[#131622]/60 border border-slate-800/80 rounded-3xl p-8 max-w-lg mx-auto">
                    <SearchX className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-1">No items found</h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      No items matched your current search and filter combination. Try clearing some filters.
                    </p>
                    <button
                      onClick={resetAllFilters}
                      className="px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
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
          <footer className="border-t border-[#1a1e2b] py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>Minecraft "All Items" Vanilla Survival Challenge Tracker</p>
              <div className="flex items-center gap-4 text-slate-400">
                <a
                  href="https://minecraft.wiki"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition"
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
