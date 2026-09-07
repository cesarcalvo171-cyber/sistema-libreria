import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Plus,
  Minus,
  FileText,
  Copy,
  Droplets,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { printService } from '../services/printService';
import { formatCurrency } from '../lib/formatters';
import { toast } from 'sonner';

export const PrintCalculatorModal = ({ isOpen, onClose, onAddPrintToCart }) => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Opciones seleccionadas
  const [serviceType, setServiceType] = useState('print_bn'); // 'copy_cedula', 'print_bn', 'print_color', 'copy_bn', 'copy_color'
  const [paperType, setPaperType] = useState('carta'); // 'carta', 'legal'
  const [isDuplex, setIsDuplex] = useState(false); // Doble faz
  const [pagesCount, setPagesCount] = useState(1);
  const [customUnitPrice, setCustomUnitPrice] = useState('');

  // Cargar tarifas
  useEffect(() => {
    if (isOpen) {
      loadRates();
      setPagesCount(1);
      setCustomUnitPrice('');
    }
  }, [isOpen]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await printService.getRates();
      setRates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Encontrar tarifa correspondiente
  const currentRate = rates.find(
    (r) => r.service_type === serviceType && (serviceType === 'copy_cedula' ? true : r.paper_type === paperType)
  ) || {
    sale_price: serviceType === 'copy_cedula' ? 4.0 : serviceType.includes('color') ? (paperType === 'legal' ? 10.0 : 8.0) : (paperType === 'legal' ? 5.0 : 4.0),
    cost_price: 0.80,
    estimated_ink_ml: 0.05
  };

  const effectiveUnitPrice = customUnitPrice !== ''
    ? parseFloat(customUnitPrice) || 0
    : currentRate.sale_price;

  const sheetsUsed = isDuplex ? Math.ceil(pagesCount / 2) : pagesCount;

  const estimatedInkUsed = Number(
    (pagesCount * (currentRate.estimated_ink_ml || 0.05)).toFixed(2)
  );

  const subtotal = pagesCount * effectiveUnitPrice;

  const handleAdd = () => {
    if (pagesCount <= 0) {
      toast.warning('Ingresa al menos 1');
      return;
    }

    const serviceName =
      serviceType === 'copy_cedula'
        ? 'Copia de Cédula (Ambos Lados)'
        : serviceType === 'print_bn'
        ? 'Impresión B/N'
        : serviceType === 'print_color'
        ? 'Impresión Color'
        : serviceType === 'copy_bn'
        ? 'Copia B/N'
        : 'Copia Color';

    const paperLabel = serviceType === 'copy_cedula' ? 'Carta' : (paperType === 'carta' ? 'Carta' : 'Legal');
    const duplexLabel = (serviceType !== 'copy_cedula' && isDuplex) ? ' (Doble Faz)' : '';

    const printItem = {
      id: `print-${Date.now()}`,
      name: `${serviceName} ${paperLabel}${duplexLabel} [${pagesCount} ${serviceType === 'copy_cedula' ? 'cédula(s)' : 'págs'}]`,
      item_type: 'print_service',
      is_service: true,
      service_type: serviceType,
      paper_type: serviceType === 'copy_cedula' ? 'carta' : paperType,
      is_duplex: isDuplex,
      pages_count: pagesCount,
      sheets_used: sheetsUsed,
      ink_used_estimate: estimatedInkUsed,
      cost_price: currentRate.cost_price,
      sale_price: effectiveUnitPrice,
      quantity: 1,
      total_price: subtotal
    };

    onAddPrintToCart(printItem);
    toast.success(`Agregado: ${printItem.name} (${formatCurrency(subtotal)})`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-blue-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-800 text-white rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Cobrar Impresión / Copia</h3>
              <p className="text-[10px] text-blue-200">Calculadora Rápida para Móvil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 max-w-full">
          {/* 1. Tipo de Servicio */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              1. Tipo de Servicio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Botón Destacado: Copia de Cédula */}
              <button
                type="button"
                onClick={() => {
                  setServiceType('copy_cedula');
                  setPaperType('carta');
                  setIsDuplex(false);
                }}
                className={`col-span-2 p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center justify-between ${
                  serviceType === 'copy_cedula'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-blue-50/80 border-blue-200 text-blue-950 hover:bg-blue-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-black text-xs">🪪 Copia de Cédula (Ambos Lados)</span>
                </div>
                <span className="font-black text-xs font-mono">C$ 4.00</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('print_bn')}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center gap-2 ${
                  serviceType === 'print_bn'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs">🖤 Impresión B/N</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('print_color')}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center gap-2 ${
                  serviceType === 'print_color'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold text-xs">🌈 Impresión Color</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('copy_bn')}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center gap-2 ${
                  serviceType === 'copy_bn'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs">📄 Copia B/N</span>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('copy_color')}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-98 flex items-center gap-2 ${
                  serviceType === 'copy_color'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Droplets className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-bold text-xs">🌈 Copia Color</span>
              </button>
            </div>
          </div>

          {/* 2. Tamaño de Papel & Doble Faz (Oculto/Fijado en Carta si es Cédula) */}
          {serviceType !== 'copy_cedula' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                2. Tamaño de Papel
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaperType('carta')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center truncate ${
                    paperType === 'carta'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Carta (8.5x11)
                </button>

                <button
                  type="button"
                  onClick={() => setPaperType('legal')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center truncate ${
                    paperType === 'legal'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Legal / Oficio
                </button>

                <button
                  type="button"
                  onClick={() => setIsDuplex(!isDuplex)}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center text-center truncate ${
                    isDuplex
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {isDuplex ? '✓ Doble Faz' : '1 Sola Cara'}
                </button>
              </div>
            </div>
          )}

          {/* 3. Cantidad de Páginas o Cédulas */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 max-w-full overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                {serviceType === 'copy_cedula' ? 'Cantidad de Cédulas' : 'Cantidad de Páginas'}
              </label>
              <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Tarifa: {formatCurrency(effectiveUnitPrice)} c/u
              </span>
            </div>

            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] gap-2 items-center w-full">
              <button
                type="button"
                onClick={() => setPagesCount(Math.max(1, pagesCount - 1))}
                className="h-11 w-full bg-white border border-slate-300 rounded-xl font-black text-xl text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="1"
                value={pagesCount}
                onChange={(e) => setPagesCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-11 w-full min-w-0 text-center bg-white border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs px-1"
              />

              <button
                type="button"
                onClick={() => setPagesCount(pagesCount + 1)}
                className="h-11 w-full bg-white border border-slate-300 rounded-xl font-black text-xl text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {[1, 2, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPagesCount(num)}
                  className="py-1.5 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-bold rounded-lg shadow-xs transition active:scale-95"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Resumen de Insumos Automático */}
          <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
            <div>
              <span className="text-slate-500 text-[11px] block">Hojas de Papel:</span>
              <strong className="text-slate-900 text-xs">
                {sheetsUsed} hoja{sheetsUsed > 1 ? 's' : ''} (CARTA)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Tinta Estimada:</span>
              <strong className="text-blue-900 text-xs">
                ~{estimatedInkUsed} ml
              </strong>
            </div>
          </div>
        </div>

        {/* Footer con Total y Botón Agregar */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
              Subtotal
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-900">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 py-3 px-3.5 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-blue-700/25 flex items-center justify-center gap-1.5 transition"
          >
            <span>Agregar a Factura</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
