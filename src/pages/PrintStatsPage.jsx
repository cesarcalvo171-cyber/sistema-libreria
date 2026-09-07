import React, { useState, useEffect } from 'react';
import {
  Printer,
  Calendar,
  FileText,
  Droplets,
  Copy,
  Layers,
  DollarSign,
  TrendingUp,
  Settings2,
  X,
  Save,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { printService } from '../services/printService';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { toast } from 'sonner';

export const PrintStatsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Modal de Tarifas
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [rates, setRates] = useState([]);
  const [editingRates, setEditingRates] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await printService.getDailySummary(selectedDate);
      setStats(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar reporte de impresiones');
    } finally {
      setLoading(false);
    }
  };

  const loadRates = async () => {
    try {
      const data = await printService.getRates();
      setRates(data);
      setEditingRates(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    loadRates();
  }, []);

  const handleSaveRates = async (e) => {
    e.preventDefault();
    try {
      for (const rate of editingRates) {
        await printService.updateRate(rate.id, rate);
      }
      toast.success('Tarifas de impresión actualizadas con éxito');
      setIsRatesModalOpen(false);
      await loadRates();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar tarifas');
    }
  };

  const handleRateChange = (index, field, value) => {
    const updated = [...editingRates];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRates(updated);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera & Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-700" />
            Reporte de Impresiones & Insumos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Control de páginas B/N, Color, Copias, Hojas gastadas, Tinta e Ingresos
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 p-1.5 rounded-2xl shadow-xs">
            <Calendar className="w-4 h-4 text-blue-700 ml-1.5" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Botón Tarifas */}
          <button
            onClick={() => {
              setEditingRates(rates);
              setIsRatesModalOpen(true);
            }}
            className="flex items-center gap-1 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-2xl text-xs transition active:scale-95 shadow-xs border border-blue-200"
          >
            <Settings2 className="w-4 h-4 text-blue-700" />
            <span className="hidden sm:inline">Tarifas</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Calculando consumo de insumos...</p>
        </div>
      ) : stats ? (
        <>
          {/* 1. Tarjeta Principal: Ingresos Diarios por Impresión */}
          <div className="p-6 rounded-3xl bg-blue-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-blue-800/90 text-blue-200 px-3 py-1 rounded-full">
                💰 Ingresos Diarios por Impresiones ({selectedDate})
              </span>
              <h3 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
                {formatCurrency(stats.metrics.dailyRevenue)}
              </h3>
              <p className="text-xs text-blue-200 mt-2">
                Ganancia estimada del día: <strong className="text-white font-bold">{formatCurrency(stats.metrics.dailyProfit)}</strong>
              </p>
            </div>

            <div className="bg-blue-950/70 border border-blue-800/80 p-4 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
              <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-xl">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-blue-200 uppercase font-bold block">
                  Total Trabajos
                </span>
                <p className="text-xl font-black text-white">
                  {stats.logs.length} registros
                </p>
              </div>
            </div>
          </div>

          {/* 2. Grid con las 6 Métricas de Insumos y Conteo */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Métrica 1: Impresiones B/N */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase block">1. Total B/N</span>
                <FileText className="w-4 h-4 text-slate-700" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {stats.metrics.totalBnPrints}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">páginas B/N</p>
            </div>

            {/* Métrica 2: Impresiones Color */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-cyan-600">
                <span className="text-[10px] font-bold uppercase block">2. Total Color</span>
                <Droplets className="w-4 h-4" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-cyan-600 mt-1">
                {stats.metrics.totalColorPrints}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">páginas a color</p>
            </div>

            {/* Métrica 3: Copias */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-[10px] font-bold uppercase block">3. Copias</span>
                <Copy className="w-4 h-4" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-blue-900 mt-1">
                {stats.metrics.totalCopies}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">fotocopias</p>
            </div>

            {/* Métrica 4: Hojas Carta */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase block">4. Hojas Carta</span>
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                {stats.metrics.cartaSheetsUsed}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">hojas físicas</p>
            </div>

            {/* Métrica 5: Hojas Legal */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase block">5. Hojas Legal</span>
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                {stats.metrics.legalSheetsUsed}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">hojas oficio</p>
            </div>

            {/* Métrica 6: Tinta Consumida */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase block">6. Tinta Est.</span>
                <Droplets className="w-4 h-4" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                {stats.metrics.inkConsumedMl} <span className="text-xs font-normal">ml</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">consumo estimado</p>
            </div>
          </div>

          {/* 3. Tabla / Listado de Trabajos del Día */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-700" />
                Detalle de Trabajos Realizados ({selectedDate})
              </h4>
              <span className="text-xs font-bold text-slate-500">
                {stats.logs.length} registros
              </span>
            </div>

            {stats.logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No se registraron impresiones ni copias en esta fecha.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {log.service_type === 'print_bn'
                            ? 'Impresión B/N'
                            : log.service_type === 'print_color'
                            ? 'Impresión Color'
                            : log.service_type === 'copy_bn'
                            ? 'Copia B/N'
                            : 'Copia Color'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 uppercase">
                          {log.paper_type} {log.is_duplex ? '• Doble Faz' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.pages_count} págs • {log.sheets_used} hojas • ~{log.ink_used_estimate} ml tinta • {formatDateTime(log.created_at)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-black text-sm text-blue-900">
                        {formatCurrency(log.subtotal)}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        ({formatCurrency(log.unit_price)} c/u)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Modal: Configuración de Tarifas de Impresión */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-base">Tarifas y Costos de Impresión</h3>
              </div>
              <button
                onClick={() => setIsRatesModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-slate-500 leading-relaxed bg-blue-50 p-3 rounded-xl border border-blue-100">
                Ajusta los <strong>precios de venta al público</strong> y los <strong>costos de insumos (papel + tinta)</strong> para cada servicio.
              </p>

              <div className="space-y-3">
                {editingRates.map((rate, idx) => (
                  <div
                    key={rate.id || idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <h5 className="font-bold text-sm text-slate-900">{rate.name}</h5>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        {rate.paper_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">
                          Costo (C$)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={rate.cost_price}
                          onChange={(e) => handleRateChange(idx, 'cost_price', e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-blue-700 block">
                          Venta (C$)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={rate.sale_price}
                          onChange={(e) => handleRateChange(idx, 'sale_price', e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-black text-blue-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRatesModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Tarifas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
