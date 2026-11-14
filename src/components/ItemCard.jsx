import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../context/ItemsContext';
import { RARITY_COLORS } from '../data/itemsData';
import { Check, ExternalLink, Crosshair, User, Clock } from 'lucide-react';

export default function ItemCard({ item }) {
  const { currentUser } = useAuth();
  const { progress, toggleComplete, toggleClaim } = useItems();

  const itemState = progress[item.id] || {};
  const isCompleted = Boolean(itemState.is_completed);
  const completedBy = itemState.completed_by;
  const completedAt = itemState.completed_at;

  const claimedBy = itemState.claimed_by;
  const isClaimedByMe = claimedBy === currentUser;
  const isClaimedByOther = claimedBy && claimedBy !== currentUser;

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
      className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 ${
        isCompleted
          ? 'bg-[#10131b]/60 border-slate-800/60 opacity-80'
          : `bg-[#141824] ${colorInfo.border} ${colorInfo.glow} hover:bg-[#181d2c]`
      }`}
    >
      {/* Left: Checkbox + Name + Badges */}
      <div className="flex items-center gap-3 min-w-0">
        
        {/* Custom Checkbox */}
        <button
          type="button"
          onClick={() => toggleComplete(item.id)}
          aria-label={isCompleted ? `Unmark ${item.name}` : `Mark ${item.name} as collected`}
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/20'
              : 'border-slate-700 bg-[#0b0e16] hover:border-cyan-400 text-transparent hover:text-slate-600'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Item Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold truncate tracking-tight transition ${
                isCompleted
                  ? 'line-through text-slate-500'
                  : 'text-slate-100 group-hover:text-white'
              }`}
              title={item.name}
            >
              {item.name}
            </span>

            {/* Rarity Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${colorInfo.badge}`}
            >
              {item.rarity}
            </span>
          </div>

          {/* Subtitle / Metadata (Completed by / Claimed by) */}
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                <Check className="w-3 h-3" />
                Found by <strong className="font-semibold text-emerald-300">{completedBy || 'Survivor'}</strong>
                {completedAt && <span className="opacity-70">({formatDate(completedAt)})</span>}
              </span>
            ) : claimedBy ? (
              <span
                className={`flex items-center gap-1 font-medium ${
                  isClaimedByMe ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                <Crosshair className="w-3 h-3 animate-spin-slow" />
                {isClaimedByMe ? 'You are hunting this' : `Hunted by ${claimedBy}`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right Actions: Claim button + Wiki link */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Claim / Hunting Toggle (Only on uncompleted items) */}
        {!isCompleted && (
          <button
            type="button"
            onClick={() => toggleClaim(item.id)}
            title={
              isClaimedByMe
                ? 'Click to release hunt claim'
                : claimedBy
                ? `Currently being hunted by ${claimedBy}. Click to overtake.`
                : 'Claim this item to notify your friend you are hunting it'
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
              isClaimedByMe
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80'
                : claimedBy
                ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                : 'bg-transparent text-slate-400 border-transparent hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            <span className="hidden sm:inline">
              {isClaimedByMe ? 'Hunting' : claimedBy ? claimedBy : 'Hunt'}
            </span>
          </button>
        )}

        {/* Wiki Link */}
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Lookup "${item.name}" on Minecraft Wiki`}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800/80 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
