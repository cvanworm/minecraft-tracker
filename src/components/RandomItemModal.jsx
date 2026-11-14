import React, { useState, useEffect } from 'react';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import { RARITY_COLORS } from '../data/itemsData';
import ItemIcon from './ItemIcon';
import { Dices, ExternalLink, Crosshair, Check, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-md mc-panel p-5 text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="mc-btn absolute right-3 top-3 px-2 py-1 text-xs"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#3a2f0e] border-2 border-black flex items-center justify-center text-[#ffaa00]">
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold font-minecraft text-[#ffff55] mc-shadow-yellow">
              NEXT SURVIVAL TARGET
            </h2>
            <p className="text-[10px] font-pixel text-[#aaaaaa]">Random uncollected item</p>
          </div>
        </div>

        {/* Item Display Card (Minecraft Tooltip Style!) */}
        {targetItem ? (
          <div
            className={`mc-tooltip p-4 mb-4 transition-all ${
              isRolling ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span
                className={`px-1.5 py-0.5 text-[8px] font-minecraft border border-black uppercase ${colorInfo.badge}`}
              >
                {targetItem.rarity}
              </span>

              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-pixel text-[#55ffff] hover:underline"
              >
                <span>Wiki</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <ItemIcon item={targetItem} size="lg" />
              <div>
                <h3 className={`text-base sm:text-lg font-bold font-minecraft ${colorInfo.text} mc-shadow`}>
                  {targetItem.name}
                </h3>
                <p className="text-[10px] font-pixel text-[#aaaaaa] mt-0.5">
                  Category: <span className="text-[#ffffff]">{targetItem.category}</span>
                </p>
              </div>
            </div>

            {itemState.claimed_by && (
              <div className="text-[10px] font-pixel text-[#ffaa00] bg-[#291e0a] border border-black p-1.5 flex items-center gap-1.5">
                <Crosshair className="w-3 h-3 shrink-0" />
                <span>
                  Hunted by <strong>{itemState.claimed_by}</strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-pixel text-[#aaaaaa] mc-slot mb-4">
            🎉 All matching items in your current filter are already completed or claimed!
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {targetItem && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleClaim}
                className="mc-btn-emerald py-2 px-3 text-[10px] flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3 h-3" />
                <span>{isClaimedByMe ? 'RELEASE' : 'START HUNT'}</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="mc-btn-gold py-2 px-3 text-[10px] flex items-center justify-center gap-1.5"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>COLLECTED</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={rollItem}
            disabled={isRolling}
            className="mc-btn w-full py-2 px-3 text-[10px] flex items-center justify-center gap-1.5"
          >
            <Dices className={`w-3 h-3 ${isRolling ? 'animate-spin' : ''}`} />
            <span>ROLL ANOTHER</span>
          </button>
        </div>

      </div>
    </div>
  );
}
