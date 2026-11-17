import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ITEMS, ITEMS_BY_ID, CATEGORIES, RARITIES } from '../data/itemsData';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const ItemsContext = createContext();
const LEGACY_KEY = 'mc_tracker_progress_v1';

export function ItemsProvider({ children }) {
  const { user, currentUser, hasScope } = useAuth();
  const actorRef = useRef(null);
  actorRef.current = user?.id;
  const [progress, setProgress] = useState({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [toast, setToast] = useState(null);
  const [legacyAvailable, setLegacyAvailable] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}')).length > 0 && !localStorage.getItem('mc_tracker_imported_v2'); }
    catch { return false; }
  });
  const canImportLegacy = legacyAvailable && user?.authMethod === 'password';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRarities, setSelectedRarities] = useState(RARITIES);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('checklist');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Data comes only from the authenticated server. An unavailable server never
  // silently falls back to independent browser progress.
  useEffect(() => {
    setProgress({}); setToast(null);
    if (!user) { setSyncStatus('disconnected'); setIsLoadingProgress(false); return; }
    if (!hasScope('progress:read')) { setSyncStatus('error'); return; }
    let active = true;
    const controller = new AbortController();
    setIsLoadingProgress(true); setSyncStatus('connecting');
    async function refresh() {
      try {
        const data = await api('/api/v1/progress', { signal: controller.signal });
        if (active) {
          setProgress(previous => Object.fromEntries(Object.entries(data.progress).map(([id, state]) =>
            [id, (previous[id]?.revision ?? 0) > state.revision ? previous[id] : state])));
          setSyncStatus('connected');
        }
      } catch (error) { if (active && error.name !== 'AbortError') setSyncStatus('error'); }
      finally { if (active) setIsLoadingProgress(false); }
    }
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [user]);

  const applyState = useCallback((result, actorId) => {
    if (actorRef.current !== actorId) return;
    setProgress(previous => (previous[result.item_id]?.revision ?? 0) > result.state.revision ? previous
      : { ...previous, [result.item_id]: result.state });
  }, []);

  const undoAction = useCallback(async (itemId, undoId) => {
    const actorId = actorRef.current;
    try {
      const result = await api(`/api/v1/progress/${itemId}/undo`, { method: 'POST', body: { undo_id: undoId } });
      applyState(result, actorId);
      if (actorRef.current === actorId) setToast(null);
    } catch (error) { if (actorRef.current === actorId) setToast({ id: Date.now(), message: error.message }); }
  }, [applyState]);

  const mutate = useCallback(async (itemId, change) => {
    const actorId = user?.id;
    if (!actorId || !hasScope('progress:write')) {
      setToast({ id: Date.now(), message: 'This key is read-only. Sign in with your account to make changes.' });
      return null;
    }
    try {
      const result = await api(`/api/v1/progress/${itemId}`, { method: 'PATCH', body: {
        ...change, expected_revision: progress[itemId]?.revision ?? 0,
      } });
      applyState(result, actorId);
      if (actorRef.current !== actorId) return null;
      setSyncStatus('connected');
      return result;
    } catch (error) {
      if (actorRef.current === actorId) setToast({ id: Date.now(), message: error.message });
      return null;
    }
  }, [user, progress, applyState, hasScope]);

  const toggleComplete = useCallback(async itemId => {
    const result = await mutate(itemId, { is_completed: !progress[itemId]?.is_completed });
    if (!result) return;
    const itemName = ITEMS_BY_ID[itemId]?.name ?? itemId;
    if (result.state.is_completed) confetti({ particleCount: 40, spread: 60, origin: { y: .85 }, colors: ['#38bdf8', '#22c55e', '#f59e0b', '#c084fc'] });
    setToast({ id: Date.now(), message: result.state.is_completed ? `Marked "${itemName}" as collected!` : `Unmarked "${itemName}"`,
      actionLabel: 'Undo', onUndo: () => undoAction(itemId, result.undo_id) });
  }, [progress, mutate, undoAction]);

  const toggleClaim = useCallback(async itemId => {
    const result = await mutate(itemId, { claimed: progress[itemId]?.claimed_by !== currentUser });
    if (!result) return;
    const itemName = ITEMS_BY_ID[itemId]?.name ?? itemId;
    setToast({ id: Date.now(), message: result.state.claimed_by ? `You are now hunting for "${itemName}"` : `Released hunt claim for "${itemName}"` });
  }, [progress, currentUser, mutate]);

  const importLegacy = useCallback(async () => {
    try {
      const saved = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
      const result = await api('/api/v1/progress/import', { method: 'POST', body: { progress: saved } });
      localStorage.setItem('mc_tracker_imported_v2', 'true'); setLegacyAvailable(false);
      setToast({ id: Date.now(), message: `Imported ${result.imported} saved items. Shared progress will refresh shortly.` });
    } catch (error) { setToast({ id: Date.now(), message: error.message }); }
  }, []);

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
        canImportLegacy,
        importLegacy,
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
