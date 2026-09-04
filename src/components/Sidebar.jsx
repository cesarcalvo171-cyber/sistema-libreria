import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  Printer,
  Package,
  TrendingUp,
  Receipt,
  History,
  Store,
  Database
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

const navItems = [
  {
    name: 'Facturación (POS)',
    path: '/',
    icon: ShoppingCart,
    badge: 'Módulo 1'
  },
  {
    name: 'Impresiones & Insumos',
    path: '/impresiones',
    icon: Printer,
    badge: 'Servicios'
  },
  {
    name: 'Inventario & Stock',
    path: '/inventario',
    icon: Package,
    badge: 'Módulo 2'
  },
  {
    name: 'Finanzas & Ganancias',
    path: '/finanzas',
    icon: TrendingUp,
    badge: 'Módulo 3'
  },
  {
    name: 'Registro de Gastos',
    path: '/gastos',
    icon: Receipt,
    badge: 'Módulo 4'
  },
  {
    name: 'Historial de Ventas',
    path: '/historial',
    icon: History,
    badge: 'Módulo 5'
  }
];

export const Sidebar = ({ onOpenConfig }) => {
  const isConfigured = isSupabaseConfigured();

  return (
    <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col h-screen sticky top-0 text-slate-100">
      {/* Brand / Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide">POS Calvo Díaz</h1>
          <p className="text-xs text-blue-400 font-medium">Librería & Servicios</p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Módulos
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Database connection footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80">
        <button
          onClick={onOpenConfig}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-xs transition group"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <div className="text-left">
              <p className="font-medium text-slate-200 group-hover:text-white">Supabase BD</p>
              <p className="text-[10px] text-slate-400">
                {isConfigured ? 'Conectado' : 'Configurar'}
              </p>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
        </button>
      </div>
    </aside>
  );
};
