import React, { useState, useEffect } from 'react';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import { RARITY_COLORS } from '../data/itemsData';
import { Dices, ExternalLink, Crosshair, Check, X, Sparkles } from 'lucide-react';

export default function RandomItemModal({ isOpen, onClose }) {
  const { pickRandomTarget, toggleComplete, toggleClaim, progress } = useItems();
  const { currentUser } = useAuth();
  const [targetItem, setTargetItem] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      rollItem();
    }
  }, [isOpen]);

  const rollItem = () => {
    setIsRolling(true);
    setTimeout(() => {
      const item = pickRandomTarget();
      setTargetItem(item);
      setIsRolling(false);
    }, 200);
  };

  if (!isOpen) return null;

  const itemState = targetItem ? progress[targetItem.id] || {} : {};
  const isClaimedByMe = itemState.claimed_by === currentUser;
  const isCompleted = Boolean(itemState.is_completed);
  const colorInfo = targetItem ? RARITY_COLORS[targetItem.rarity] || RARITY_COLORS.Common : null;
  const wikiUrl = targetItem
    ? `https://minecraft.wiki/w/Special:Search?search=${encodeURIComponent(targetItem.name)}`
    : '#';

  const handleClaim = () => {
    if (targetItem) {
      toggleClaim(targetItem.id);
      onClose();
    }
  };

  const handleComplete = () => {
    if (targetItem) {
      toggleComplete(targetItem.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#131722] border border-[#23293a] rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Dices className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Next Survival Target
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400">Randomly selected uncollected item</p>
          </div>
        </div>

        {/* Item Display Card */}
        {targetItem ? (
          <div
            className={`p-6 rounded-2xl bg-[#0e111a] border ${colorInfo.border} shadow-lg mb-6 transition-all duration-300 ${
              isRolling ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold border tracking-wide uppercase ${colorInfo.badge}`}
              >
                {targetItem.rarity}
              </span>

              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                <span>Minecraft Wiki</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-1">
              {targetItem.name}
            </h3>

            <p className="text-xs font-medium text-slate-400 mb-4">
              Category: <strong className="text-slate-300">{targetItem.category}</strong>
            </p>

            {itemState.claimed_by && (
              <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-xl flex items-center gap-2">
                <Crosshair className="w-4 h-4 shrink-0" />
                <span>
                  Currently marked as hunted by <strong>{itemState.claimed_by}</strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-400 bg-[#0e111a] rounded-2xl mb-6">
            🎉 All matching items in your current filter are already completed or claimed!
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {targetItem && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleClaim}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 bg-[#191f2f] hover:bg-[#20273c] text-cyan-300 border border-cyan-800/50 shadow-sm transition"
              >
                <Crosshair className="w-4 h-4" />
                <span>{isClaimedByMe ? 'Release Hunt' : 'Start Hunting'}</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Mark Collected</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={rollItem}
              disabled={isRolling}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white transition flex items-center justify-center gap-2"
            >
              <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
              <span>Roll Another Item</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
