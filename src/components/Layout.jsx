import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { Toaster } from 'sonner';

export const Layout = () => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
      <Toaster position="top-center" richColors theme="light" closeButton />

      {/* Sidebar para desktop */}
      <Sidebar onOpenConfig={() => setIsConfigOpen(true)} />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Barra superior (especialmente útil y visible en móvil) */}
        <Navbar onOpenConfig={() => setIsConfigOpen(true)} />

        {/* Área de Contenido con margen inferior en móvil para la barra de navegación */}
        <main className="flex-1 pb-20 md:pb-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Barra de navegación inferior móvil */}
        <BottomNav />
      </div>

      {/* Modal de conexión Supabase */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
};
