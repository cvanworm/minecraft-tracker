import React from 'react';
import ITEM_ICONS from '../data/itemIcons.js';

/**
 * Renders a Minecraft item icon from the pre-resolved wiki URL map.
 * No runtime URL guessing, no cascading onError, no flickering.
 * 
 * If the item has no resolved URL, shows a fallback pickaxe emoji.
 * Run "npm run fetch-icons" to regenerate the icon map.
 */
export default function ItemIcon({ item, size = 'md', className = '' }) {
  const iconUrl = item?.id ? ITEM_ICONS[item.id] : null;

  const sizeClasses = {
    sm: 'w-6 h-6 min-w-6 min-h-6',
    md: 'w-8 h-8 min-w-8 min-h-8',
    lg: 'w-12 h-12 min-w-12 min-h-12',
  }[size] || 'w-8 h-8 min-w-8 min-h-8';

  const imgSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }[size] || 'w-6 h-6';

  return (
    <div
      className={`mc-slot flex items-center justify-center shrink-0 p-0.5 ${sizeClasses} ${className}`}
      title={item?.name}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={item?.name || 'Minecraft Item'}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className={`${imgSize} object-contain pixelated pointer-events-none drop-shadow-sm`}
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#ffaa00]">
          ⛏️
        </div>
      )}
    </div>
  );
}
