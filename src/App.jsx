import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { POSPage } from './pages/POSPage';
import { PrintStatsPage } from './pages/PrintStatsPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Módulo 1: Facturación (POS) */}
          <Route index element={<POSPage />} />

          {/* Módulo de Impresiones & Control de Insumos */}
          <Route path="impresiones" element={<PrintStatsPage />} />

          {/* Módulo 2: Inventario & Control de Stock */}
          <Route path="inventario" element={<InventoryPage />} />

          {/* Módulo 3: Finanzas & Rentabilidad */}
          <Route path="finanzas" element={<FinancePage />} />

          {/* Módulo 4: Registro de Gastos */}
          <Route path="gastos" element={<ExpensesPage />} />

          {/* Módulo 5: Historial de Ventas */}
          <Route path="historial" element={<SalesHistoryPage />} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
