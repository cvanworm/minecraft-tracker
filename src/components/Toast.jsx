import React, { useEffect } from 'react';
import { useItems } from '../context/ItemsContext';
import { X } from 'lucide-react';

export default function Toast() {
  const { toast, setToast } = useItems();

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 5500);

    return () => clearTimeout(timer);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Minecraft Advancement Pop-up Window */}
      <div className="mc-tooltip p-3 max-w-sm flex items-center gap-3">
        <div className="w-8 h-8 bg-[#221c0b] border-2 border-[#ffaa00] flex items-center justify-center text-base shrink-0">
          🏆
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-minecraft text-[#ffff55] mc-shadow-yellow tracking-wider">
            ADVANCEMENT MADE!
          </div>
          <div className="text-[11px] font-pixel text-white truncate mc-shadow-sm">
            {toast.message}
          </div>
        </div>

        {toast.onUndo && (
          <button
            type="button"
            onClick={toast.onUndo}
            className="mc-btn px-2 py-1 text-[8px] text-[#ff5555] hover:text-white shrink-0"
          >
            UNDO
          </button>
        )}

        <button
          type="button"
          onClick={() => setToast(null)}
          className="text-[#888888] hover:text-white p-0.5 ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
