import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ITEMS, ITEMS_BY_ID, CATEGORIES, RARITIES } from '../data/itemsData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ItemsContext = createContext();

const LOCAL_STORAGE_PROGRESS_KEY = 'mc_tracker_progress_v1';

export function ItemsProvider({ children }) {
  const { currentUser } = useAuth();

  // Progress map: itemId -> { is_completed, completed_by, completed_at, claimed_by, claimed_at }
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed reading progress from localStorage:', e);
      return {};
    }
  });

  const [isLoadingProgress, setIsLoadingProgress] = useState(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'connecting' : 'local-only');
  const [toast, setToast] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRarities, setSelectedRarities] = useState(RARITIES);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'remaining', 'completed', 'claimed_by_me'
  const [viewMode, setViewMode] = useState('checklist'); // 'checklist' | 'completed'
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Sync with Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('local-only');
      return;
    }

    let isMounted = true;

    async function fetchInitialProgress() {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase
          .from('minecraft_item_progress')
          .select('*');

        if (error) {
          console.error('Error fetching Supabase progress:', error);
          setSyncStatus('error');
          return;
        }

        if (isMounted && data) {
          const remoteProgress = {};
          data.forEach((row) => {
            remoteProgress[row.item_id] = {
              is_completed: Boolean(row.is_completed),
              completed_by: row.completed_by || null,
              completed_at: row.completed_at || null,
              claimed_by: row.claimed_by || null,
              claimed_at: row.claimed_at || null,
            };
          });

          setProgress((prev) => {
            const merged = { ...prev, ...remoteProgress };
            try {
              localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
          setSyncStatus('connected');
        }
      } catch (err) {
        console.error('Supabase fetch failed:', err);
        setSyncStatus('error');
      } finally {
        if (isMounted) setIsLoadingProgress(false);
      }
    }

    fetchInitialProgress();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:minecraft_item_progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'minecraft_item_progress' },
        (payload) => {
          if (!payload.new && !payload.old) return;

          const updatedRow = payload.new;
          if (updatedRow && updatedRow.item_id) {
            setProgress((prev) => {
              const updated = {
                ...prev,
                [updatedRow.item_id]: {
                  is_completed: Boolean(updatedRow.is_completed),
                  completed_by: updatedRow.completed_by || null,
                  completed_at: updatedRow.completed_at || null,
                  claimed_by: updatedRow.claimed_by || null,
                  claimed_at: updatedRow.claimed_at || null,
                },
              };
              try {
                localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Save progress locally when updated
  const saveProgressState = useCallback((newProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(newProgress));
    } catch (e) {}
  }, []);

  // Toggle item completion
  const toggleComplete = useCallback(
    async (itemId) => {
      const current = progress[itemId] || {};
      const wasCompleted = Boolean(current.is_completed);
      const isNowCompleted = !wasCompleted;

      const previousState = { ...current };

      const updatedItemState = {
        is_completed: isNowCompleted,
        completed_by: isNowCompleted ? (currentUser || 'Anonymous') : null,
        completed_at: isNowCompleted ? new Date().toISOString() : null,
        claimed_by: isNowCompleted ? null : current.claimed_by, // clear hunting claim once completed
        claimed_at: isNowCompleted ? null : current.claimed_at,
      };

      const newProgress = {
        ...progress,
        [itemId]: updatedItemState,
      };

      saveProgressState(newProgress);

      const itemName = ITEMS_BY_ID[itemId]?.name || itemId;

      // Milestone or celebratory confetti on completion
      if (isNowCompleted) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.85 },
          colors: ['#38bdf8', '#22c55e', '#f59e0b', '#c084fc'],
        });
      }

      // Record for undo
      setLastAction({
        itemId,
        previousState,
        actionType: isNowCompleted ? 'completed' : 'uncompleted',
        itemName,
      });

      // Show Undo Toast
      setToast({
        id: Date.now(),
        message: isNowCompleted
          ? `Marked "${itemName}" as collected!`
          : `Unmarked "${itemName}"`,
        actionLabel: 'Undo',
        onUndo: () => undoAction(itemId, previousState, itemName),
      });

      // Sync to Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('minecraft_item_progress').upsert({
            item_id: itemId,
            is_completed: updatedItemState.is_completed,
            completed_by: updatedItemState.completed_by,
            completed_at: updatedItemState.completed_at,
            claimed_by: updatedItemState.claimed_by,
            claimed_at: updatedItemState.claimed_at,
            updated_at: new Date().toISOString(),
          });

          if (error) console.error('Supabase upsert error:', error);
        } catch (err) {
          console.error('Failed to sync toggleComplete:', err);
        }
      }
    },
    [progress, currentUser, saveProgressState]
  );

  // Toggle Hunting / Claim status
  const toggleClaim = useCallback(
    async (itemId) => {
      const current = progress[itemId] || {};
      const isClaimedByMe = current.claimed_by === currentUser;
      const isNowClaimed = !isClaimedByMe;

      const updatedItemState = {
        ...current,
        claimed_by: isNowClaimed ? (currentUser || 'Anonymous') : null,
        claimed_at: isNowClaimed ? new Date().toISOString() : null,
      };

      const newProgress = {
        ...progress,
        [itemId]: updatedItemState,
      };

      saveProgressState(newProgress);

      const itemName = ITEMS_BY_ID[itemId]?.name || itemId;

      setToast({
        id: Date.now(),
        message: isNowClaimed
          ? `You are now hunting for "${itemName}"`
          : `Released hunt claim for "${itemName}"`,
      });

      // Sync to Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('minecraft_item_progress').upsert({
            item_id: itemId,
            is_completed: Boolean(updatedItemState.is_completed),
            completed_by: updatedItemState.completed_by || null,
            completed_at: updatedItemState.completed_at || null,
            claimed_by: updatedItemState.claimed_by,
            claimed_at: updatedItemState.claimed_at,
            updated_at: new Date().toISOString(),
          });
          if (error) console.error('Supabase claim upsert error:', error);
        } catch (err) {
          console.error('Failed to sync toggleClaim:', err);
        }
      }
    },
    [progress, currentUser, saveProgressState]
  );

  // Undo action
  const undoAction = useCallback(
    async (itemId, previousState, itemName) => {
      setProgress((prev) => {
        const reverted = {
          ...prev,
          [itemId]: previousState,
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(reverted));
        } catch (e) {}
        return reverted;
      });

      setToast(null);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('minecraft_item_progress').upsert({
            item_id: itemId,
            is_completed: Boolean(previousState.is_completed),
            completed_by: previousState.completed_by || null,
            completed_at: previousState.completed_at || null,
            claimed_by: previousState.claimed_by || null,
            claimed_at: previousState.claimed_at || null,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.error('Undo sync error:', e);
        }
      }
    },
    []
  );

  // Toggle category collapse
  const toggleCategoryCollapse = useCallback((catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  }, []);

  const collapseAll = useCallback(() => {
    const all = {};
    CATEGORIES.forEach((c) => (all[c] = true));
    setCollapsedCategories(all);
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedCategories({});
  }, []);

  // Rarity filter toggles
  const toggleRarity = useCallback((rarity) => {
    setSelectedRarities((prev) => {
      if (prev.includes(rarity)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((r) => r !== rarity);
      } else {
        return [...prev, rarity];
      }
    });
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const totalItems = ITEMS.length;
    let completedCount = 0;
    const rarityBreakdown = {
      Common: { total: 0, completed: 0 },
      Uncommon: { total: 0, completed: 0 },
      Rare: { total: 0, completed: 0 },
      Epic: { total: 0, completed: 0 },
      Legendary: { total: 0, completed: 0 },
    };

    const playerCounts = {};
    const categoryStats = {};

    CATEGORIES.forEach((cat) => {
      categoryStats[cat] = { total: 0, completed: 0 };
    });

    ITEMS.forEach((item) => {
      const isDone = Boolean(progress[item.id]?.is_completed);
      const user = progress[item.id]?.completed_by;

      if (rarityBreakdown[item.rarity]) {
        rarityBreakdown[item.rarity].total += 1;
        if (isDone) rarityBreakdown[item.rarity].completed += 1;
      }

      if (categoryStats[item.category]) {
        categoryStats[item.category].total += 1;
        if (isDone) categoryStats[item.category].completed += 1;
      }

      if (isDone) {
        completedCount += 1;
        if (user) {
          playerCounts[user] = (playerCounts[user] || 0) + 1;
        }
      }
    });

    const leaderboard = Object.entries(playerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      completedCount,
      percentage,
      rarityBreakdown,
      leaderboard,
      categoryStats,
    };
  }, [progress]);

  // Filtered Items computation
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ITEMS.filter((item) => {
      const p = progress[item.id] || {};
      const isDone = Boolean(p.is_completed);
      const isClaimedByMe = p.claimed_by === currentUser;

      // Status filter
      if (statusFilter === 'remaining' && isDone) return false;
      if (statusFilter === 'completed' && !isDone) return false;
      if (statusFilter === 'claimed_by_me' && (!isClaimedByMe || isDone)) return false;

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Rarity filter
      if (!selectedRarities.includes(item.rarity)) {
        return false;
      }

      // Search query
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedRarities, statusFilter, progress, currentUser]);

  // Pick 1 random uncompleted & unclaimed item respecting active filters
  const pickRandomTarget = useCallback(() => {
    const candidates = filteredItems.filter((item) => {
      const p = progress[item.id] || {};
      return !p.is_completed && !p.claimed_by;
    });

    if (candidates.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }, [filteredItems, progress]);

  return (
    <ItemsContext.Provider
      value={{
        items: ITEMS,
        progress,
        stats,
        syncStatus,
        isLoadingProgress,
        toggleComplete,
        toggleClaim,
        toast,
        setToast,
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
        collapsedCategories,
        toggleCategoryCollapse,
        collapseAll,
        expandAll,
        filteredItems,
        pickRandomTarget,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
}
