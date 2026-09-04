import React from 'react';
import { Store, Database } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Navbar = ({ onOpenConfig }) => {
  const isConfigured = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b border-blue-800/80 px-4 py-3 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-white text-blue-900 flex items-center justify-center font-bold shadow-sm">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-wide">POS Calvo Díaz</h1>
          <p className="text-[10px] text-blue-200 font-medium">Sistema de Gestión & Ventas</p>
        </div>
      </div>

      {/* Supabase status button */}
      <button
        onClick={onOpenConfig}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-800/80 hover:bg-blue-800 border border-blue-700/60 rounded-xl text-xs font-medium text-blue-100 transition shadow-sm active:scale-95"
      >
        <Database className="w-3.5 h-3.5 text-blue-300" />
        <span className="hidden sm:inline">BD:</span>
        <span
          className={`w-2 h-2 rounded-full ${
            isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
          }`}
        />
      </button>
    </header>
  );
};
