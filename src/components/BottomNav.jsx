import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  Printer,
  Package,
  TrendingUp,
  Receipt,
  History
} from 'lucide-react';

const mobileNavItems = [
  { name: 'POS', path: '/', icon: ShoppingCart },
  { name: 'Impresión', path: '/impresiones', icon: Printer },
  { name: 'Stock', path: '/inventario', icon: Package },
  { name: 'Finanzas', path: '/finanzas', icon: TrendingUp },
  { name: 'Gastos', path: '/gastos', icon: Receipt },
  { name: 'Historial', path: '/historial', icon: History }
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden">
      <div className="grid grid-cols-6 h-16 max-w-lg mx-auto">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors select-none relative ${
                  isActive
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[9px] tracking-tight truncate">{item.name}</span>
                  {isActive && (
                    <span className="w-6 h-1 bg-blue-700 rounded-full absolute top-0"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
