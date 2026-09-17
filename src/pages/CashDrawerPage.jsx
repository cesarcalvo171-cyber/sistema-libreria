import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Layers
} from 'lucide-react';
import { cashService } from '../services/cashService';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDate, formatDateTime, getMonthName, getLocalDateString } from '../lib/formatters';
import { toast } from 'sonner';

export const CashDrawerPage = () => {
  const todayStr = getLocalDateString();
  const currentDate = new Date();

  const [filterMode, setFilterMode] = useState('today'); // 'today', 'month'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para registrar retiro / gasto operativo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    expense_date: todayStr,
    category: 'Gasto Operativo'
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Cargar retiros según filtro
      const options = filterMode === 'today'
        ? { date: selectedDate }
        : { month: selectedMonth, year: selectedYear };

      const allRecords = await cashService.getAll(options);
      setWithdrawals(allRecords);

      // 2. Cargar ventas del día seleccionado o del mes
      const sales = await salesService.getAll();

      const targetSales = (sales || []).filter(s => {
        if (s.status !== 'completed') return false;
        const sDate = getLocalDateString(s.created_at);
        if (filterMode === 'today') {
          return sDate === selectedDate;
        }
        if (filterMode === 'month') {
          const sObj = new Date(s.created_at);
          return sObj.getMonth() === selectedMonth && sObj.getFullYear() === selectedYear;
        }
        return true;
      });

      const totalSold = targetSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      setTodaySalesTotal(totalSold);

    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos de caja: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterMode, selectedDate, selectedMonth, selectedYear]);

  // Cálculos de caja
  const metrics = useMemo(() => {
    // Total de salidas tomadas
    const totalOut = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // Salidas que aún están PENDIENTES de saldar/reponer
    const pendingOut = withdrawals
      .filter(w => !w.is_settled)
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // Salidas que ya fueron SALDADAS / REPUESTAS
    const settledOut = withdrawals
      .filter(w => w.is_settled)
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    // Efectivo Neto en Caja = Ventas Totales - Salidas Pendientes
    const cashInDrawer = Math.max(0, todaySalesTotal - pendingOut);

    return {
      totalSold: todaySalesTotal,
      totalOut,
      pendingOut,
      settledOut,
      cashInDrawer
    };
  }, [withdrawals, todaySalesTotal]);

  // Filtrado por buscador
  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase();
    return withdrawals.filter(w =>
      (w.clean_description || w.description || '').toLowerCase().includes(q) ||
      (w.category || '').toLowerCase().includes(q)
    );
  }, [withdrawals, searchQuery]);

  // Manejador para crear retiro
  const handleSaveWithdrawal = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.warning('Ingresa el motivo o descripción del gasto/retiro');
      return;
    }
    const numAmount = parseFloat(form.amount) || 0;
    if (numAmount <= 0) {
      toast.warning('Ingresa un monto válido mayor a 0');
      return;
    }

    try {
      setSaving(true);
      await cashService.createWithdrawal(form);
      toast.success(`Retiro de ${formatCurrency(numAmount)} registrado en caja`);
      setIsModalOpen(false);
      setForm({
        description: '',
        amount: '',
        expense_date: todayStr,
        category: 'Gasto Operativo'
      });
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // Cambiar estado de saldado / repuesto
  const handleToggleSettled = async (item) => {
    try {
      const newStatus = !item.is_settled;
      await cashService.toggleSettled(item.id, item.description, newStatus);
      if (newStatus) {
        toast.success(`Gasto "${item.clean_description}" marcado como SALDADO/REPUESTO (+${formatCurrency(item.amount)} a caja)`);
      } else {
        toast.info(`Gasto "${item.clean_description}" marcado como Pendiente`);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar estado');
    }
  };

  // Eliminar retiro
  const handleDelete = async (item) => {
    if (window.confirm(`¿Eliminar el registro "${item.clean_description}" de ${formatCurrency(item.amount)}?`)) {
      try {
        await cashService.delete(item.id);
        toast.success('Registro eliminado');
        await loadData();
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar');
      }
    }
  };

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera & Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Control de Caja & Gastos Operativos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registra dinero tomado de las ventas para compras o gastos y salda las cuentas cuando se repongan
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Selector de Modo: Hoy vs Mes */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                filterMode === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                filterMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Mes
            </button>
          </div>

          {filterMode === 'today' ? (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 p-1.5 rounded-2xl shadow-xs">
              <Calendar className="w-4 h-4 text-emerald-600 ml-1.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white border border-slate-300 p-1.5 rounded-2xl shadow-xs">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 focus:outline-none cursor-pointer"
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
                className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 border-l border-slate-200 focus:outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-rose-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tomar Dinero / Gasto</span>
            <span className="sm:hidden">- Retiro</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Arqueo de Caja */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-xl space-y-4 border border-emerald-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-300" />
                Efectivo Real en Caja ({filterMode === 'today' ? selectedDate : `${getMonthName(selectedMonth)} ${selectedYear}`})
              </span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              {formatCurrency(metrics.cashInDrawer)}
            </h3>
            <p className="text-xs text-emerald-200 mt-2">
              Dinero disponible en físico después de deducir retiros y gastos no saldados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 self-start sm:self-auto min-w-[260px]">
            <div className="p-3 bg-black/25 backdrop-blur-sm rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Vendido</span>
              <p className="text-lg font-black text-white mt-0.5">
                {formatCurrency(metrics.totalSold)}
              </p>
            </div>
            <div className="p-3 bg-black/25 backdrop-blur-sm rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Pendiente Reponer</span>
              <p className="text-lg font-black text-rose-300 mt-0.5">
                - {formatCurrency(metrics.pendingOut)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-black/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100 border border-emerald-700/50">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Ya Saldados / Devueltos a Caja: <strong className="text-white font-bold">{formatCurrency(metrics.settledOut)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pendientes por saldar: <strong className="text-amber-300 font-bold">{withdrawals.filter(w => !w.is_settled).length}</strong></span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-emerald-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={loadData}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl transition shadow-xs"
          title="Recargar datos"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Listado de Retiros / Movimientos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Cargando movimientos de caja...</p>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 shadow-xs space-y-2">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">No hay retiros ni salidas de caja registradas en este periodo.</p>
          <p className="text-xs text-slate-400">Cuando tomes dinero de la venta para compras o gastos, regístralo aquí.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredWithdrawals.map((item) => {
            const isSettled = item.is_settled;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                  isSettled
                    ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                    : 'bg-white border-amber-200/90 text-slate-900 shadow-amber-500/5 ring-1 ring-amber-300/40'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-black text-sm sm:text-base ${isSettled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {item.clean_description || item.description}
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isSettled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {isSettled ? '✓ SALDADO / REPUESTO' : '⏳ PENDIENTE DE REPONER'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fecha: {formatDate(item.expense_date)} {item.created_at ? `• ${formatDateTime(item.created_at)}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className={`text-base sm:text-lg font-black font-mono ${
                      isSettled ? 'text-slate-500' : 'text-rose-600'
                    }`}>
                      - {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {isSettled ? 'Ya volvió a sumar a caja' : 'Resta del total en caja'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botón de Saldar / Desmarcar */}
                    <button
                      type="button"
                      onClick={() => handleToggleSettled(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                        isSettled
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSettled ? 'Marcar Pendiente' : 'Saldar / Reponer'}</span>
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Salida de Dinero / Gasto Operativo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-700 to-rose-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-200" />
                Registrar Salida de Dinero / Gasto
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-rose-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWithdrawal} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 bg-rose-50 p-3 rounded-2xl border border-rose-100 leading-relaxed">
                Usa este formulario cuando <strong>tomes dinero del total de las ventas</strong> (ej: para comprar mercadería, pagar un servicio o adelanto). Restará de tu caja hasta que lo marques como <strong>Saldado</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Concepto del Retiro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. C$300 para comprar cuadernos, Pago de flete, etc."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto a Tomar (C$) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="300.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-rose-600 focus:outline-none focus:border-rose-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo / Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-600 focus:bg-white"
                >
                  <option value="Gasto Operativo">Compra de Mercadería / Producto</option>
                  <option value="Retiro / Caja Chica">Retiro Personal / Caja Chica</option>
                  <option value="Insumos & Operación">Insumos & Operación</option>
                  <option value="Transporte & Envíos">Transporte & Envíos</option>
                  <option value="Otros / Varios">Otros / Varios</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>{saving ? 'Registrando...' : 'Registrar Salida de Caja'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

