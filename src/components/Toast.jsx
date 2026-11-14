import React, { useEffect } from 'react';
import { useItems } from '../context/ItemsContext';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className="flex items-center gap-3 bg-[#161a26] border border-[#2b3248] text-slate-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm font-medium">{toast.message}</span>

        {toast.onUndo && (
          <button
            type="button"
            onClick={toast.onUndo}
            className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setToast(null)}
          className="text-slate-500 hover:text-slate-300 ml-1 p-0.5 rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
