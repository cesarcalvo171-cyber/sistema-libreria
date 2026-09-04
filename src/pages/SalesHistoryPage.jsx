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
  Receipt
} from 'lucide-react';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { toast } from 'sonner';

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedSale, setSelectedSale] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const invoiceStr = (sale.invoice_number || '').toString();
      const notesStr = (sale.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesQuery = invoiceStr.includes(q) || notesStr.includes(q);
      const matchesStatus = statusFilter === 'all' ? true : sale.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [sales, searchQuery, statusFilter]);

  const totalCompletedSales = useMemo(() => {
    return sales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + Number(s.total), 0);
  }, [sales]);

  const completedCount = useMemo(() => {
    return sales.filter((s) => s.status === 'completed').length;
  }, [sales]);

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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-blue-700" />
          Historial de Ventas & Facturas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Registro de comprobantes emitidos, detalles y anulación con devolución de stock
        </p>
      </div>

      {/* Resumen Métrico */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-blue-900 text-white rounded-2xl shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-blue-200 block">
            Total Facturado Activo
          </span>
          <p className="text-xl sm:text-2xl font-black mt-1">
            {formatCurrency(totalCompletedSales)}
          </p>
          <p className="text-[11px] text-blue-200 mt-0.5">{completedCount} facturas válidas</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">
            Total Facturas
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {sales.length} <span className="text-xs font-medium text-slate-500">docs.</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {sales.filter((s) => s.status === 'cancelled').length} anuladas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por N° factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['all', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                statusFilter === st
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {st === 'all' ? 'Todas' : st === 'completed' ? 'Válidas' : 'Anuladas'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Facturas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Cargando facturas...</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No hay facturas que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => {
            const isCancelled = sale.status === 'cancelled';

            return (
              <div
                key={sale.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-900 text-base">
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
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                  <button
                    onClick={() => {
                      setSelectedSale(sale);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-700" />
                    Detalle
                  </button>

                  {!isCancelled && (
                    <button
                      onClick={() => {
                        setSaleToCancel(sale);
                        setCancelReason('');
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Anular
                    </button>
                  )}
                </div>
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

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm transition"
              >
                Cerrar
              </button>
            </div>
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
