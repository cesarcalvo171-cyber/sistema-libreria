import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  AlertTriangle,
  Receipt,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Printer,
  BookOpen
} from 'lucide-react';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDateTime, formatDate } from '../lib/formatters';
import { toast } from 'sonner';

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtro de fechas: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Agrupación colapsable
  const [collapsedDates, setCollapsedDates] = useState({});

  const [selectedSale, setSelectedSale] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [saleToEdit, setSaleToEdit] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await salesService.getAll();
      setSales(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ventas: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (sale) => {
    setSaleToEdit(sale);
    setEditingItems(
      (sale.sale_items || []).map((i) => ({
        id: i.id,
        name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        item_type: i.item_type
      }))
    );
    setEditingNotes(sale.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!saleToEdit) return;

    try {
      setSavingEdit(true);
      await salesService.updateSale(saleToEdit.id, {
        items: editingItems,
        notes: editingNotes
      });
      toast.success(`Factura #${saleToEdit.invoice_number} actualizada con éxito`);
      setSaleToEdit(null);
      await loadSales();
      if (selectedSale?.id === saleToEdit.id) {
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cambios: ' + (err.message || ''));
    } finally {
      setSavingEdit(false);
    }
  };

  const updateEditItemQty = (idx, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const updated = [...editingItems];
    updated[idx] = { ...updated[idx], quantity: qty };
    setEditingItems(updated);
  };

  const updateEditItemPrice = (idx, newPrice) => {
    const price = Math.max(0, parseFloat(newPrice) || 0);
    const updated = [...editingItems];
    updated[idx] = { ...updated[idx], unit_price: price };
    setEditingItems(updated);
  };

  const editedSubtotal = useMemo(() => {
    return editingItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
  }, [editingItems]);

  useEffect(() => {
    loadSales();
  }, []);

  // Helper de fechas en hora local
  const getLocalDateString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Métricas para el Dashboard Global
  const metrics = useMemo(() => {
    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    let grandTotal = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    // Desglose Histórico y Mensual por Línea
    let totalPrintRev = 0;
    let totalPrintCost = 0;
    let totalLibRev = 0;
    let totalLibCost = 0;

    let monthPrintRev = 0;
    let monthPrintCost = 0;
    let monthLibRev = 0;
    let monthLibCost = 0;

    let todayPrintRev = 0;
    let todayLibRev = 0;

    const currentYearMonth = todayStr.substring(0, 7);

    sales.forEach((s) => {
      const isCompleted = s.status === 'completed';
      const saleDateStr = getLocalDateString(s.created_at);

      if (isCompleted) {
        const saleTotal = Number(s.total || 0);
        grandTotal += saleTotal;
        completedCount++;

        const isToday = saleDateStr === todayStr;
        const isThisMonth = saleDateStr.startsWith(currentYearMonth);

        if (isToday) {
          todayTotal += saleTotal;
          todayCount++;
        }

        if (isThisMonth) {
          monthTotal += saleTotal;
          monthCount++;
        }

        // Analizar ítems individuales
        (s.sale_items || []).forEach((item) => {
          const qty = Number(item.quantity) || 1;
          const cost = (Number(item.cost_price) || 0) * qty;
          const subtotal = Number(item.subtotal) || (qty * Number(item.unit_price || 0));

          const name = (item.product_name || '').toLowerCase();
          const isPrint =
            item.item_type === 'print_service' ||
            (!item.product_id && item.metadata?.service_type) ||
            name.includes('impresion') ||
            name.includes('impresión') ||
            name.includes('copia') ||
            name.includes('cedula') ||
            name.includes('cédula') ||
            name.includes('escaner') ||
            name.includes('escaneo') ||
            name.includes('plastificado') ||
            name.includes('laminado');

          if (isPrint) {
            totalPrintRev += subtotal;
            totalPrintCost += cost;
            if (isThisMonth) {
              monthPrintRev += subtotal;
              monthPrintCost += cost;
            }
            if (isToday) {
              todayPrintRev += subtotal;
            }
          } else {
            totalLibRev += subtotal;
            totalLibCost += cost;
            if (isThisMonth) {
              monthLibRev += subtotal;
              monthLibCost += cost;
            }
            if (isToday) {
              todayLibRev += subtotal;
            }
          }
        });
      } else {
        cancelledCount++;
      }
    });

    return {
      todayTotal,
      todayCount,
      todayPrintRev,
      todayLibRev,
      monthTotal,
      monthCount,
      monthPrintRev,
      monthPrintGrossProfit: monthPrintRev - monthPrintCost,
      monthLibRev,
      monthLibGrossProfit: monthLibRev - monthLibCost,
      grandTotal,
      totalPrintRev,
      totalPrintGrossProfit: totalPrintRev - totalPrintCost,
      totalLibRev,
      totalLibGrossProfit: totalLibRev - totalLibCost,
      completedCount,
      cancelledCount
    };
  }, [sales, todayStr]);

  // Filtrado de ventas por búsqueda, estado y rango de fechas
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const invoiceStr = (sale.invoice_number || '').toString();
      const notesStr = (sale.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesQuery = invoiceStr.includes(q) || notesStr.includes(q);
      const matchesStatus = statusFilter === 'all' ? true : sale.status === statusFilter;

      const saleDateStr = getLocalDateString(sale.created_at);

      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = saleDateStr === todayStr;
      } else if (dateFilter === 'yesterday') {
        matchesDate = saleDateStr === yesterdayStr;
      } else if (dateFilter === 'week') {
        const d = new Date();
        const firstDayOfWeek = new Date(d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)));
        const startWeekStr = `${firstDayOfWeek.getFullYear()}-${String(firstDayOfWeek.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfWeek.getDate()).padStart(2, '0')}`;
        matchesDate = saleDateStr >= startWeekStr && saleDateStr <= todayStr;
      } else if (dateFilter === 'month') {
        matchesDate = saleDateStr.startsWith(todayStr.substring(0, 7));
      } else if (dateFilter === 'custom') {
        if (startDate && saleDateStr < startDate) matchesDate = false;
        if (endDate && saleDateStr > endDate) matchesDate = false;
      }

      return matchesQuery && matchesStatus && matchesDate;
    });
  }, [sales, searchQuery, statusFilter, dateFilter, startDate, endDate, todayStr, yesterdayStr]);

  // Agrupar ventas filtradas por fecha con subtotales diarios
  const groupedSalesByDate = useMemo(() => {
    const groups = {};

    filteredSales.forEach((sale) => {
      const dateKey = getLocalDateString(sale.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          sales: [],
          totalAmount: 0,
          completedCount: 0,
          cancelledCount: 0
        };
      }
      groups[dateKey].sales.push(sale);
      if (sale.status === 'completed') {
        groups[dateKey].totalAmount += Number(sale.total || 0);
        groups[dateKey].completedCount++;
      } else {
        groups[dateKey].cancelledCount++;
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales]);

  // Total de lo filtrado actualmente en pantalla
  const currentFilteredTotal = useMemo(() => {
    return filteredSales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [filteredSales]);

  const toggleCollapseDate = (dateKey) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!saleToCancel) return;

    try {
      setCancelling(true);
      await salesService.cancelSale(saleToCancel.id, cancelReason || 'Anulada por usuario');
      toast.success(`Factura #${saleToCancel.invoice_number} anulada. Stock reintegrado.`);
      setSaleToCancel(null);
      setCancelReason('');
      await loadSales();
      if (selectedSale?.id === saleToCancel.id) {
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al anular: ' + (err.message || ''));
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTitle = (dateStr) => {
    if (dateStr === todayStr) return 'Hoy (' + formatDate(dateStr) + ')';
    if (dateStr === yesterdayStr) return 'Ayer (' + formatDate(dateStr) + ')';
    return formatDate(dateStr);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-700" />
            Historial de Ventas & Facturas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registro cronológico agrupado por fechas, totales del día y dashboard de ventas
          </p>
        </div>
      </div>

      {/* 1. DASHBOARD DE TOTALES DE VENTAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Hoy */}
        <div className="p-4 bg-gradient-to-br from-blue-900 to-blue-800 text-white rounded-2xl shadow-sm border border-blue-700/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                ⭐ Ventas de Hoy
              </span>
              <Calendar className="w-4 h-4 text-blue-300" />
            </div>
            <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {formatCurrency(metrics.todayTotal)}
            </p>
          </div>
          <p className="text-[11px] text-blue-200 mt-2 font-medium">
            {metrics.todayCount} factura(s) hoy
          </p>
        </div>

        {/* Total Este Mes */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                📅 Este Mes
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {formatCurrency(metrics.monthTotal)}
            </p>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold mt-2">
            {metrics.monthCount} facturas este mes
          </p>
        </div>

        {/* Total Histórico Acumulado */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                💰 Total Histórico
              </span>
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-2 tracking-tight">
              {formatCurrency(metrics.grandTotal)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics.completedCount} facturas válidas
          </p>
        </div>

        {/* Facturas Anuladas */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                🚫 Facturas Anuladas
              </span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2 tracking-tight">
              {metrics.cancelledCount}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {sales.length} comprobantes totales
          </p>
        </div>
      </div>

      {/* DESGLOSE SEPARADO: IMPRESIONES VS LIBRERÍA (VENTAS Y GANANCIAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Tarjeta Impresiones */}
        <div className="p-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border border-indigo-700/50 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 text-cyan-300 rounded-xl border border-indigo-400/30">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm sm:text-base leading-tight">🖨️ Servicios de Impresión</h4>
                <p className="text-[10px] text-indigo-200">B/N, Color, Copias y Opalina</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 border border-indigo-400/40 text-cyan-200 px-2 py-0.5 rounded-lg">
              Histórico & Mes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-800/80">
            <div className="bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-800/50">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Ventas (Total)</span>
              <p className="text-base sm:text-lg font-black text-white mt-0.5">
                {formatCurrency(metrics.totalPrintRev)}
              </p>
              <p className="text-[10px] text-indigo-300 mt-0.5 font-medium">
                Mes: {formatCurrency(metrics.monthPrintRev)}
              </p>
            </div>
            <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Ganancia Bruta</span>
              <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                {formatCurrency(metrics.totalPrintGrossProfit)}
              </p>
              <p className="text-[10px] text-emerald-300/80 mt-0.5 font-medium">
                Mes: {formatCurrency(metrics.monthPrintGrossProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta Librería */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm sm:text-base text-slate-900 leading-tight">📚 Artículos de Librería</h4>
                <p className="text-[10px] text-slate-500">Útiles, papelería y productos físicos</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">
              Histórico & Mes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Ventas (Total)</span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {formatCurrency(metrics.totalLibRev)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                Mes: {formatCurrency(metrics.monthLibRev)}
              </p>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Ganancia Bruta</span>
              <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                {formatCurrency(metrics.totalLibGrossProfit)}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                Mes: {formatCurrency(metrics.monthLibGrossProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTROS AVANZADOS (Por Fecha, Estado y Búsqueda) */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        {/* Selector de Rango de Fechas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <span className="text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Período:
          </span>
          {[
            { id: 'all', label: 'Todo el Historial' },
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'custom', label: 'Personalizado' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition active:scale-95 ${
                dateFilter === tab.id
                  ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inputs para Rango de Fechas Personalizado */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Búsqueda y Estado */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° factura o nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Filtro de Estado */}
            <div className="flex items-center gap-1">
              {['all', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    statusFilter === st
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st === 'all' ? 'Todas' : st === 'completed' ? 'Válidas' : 'Anuladas'}
                </button>
              ))}
            </div>

            {/* Total Filtrado Actual */}
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 text-xs">
              <span className="text-slate-600 font-medium">Subtotal Período:</span>
              <strong className="text-blue-900 font-black">{formatCurrency(currentFilteredTotal)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LISTA DE VENTAS AGRUPADAS POR FECHA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Cargando historial de ventas...</p>
        </div>
      ) : groupedSalesByDate.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-base text-slate-700">No hay ventas registradas</p>
          <p className="text-xs text-slate-400">No se encontraron facturas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSalesByDate.map((group) => {
            const isCollapsed = collapsedDates[group.date];

            return (
              <div
                key={group.date}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs transition-all"
              >
                {/* Cabecera del Día (Totalizador Diario) */}
                <div
                  onClick={() => toggleCollapseDate(group.date)}
                  className="p-4 bg-slate-50/90 hover:bg-slate-100/90 cursor-pointer border-b border-slate-200 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="p-1 text-slate-500 hover:text-slate-800 rounded-lg">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-700" />
                        {formatDateTitle(group.date)}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {group.completedCount} venta(s) válidas
                        {group.cancelledCount > 0 && ` • ${group.cancelledCount} anulada(s)`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total del Día
                    </span>
                    <span className="text-base sm:text-lg font-black text-blue-900 font-mono">
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Listado de Facturas de ese Día */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4 space-y-2.5 divide-y sm:divide-y-0 divide-slate-100">
                    {group.sales.map((sale) => {
                      const isCancelled = sale.status === 'cancelled';

                      return (
                        <div
                          key={sale.id}
                          className="p-3.5 sm:p-4 bg-slate-50/50 hover:bg-blue-50/30 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-blue-900 text-sm sm:text-base">
                                #{sale.invoice_number}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  isCancelled
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isCancelled ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                {isCancelled ? 'Anulada' : 'Completada'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1">{formatDateTime(sale.created_at)}</p>

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                              <span className="text-slate-500">
                                Total: <strong className="text-slate-900 font-black text-sm">{formatCurrency(sale.total)}</strong>
                              </span>
                              <span className="text-slate-500">
                                Pagó: <strong className="text-slate-700">{formatCurrency(sale.amount_paid)}</strong>
                              </span>
                              <span className="text-emerald-700 font-bold">
                                Vuelto: {formatCurrency(sale.change_given)}
                              </span>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setIsDetailModalOpen(true);
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition active:scale-95 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-700" />
                              Detalle
                            </button>

                            {!isCancelled && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(sale)}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition active:scale-95 shadow-2xs"
                                >
                                  ✏️ Editar
                                </button>

                                <button
                                  onClick={() => {
                                    setSaleToCancel(sale);
                                    setCancelReason('');
                                  }}
                                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Anular
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Detalle de Factura */}
      {isDetailModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-200" />
                  Factura #{selectedSale.invoice_number}
                </h3>
                <p className="text-xs text-blue-200">{formatDateTime(selectedSale.created_at)}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/60 max-h-56 overflow-y-auto">
                {selectedSale.sale_items && selectedSale.sale_items.length > 0 ? (
                  selectedSale.sale_items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name}</p>
                        <p className="text-slate-500">
                          {item.quantity} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="font-black text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-slate-400 text-center">Sin detalles</div>
                )}
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Total Cobrado:</span>
                  <span className="font-black text-sm text-blue-900 font-mono">
                    {formatCurrency(selectedSale.total)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Monto Recibido:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Vuelto Entregado:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.change_given)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                  <strong>Notas:</strong> {selectedSale.notes}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
              {selectedSale.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedSale);
                  }}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition"
                >
                  ✏️ Editar Factura
                </button>
              )}
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm transition ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Factura */}
      {saleToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  ✏️ Modificar Factura #{saleToEdit.invoice_number}
                </h3>
                <p className="text-xs text-blue-200">Ajusta cantidades o precios de los ítems</p>
              </div>
              <button
                onClick={() => setSaleToEdit(null)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {editingItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-sm text-slate-900 truncate flex-1">{item.name}</h5>
                      <span className="text-xs font-mono font-black text-blue-900 ml-2">
                        {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Cantidad / Páginas
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateEditItemQty(idx, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Precio Unitario (C$)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateEditItemPrice(idx, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de la Factura (Opcional)
                </label>
                <input
                  type="text"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Observaciones..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* Total recalculado */}
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950">Nuevo Total Factura:</span>
                <span className="text-lg font-black text-blue-900 font-mono">
                  {formatCurrency(editedSubtotal)}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSaleToEdit(null)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 transition flex items-center gap-2"
                >
                  {savingEdit ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Anulación */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base">Anular Factura #{saleToCancel.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSaleToCancel(null)}
                className="p-1 text-rose-100 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Al anular esta factura por <strong>{formatCurrency(saleToCancel.total)}</strong>:
              </p>
              <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 bg-rose-50 p-3 rounded-xl border border-rose-100">
                <li>Se repondrá automáticamente el stock de los productos vendidos.</li>
                <li>Se descontará del total de ventas y finanzas del mes.</li>
              </ul>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de anulación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Devolución de producto, error al digitar..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSaleToCancel(null)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  {cancelling ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Anular Factura
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
