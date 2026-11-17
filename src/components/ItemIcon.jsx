import React, { useState } from 'react';
import ITEM_ICONS from '../data/itemIcons.js';

/**
 * Local inventory icons extracted/rendered from the installed vanilla client.
 * Run scripts/extractItemIcons.py with a client JAR to regenerate the map.
 */
export default function ItemIcon({ item, size = 'md', className = '' }) {
  const iconUrl = item?.id ? ITEM_ICONS[item.id] : null;
  const [failedUrl, setFailedUrl] = useState(null);
  const src = iconUrl?.startsWith('/')
    ? `${import.meta.env.BASE_URL}${iconUrl.slice(1)}`
    : iconUrl;

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
      {iconUrl && failedUrl !== iconUrl ? (
        <img
          src={src}
          alt={item?.name || 'Minecraft Item'}
          onError={() => setFailedUrl(iconUrl)}
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
