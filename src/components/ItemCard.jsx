import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { RARITY_COLORS } from '../data/itemsData';
import ItemIcon from './ItemIcon';
import { Check, ExternalLink, Crosshair } from 'lucide-react';

export default function ItemCard({ item }) {
  const { currentUser, hasScope } = useAuth();
  const { progress, toggleComplete, toggleClaim } = useItems();

  const itemState = progress[item.id] || {};
  const isCompleted = Boolean(itemState.is_completed);
  const completedBy = itemState.completed_by;
  const completedAt = itemState.completed_at;

  const claimedBy = itemState.claimed_by;
  const isClaimedByMe = claimedBy === currentUser;

  const colorInfo = RARITY_COLORS[item.rarity] || RARITY_COLORS.Common;
  const wikiUrl = `https://minecraft.wiki/w/Special:Search?search=${encodeURIComponent(item.name)}`;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      className={`group relative flex items-center justify-between gap-2 p-1.5 sm:p-2 border-2 border-black transition-all ${
        isCompleted
          ? 'bg-[#151c14] shadow-[inset_2px_2px_0px_#0b120a,inset_-2px_-2px_0px_#274225] opacity-80'
          : `bg-[#24211e] hover:bg-[#2c2824] shadow-[inset_2px_2px_0px_#3d3732,inset_-2px_-2px_0px_#12100e]`
      }`}
    >
      {/* Left: Checkbox + Block/Item Icon + Name + Badges */}
      <div className="flex items-center gap-2 min-w-0">
        
        {/* Minecraft Item Slot Checkbox */}
        <button
          type="button"
          onClick={() => toggleComplete(item.id)}
          disabled={!hasScope('progress:write')}
          aria-label={isCompleted ? `Unmark ${item.name}` : `Mark ${item.name} as collected`}
          className={`w-7 h-7 flex items-center justify-center shrink-0 border-2 border-black transition-all ${
            isCompleted
              ? 'bg-[#1e5c24] shadow-[inset_2px_2px_0px_#38a843,inset_-2px_-2px_0px_#0e3013] text-[#55ff55]'
              : 'mc-slot mc-slot-hover text-transparent hover:text-[#555555]'
          }`}
        >
          <Check className="w-4 h-4 stroke-[4]" />
        </button>

        {/* Real Minecraft Block/Item Icon */}
        <ItemIcon item={item} size="md" />

        {/* Item Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-pixel tracking-wide truncate transition ${
                isCompleted
                  ? 'line-through text-[#666666]'
                  : `${colorInfo.text} mc-shadow-sm`
              }`}
              title={item.name}
            >
              {item.name}
            </span>

            {/* Rarity Tag */}
            <span
              className={`px-1 py-0.2 text-[8px] font-minecraft border border-black uppercase ${colorInfo.badge}`}
            >
              {item.rarity}
            </span>
          </div>

          {/* Subtitle (Found by / Hunted by) */}
          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-pixel">
            {isCompleted ? (
              <span className="text-[#55ff55] mc-shadow-sm flex items-center gap-1">
                Found by <strong className="text-white">{completedBy || 'Survivor'}</strong>
                {completedAt && <span className="text-[#888888]">({formatDate(completedAt)})</span>}
              </span>
            ) : claimedBy ? (
              <span
                className={`flex items-center gap-1 font-semibold ${
                  isClaimedByMe ? 'text-[#55ffff]' : 'text-[#ffaa00]'
                } mc-shadow-sm`}
              >
                <Crosshair className="w-2.5 h-2.5" />
                {isClaimedByMe ? 'You are hunting this' : `Hunted by ${claimedBy}`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right Actions: Hunt Claim button + Wiki link */}
      <div className="flex items-center gap-1 shrink-0">
        {!isCompleted && (
          <button
            type="button"
            onClick={() => toggleClaim(item.id)}
            disabled={!hasScope('progress:write')}
            title={isClaimedByMe ? 'Release hunt' : 'Claim to hunt this item'}
            className={`px-2 py-1 text-[9px] font-minecraft border-2 border-black transition ${
              isClaimedByMe
                ? 'mc-btn-emerald'
                : claimedBy
                ? 'mc-btn-gold'
                : 'mc-btn text-[8px]'
            }`}
          >
            {isClaimedByMe ? 'HUNTING' : claimedBy ? claimedBy.slice(0, 7) : 'HUNT'}
          </button>
        )}

        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Lookup "${item.name}" on Minecraft Wiki`}
          className="p-1 text-[#777777] hover:text-[#55ffff] transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
