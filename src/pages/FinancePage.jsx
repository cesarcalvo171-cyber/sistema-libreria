import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  PackageCheck,
  Receipt,
  PieChart,
  Percent,
  BarChart3,
  ArrowDownRight,
  Printer,
  BookOpen,
  Layers,
  Sparkles
} from 'lucide-react';
import { financeService } from '../services/financeService';
import { formatCurrency, getMonthName } from '../lib/formatters';
import { toast } from 'sonner';

export const FinancePage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const data = await financeService.getMonthlySummary(selectedMonth, selectedYear);
      setSummary(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al calcular finanzas: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth, selectedYear]);

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Encabezado y Selector Móvil */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-700" />
            Finanzas & Ganancias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Rentabilidad mensual, balance de ventas, costo y desglose por línea de negocio
          </p>
        </div>

        {/* Selector de Mes y Año */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 p-1.5 rounded-2xl shadow-xs self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-blue-700 ml-1.5" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {getMonthName(i)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 border-l border-slate-200 focus:outline-none cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Calculando estado de resultados...</p>
        </div>
      ) : summary ? (
        <>
          {/* Tarjeta Principal de Ganancia Neta (Corporate Navy & White) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-blue-900 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-blue-800/90 text-blue-200 px-3 py-1 rounded-full">
                  Ganancia Neta Real ({getMonthName(selectedMonth)} {selectedYear})
                </span>
                <h3 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
                  {formatCurrency(summary.profitability.netProfit)}
                </h3>
              </div>

              <div className="bg-blue-950/70 border border-blue-800/80 p-4 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
                <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 uppercase font-bold block">
                    Margen Neto
                  </span>
                  <p className="text-xl font-black text-white">
                    {summary.profitability.profitMarginPercentage}%
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-blue-200 border-t border-blue-800/80 pt-3">
              Fórmula: Ventas ({formatCurrency(summary.sales.totalRevenue)}) - Costo Insumos/Productos ({formatCurrency(summary.sales.totalCostOfGoodsSold)}) - Gastos ({formatCurrency(summary.expenses.totalExpenses)})
            </p>
          </div>

          {/* SECCIÓN DESTACADA: DESGLOSE LIBRERÍA VS IMPRESIONES */}
          {summary.breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta 1: Línea Impresiones & Servicios */}
              <div className="p-5 bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-3xl shadow-md border border-indigo-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-800/80 text-cyan-300 rounded-xl">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-base leading-tight">🖨️ Impresiones & Copias</h4>
                      <p className="text-[10px] text-indigo-200">Servicios B/N, Color, Copias y Opalina</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 px-2.5 py-1 rounded-full">
                    {summary.breakdown.printing.sharePercentage}% de ventas
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-800/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Ventas</span>
                    <p className="text-base sm:text-lg font-black text-white mt-0.5">
                      {formatCurrency(summary.breakdown.printing.revenue)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Costo Insumos</span>
                    <p className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                      {formatCurrency(summary.breakdown.printing.cost)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-200 block">Ganancia Bruta</span>
                    <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                      {formatCurrency(summary.breakdown.printing.grossProfit)}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-indigo-950/60 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                  <span>Margen de Ganancia: <strong className="text-emerald-300 font-bold">{summary.breakdown.printing.marginPercentage}%</strong></span>
                  <span>Total Servicios: <strong className="text-white font-bold">{summary.breakdown.printing.itemsCount}</strong></span>
                </div>
              </div>

              {/* Tarjeta 2: Línea Librería & Artículos Físicos */}
              <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900 leading-tight">📚 Artículos de Librería</h4>
                      <p className="text-[10px] text-slate-500">Útiles, cuadernos, papelería y productos</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full">
                    {summary.breakdown.library.sharePercentage}% de ventas
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ventas</span>
                    <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                      {formatCurrency(summary.breakdown.library.revenue)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Costo Prod.</span>
                    <p className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
                      {formatCurrency(summary.breakdown.library.cost)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Ganancia Bruta</span>
                    <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                      {formatCurrency(summary.breakdown.library.grossProfit)}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                  <span>Margen de Ganancia: <strong className="text-emerald-700 font-bold">{summary.breakdown.library.marginPercentage}%</strong></span>
                  <span>Unidades Vendidas: <strong className="text-slate-900 font-bold">{summary.breakdown.library.itemsCount}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 4 Métricas Globales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Inversión en Inventario */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Inversión en Stock
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                {formatCurrency(summary.inventory.totalCost)}
              </p>
              <p className="text-[11px] text-blue-700 font-semibold mt-1">
                {summary.inventory.totalUnits} unid. activas
              </p>
            </div>

            {/* Total Vendido */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Total Vendido
              </span>
              <p className="text-lg sm:text-xl font-black text-blue-700 mt-1">
                {formatCurrency(summary.sales.totalRevenue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.sales.totalSalesCount} facturas
              </p>
            </div>

            {/* Costo Mercadería */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Costo Mercadería
              </span>
              <p className="text-lg sm:text-xl font-black text-amber-700 mt-1">
                {formatCurrency(summary.sales.totalCostOfGoodsSold)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Bruta: {formatCurrency(summary.profitability.grossProfit)}
              </p>
            </div>

            {/* Gastos Totales */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Gastos del Mes
              </span>
              <p className="text-lg sm:text-xl font-black text-rose-600 mt-1">
                {formatCurrency(summary.expenses.totalExpenses)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.expenses.expensesCount} egresos
              </p>
            </div>
          </div>

          {/* Desglose de Estado de Resultados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-700" />
                Detalle Financiero ({getMonthName(selectedMonth)} {selectedYear})
              </h4>

              <div className="space-y-2 pt-1 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">(+) Ingresos por Ventas</span>
                  <span className="font-black text-blue-700">
                    {formatCurrency(summary.sales.totalRevenue)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">(-) Costo de Productos Vendidos</span>
                  <span className="font-black text-amber-700">
                    - {formatCurrency(summary.sales.totalCostOfGoodsSold)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl font-bold">
                  <span className="text-blue-950">(=) Ganancia Bruta</span>
                  <span className="font-black text-blue-900">
                    {formatCurrency(summary.profitability.grossProfit)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">(-) Gastos Operativos</span>
                  <span className="font-black text-rose-600">
                    - {formatCurrency(summary.expenses.totalExpenses)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-900 text-white rounded-2xl font-bold">
                  <span>(=) Ganancia Neta Real</span>
                  <span className="font-black text-lg">
                    {formatCurrency(summary.profitability.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gastos por categoría */}
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-600" />
                Distribución de Gastos
              </h4>

              {Object.keys(summary.expenses.byCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 text-slate-400 text-center">
                  <Receipt className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs font-semibold">No hay gastos en este mes</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {Object.entries(summary.expenses.byCategory).map(([category, amount]) => {
                    const percentage = summary.expenses.totalExpenses > 0
                      ? ((amount / summary.expenses.totalExpenses) * 100).toFixed(1)
                      : 0;

                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{category}</span>
                          <span className="font-mono text-slate-600">
                            {formatCurrency(amount)} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
