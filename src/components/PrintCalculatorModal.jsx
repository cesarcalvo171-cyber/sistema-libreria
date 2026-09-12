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
  Camera,
  ArrowRight,
  Tag,
  Zap,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { printService } from '../services/printService';
import { formatCurrency } from '../lib/formatters';
import { toast } from 'sonner';

// Matriz de Stickers por tamaño y escala por mayor
const STICKER_TIERS = [
  {
    id: 'st_5_7',
    name: '5–7 cm (Pequeño)',
    unitPrice: 5,
    wholesale: { 10: 40, 20: 75, 50: 175, 100: 350 },
    defaultStickersPerSheet: 6
  },
  {
    id: 'st_8_10',
    name: '8–10 cm (Mediano)',
    unitPrice: 10,
    wholesale: { 10: 80, 20: 150, 50: 350, 100: 700 },
    defaultStickersPerSheet: 4
  },
  {
    id: 'st_12',
    name: '12 cm (Grande)',
    unitPrice: 10,
    wholesale: { 10: 90, 20: 170, 50: 400, 100: 750 },
    defaultStickersPerSheet: 2
  },
  {
    id: 'st_15',
    name: '15 cm (Extra)',
    unitPrice: 15,
    wholesale: { 10: 130, 20: 250, 50: 600, 100: 1100 },
    defaultStickersPerSheet: 2
  },
  {
    id: 'st_18',
    name: '18 cm (Maxi)',
    unitPrice: 20,
    wholesale: { 10: 180, 20: 350, 50: 850, 100: 1600 },
    defaultStickersPerSheet: 1
  },
  {
    id: 'st_20',
    name: '20 cm (Página)',
    unitPrice: 20,
    wholesale: { 10: 200, 20: 380, 50: 900, 100: 1700 },
    defaultStickersPerSheet: 1
  }
];

export const PrintCalculatorModal = ({ isOpen, onClose, onAddPrintToCart }) => {
  const [activeTab, setActiveTab] = useState('prints'); // 'prints', 'stickers', 'direct'
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- TAB 1: Impresiones Clásicas ---
  const [serviceType, setServiceType] = useState('print_bn');
  const [paperType, setPaperType] = useState('carta'); // 'carta', 'legal', 'foto'
  const [isDuplex, setIsDuplex] = useState(false);
  const [pagesCount, setPagesCount] = useState(1);
  const [customUnitPrice, setCustomUnitPrice] = useState('');

  // --- TAB 2: Stickers & Calcomanías ---
  const [stickerTierId, setStickerTierId] = useState('st_5_7');
  const [stickerQty, setStickerQty] = useState(10);
  const [stickerCustomSheets, setStickerCustomSheets] = useState('');
  const [stickerCustomTotal, setStickerCustomTotal] = useState('');

  // --- TAB 3: Cobro Rápido / Directo ---
  const [directDescription, setDirectDescription] = useState('Impresión / Trabajo Especial');
  const [directMaterial, setDirectMaterial] = useState('adhesivo'); // 'adhesivo', 'foto', 'opalina', 'carta', 'legal'
  const [directSheets, setDirectSheets] = useState(1);
  const [directUnits, setDirectUnits] = useState(1);
  const [directTotal, setDirectTotal] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRates();
      setPagesCount(1);
      setCustomUnitPrice('');
      setStickerQty(10);
      setStickerCustomSheets('');
      setStickerCustomTotal('');
      setDirectSheets(1);
      setDirectUnits(1);
      setDirectTotal('');
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

  // -------------------------------------------------------------
  // CÁLCULOS: PESTAÑA 1 (IMPRESIONES CLÁSICAS)
  // -------------------------------------------------------------
  const currentRate = rates.find(
    (r) => r.service_type === serviceType && (
      serviceType === 'copy_cedula' ||
      serviceType === 'print_opalina' ||
      serviceType.startsWith('photo_')
        ? true
        : r.paper_type === paperType
    )
  ) || {
    sale_price: serviceType === 'photo_13x9' ? 15.0
      : serviceType === 'photo_18x13' ? 25.0
      : serviceType === 'photo_21x15' ? 30.0
      : serviceType === 'photo_carta' ? 40.0
      : serviceType === 'print_opalina' ? 15.0
      : serviceType === 'copy_cedula' ? 4.0
      : serviceType.includes('color') ? (paperType === 'legal' ? 10.0 : 8.0)
      : (paperType === 'legal' ? 5.0 : 4.0),
    cost_price: serviceType.startsWith('photo_') ? 4.35 : serviceType === 'print_opalina' ? 3.52 : 0.80,
    estimated_ink_ml: serviceType.startsWith('photo_') ? 0.30 : serviceType === 'print_opalina' ? 0.18 : 0.05
  };

  const effectivePrintUnitPrice = customUnitPrice !== ''
    ? parseFloat(customUnitPrice) || 0
    : currentRate.sale_price;

  const isSmallPhoto = serviceType === 'photo_13x9' || serviceType === 'photo_18x13';
  const isPhotoService = serviceType.startsWith('photo_');

  const printSheetsUsed = isPhotoService
    ? (isSmallPhoto ? 1 : pagesCount)
    : (isDuplex ? Math.ceil(pagesCount / 2) : pagesCount);

  const printEstimatedInk = Number(
    (pagesCount * (currentRate.estimated_ink_ml || 0.05)).toFixed(2)
  );
  const printSubtotal = pagesCount * effectivePrintUnitPrice;

  // -------------------------------------------------------------
  // CÁLCULOS: PESTAÑA 2 (STICKERS)
  // -------------------------------------------------------------
  const selectedStickerTier = STICKER_TIERS.find(t => t.id === stickerTierId) || STICKER_TIERS[0];
  
  // Calcular precio según escala o unitario
  const calcStickerTotal = () => {
    if (stickerCustomTotal !== '') {
      return parseFloat(stickerCustomTotal) || 0;
    }
    if (selectedStickerTier.wholesale[stickerQty]) {
      return selectedStickerTier.wholesale[stickerQty];
    }
    // Proporcional si no es escala exacta
    return stickerQty * selectedStickerTier.unitPrice;
  };

  const stickerSubtotal = calcStickerTotal();
  const stickerSheetsUsed = stickerCustomSheets !== '' 
    ? (parseInt(stickerCustomSheets) || 1)
    : Math.max(1, Math.ceil(stickerQty / selectedStickerTier.defaultStickersPerSheet));

  // -------------------------------------------------------------
  // CÁLCULOS: PESTAÑA 3 (DIRECTO / RÁPIDO)
  // -------------------------------------------------------------
  const directSubtotal = directTotal !== '' ? parseFloat(directTotal) || 0 : 0;

  // Material cost helper
  const getMaterialCost = (mat) => {
    switch(mat) {
      case 'adhesivo': return 4.25 + 0.41; // C$4.66
      case 'foto': return 4.10 + 0.41; // C$4.51
      case 'opalina': return 2.51 + 0.41; // C$2.92
      case 'legal': return 0.70 + 0.41;
      default: return 0.50 + 0.41; // carta
    }
  };

  // -------------------------------------------------------------
  // AGREGAR AL CARRITO / FACTURA
  // -------------------------------------------------------------
  const handleAdd = () => {
    if (activeTab === 'prints') {
      if (pagesCount <= 0) {
        toast.warning('Ingresa al menos 1 página/unidad');
        return;
      }

      let serviceName = 'Impresión';
      let pType = paperType;

      if (serviceType === 'print_opalina') {
        serviceName = 'Impresión Cartulina Opalina';
        pType = 'opalina';
      } else if (serviceType === 'copy_cedula') {
        serviceName = 'Copia Cédula / Doc';
        pType = 'carta';
      } else if (serviceType === 'photo_13x9') {
        serviceName = 'Foto 12.8 x 9.1 cm (5x3.5")';
        pType = 'foto';
      } else if (serviceType === 'photo_18x13') {
        serviceName = 'Foto 18.2 x 12.8 cm (5x7")';
        pType = 'foto';
      } else if (serviceType === 'photo_21x15') {
        serviceName = 'Foto 21 x 14.8 cm (Media Carta)';
        pType = 'foto';
      } else if (serviceType === 'photo_carta') {
        serviceName = 'Foto Tamaño Carta (8.5x11")';
        pType = 'foto';
      } else if (serviceType === 'print_bn') {
        serviceName = `Impresión B/N (${pType.toUpperCase()})`;
      } else if (serviceType === 'print_color') {
        serviceName = `Impresión Color (${pType.toUpperCase()})`;
      } else if (serviceType === 'copy_bn') {
        serviceName = `Copia B/N (${pType.toUpperCase()})`;
      } else if (serviceType === 'copy_color') {
        serviceName = `Copia Color (${pType.toUpperCase()})`;
      }

      const item = {
        name: serviceName,
        sale_price: effectivePrintUnitPrice,
        cost_price: currentRate.cost_price || 0.80,
        quantity: pagesCount,
        category: 'Impresiones & Copias',
        is_service: true,
        service_data: {
          service_type: serviceType,
          paper_type: pType,
          is_duplex: isDuplex,
          sheets_used: printSheetsUsed,
          ink_used_ml: printEstimatedInk
        }
      };

      onAddPrintToCart(item);
      toast.success(`${serviceName} agregado`);
      onClose();
    } else if (activeTab === 'stickers') {
      if (stickerQty <= 0) {
        toast.warning('Ingresa al menos 1 sticker');
        return;
      }
      if (stickerSubtotal <= 0) {
        toast.warning('El total no puede ser 0');
        return;
      }

      const unitPriceCalculated = Number((stickerSubtotal / stickerQty).toFixed(2));
      const costPerSheet = 4.25; // Papel adhesivo
      const inkPerSheet = 0.41;
      const totalCost = Number((stickerSheetsUsed * (costPerSheet + inkPerSheet)).toFixed(2));
      const costPerUnit = Number((totalCost / stickerQty).toFixed(2));

      const item = {
        name: `Stickers (${selectedStickerTier.name}) x${stickerQty}`,
        sale_price: unitPriceCalculated,
        cost_price: costPerUnit,
        quantity: stickerQty,
        category: 'Impresiones & Copias',
        is_service: true,
        service_data: {
          service_type: 'sticker_custom',
          paper_type: 'adhesivo',
          is_duplex: false,
          sheets_used: stickerSheetsUsed,
          ink_used_ml: Number((stickerSheetsUsed * 0.15).toFixed(2))
        }
      };

      onAddPrintToCart(item);
      toast.success(`${stickerQty} Stickers agregados (${formatCurrency(stickerSubtotal)})`);
      onClose();
    } else if (activeTab === 'direct') {
      if (directSubtotal <= 0) {
        toast.warning('Ingresa el monto a cobrar');
        return;
      }
      const qty = Math.max(1, directUnits);
      const sheets = Math.max(1, directSheets);
      const unitSale = Number((directSubtotal / qty).toFixed(2));
      const matCost = getMaterialCost(directMaterial);
      const totalCost = Number((sheets * matCost).toFixed(2));
      const unitCost = Number((totalCost / qty).toFixed(2));

      const item = {
        name: `${directDescription || 'Trabajo Directo'} (${directMaterial.toUpperCase()})`,
        sale_price: unitSale,
        cost_price: unitCost,
        quantity: qty,
        category: 'Impresiones & Copias',
        is_service: true,
        service_data: {
          service_type: 'print_direct',
          paper_type: directMaterial,
          is_duplex: false,
          sheets_used: sheets,
          ink_used_ml: Number((sheets * 0.15).toFixed(2))
        }
      };

      onAddPrintToCart(item);
      toast.success(`Trabajo agregado (${formatCurrency(directSubtotal)})`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        
        {/* Header con Pestañas */}
        <div className="p-3.5 pb-2 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl">
                <Printer className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  Centro de Impresión & Stickers
                </h2>
                <p className="text-[11px] text-blue-200">
                  Calcula precio, descuenta hojas y registra ganancia real
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegación de Pestañas */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/20 backdrop-blur-sm rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('prints')}
              className={`py-2 px-1 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'prints'
                  ? 'bg-white text-blue-950 shadow-md'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Impresiones</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              className={`py-2 px-1 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'stickers'
                  ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`py-2 px-1 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'direct'
                  ? 'bg-emerald-400 text-emerald-950 shadow-md shadow-emerald-400/20'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Directo</span>
            </button>
          </div>
        </div>

        {/* Contenido según Pestaña */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1">
          
          {/* ========================================================= */}
          {/* TAB 1: IMPRESIONES Y FOTOS TRADICIONALES */}
          {/* ========================================================= */}
          {activeTab === 'prints' && (
            <>
              {/* Selección de Tipo de Servicio */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  1. Servicio o Producto
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'print_bn', label: 'Impresión B/N', icon: FileText, color: 'hover:border-slate-400' },
                    { id: 'print_color', label: 'Impresión Color', icon: Droplets, color: 'hover:border-blue-400' },
                    { id: 'copy_bn', label: 'Copia B/N', icon: Copy, color: 'hover:border-slate-400' },
                    { id: 'copy_color', label: 'Copia Color', icon: Droplets, color: 'hover:border-blue-400' },
                    { id: 'print_opalina', label: 'Cartulina Opalina (C$15)', icon: Layers, color: 'hover:border-purple-400' },
                    { id: 'copy_cedula', label: 'Copia Cédula / Doc (C$4)', icon: CreditCard, color: 'hover:border-indigo-400' },
                  ].map((s) => {
                    const Icon = s.icon;
                    const isSelected = serviceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setServiceType(s.id);
                          setCustomUnitPrice('');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                          isSelected
                            ? 'border-blue-700 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700 ' + s.color
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold leading-tight">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección Especial: Fotos */}
              <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Fotos en Papel Fotográfico
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'photo_13x9', label: '12.8 x 9.1 cm', price: 15, hint: 'Cabina / 1 hoja' },
                    { id: 'photo_18x13', label: '18.2 x 12.8 cm', price: 25, hint: 'Mediana / 1 hoja' },
                    { id: 'photo_21x15', label: '21 x 14.8 cm', price: 30, hint: 'Media Carta (1 hoja)' },
                    { id: 'photo_carta', label: 'Tamaño Carta', price: 40, hint: 'Foto Completa (1 hoja)' }
                  ].map((f) => {
                    const isSelected = serviceType === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setServiceType(f.id);
                          setCustomUnitPrice('');
                        }}
                        className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs font-bold'
                            : 'border-indigo-200/70 bg-white hover:bg-indigo-50/50 text-indigo-950'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-bold">{f.label}</span>
                          <span className={`text-[11px] font-black ${isSelected ? 'text-indigo-100' : 'text-indigo-700'}`}>
                            C${f.price}
                          </span>
                        </div>
                        <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {f.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opciones de Papel y Doble Cara (si no es foto ni cédula ni opalina) */}
              {!serviceType.startsWith('photo_') && serviceType !== 'copy_cedula' && serviceType !== 'print_opalina' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Tamaño de Hoja
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPaperType('carta')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          paperType === 'carta'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Carta
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperType('legal')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          paperType === 'legal'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Legal (+C$1)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Caras Impresas
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setIsDuplex(false)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          !isDuplex
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        1 Cara
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDuplex(true)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          isDuplex
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Doble Cara
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cantidad y Precio Unitario */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isPhotoService ? 'Cantidad de Fotos' : 'Cantidad de Páginas'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tarifa sugerida: <strong>{formatCurrency(currentRate.sale_price)}</strong> c/u
                    </span>
                  </div>

                  <div className="w-28">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 text-right">
                      Precio Unit. C$
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder={currentRate.sale_price.toString()}
                      value={customUnitPrice}
                      onChange={(e) => setCustomUnitPrice(e.target.value)}
                      className="w-full text-right py-1 px-2 text-xs font-black bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-700"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPagesCount((prev) => Math.max(1, prev - 1))}
                    className="h-10 w-12 bg-white border border-slate-300 rounded-xl font-black text-xl text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={pagesCount}
                    onChange={(e) => setPagesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-10 text-center font-black text-lg bg-white border border-slate-300 rounded-xl focus:border-blue-700 focus:outline-hidden shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => setPagesCount((prev) => prev + 1)}
                    className="h-10 w-12 bg-white border border-slate-300 rounded-xl font-black text-xl text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
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
                      className="py-1 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-bold rounded-lg shadow-xs transition active:scale-95"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insumos deducidos */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                <div>
                  <span className="text-slate-500 text-[10px] block">Hojas a Descontar:</span>
                  <strong className="text-slate-900 text-xs">
                    {printSheetsUsed} hoja{printSheetsUsed > 1 ? 's' : ''} ({isPhotoService ? 'FOTOGRÁFICO' : serviceType === 'print_opalina' ? 'OPALINA' : paperType.toUpperCase()})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tinta Estimada:</span>
                  <strong className="text-blue-900 text-xs">
                    ~{printEstimatedInk} ml
                  </strong>
                </div>
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STICKERS Y CALCOMANÍAS */}
          {/* ========================================================= */}
          {activeTab === 'stickers' && (
            <>
              {/* Selección de Tamaño de Sticker */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  1. Medida / Tamaño del Sticker
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STICKER_TIERS.map((tier) => {
                    const isSelected = stickerTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setStickerTierId(tier.id);
                          setStickerCustomTotal('');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="text-xs font-black block leading-tight">{tier.name}</span>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Unit: C${tier.unitPrice}</span>
                          <span className="font-bold text-amber-800">10u=C${tier.wholesale[10]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Escala al por mayor */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    2. Paquetes con Descuento Mayorista
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                    Auto-precio
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 50, 100].map((qty) => {
                    const price = selectedStickerTier.wholesale[qty];
                    const isSelected = stickerQty === qty && stickerCustomTotal === '';
                    return (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          setStickerQty(qty);
                          setStickerCustomTotal('');
                        }}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-amber-600 bg-amber-500 text-white font-black shadow-sm'
                            : 'border-amber-200 bg-white hover:bg-amber-100/50 text-amber-950'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{qty} unid</span>
                        <span className={`text-xs font-black mt-0.5 ${isSelected ? 'text-amber-100' : 'text-amber-700'}`}>
                          C${price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cantidad Manual & Ajustes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    O ingresa cantidad exacta:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStickerQty((prev) => Math.max(1, prev - 5));
                        setStickerCustomTotal('');
                      }}
                      className="h-8 w-8 bg-white border border-slate-300 rounded-lg font-black text-sm text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
                    >
                      -5
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={stickerQty}
                      onChange={(e) => {
                        setStickerQty(Math.max(1, parseInt(e.target.value) || 1));
                        setStickerCustomTotal('');
                      }}
                      className="w-16 h-8 text-center font-black text-sm bg-white border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStickerQty((prev) => prev + 5);
                        setStickerCustomTotal('');
                      }}
                      className="h-8 w-8 bg-white border border-slate-300 rounded-lg font-black text-sm text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
                    >
                      +5
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Hojas Adhesivas Usadas:
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder={`Auto (${Math.max(1, Math.ceil(stickerQty / selectedStickerTier.defaultStickersPerSheet))})`}
                      value={stickerCustomSheets}
                      onChange={(e) => setStickerCustomSheets(e.target.value)}
                      className="w-full text-center py-1.5 px-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Precio Especial (Opcional):
                    </label>
                    <input
                      type="number"
                      step="5"
                      placeholder={`C$${stickerSubtotal}`}
                      value={stickerCustomTotal}
                      onChange={(e) => setStickerCustomTotal(e.target.value)}
                      className="w-full text-right py-1.5 px-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Insumos deducidos */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-2xl">
                <div>
                  <span className="text-amber-800/80 text-[10px] block font-medium">Hojas Adhesivas a Rebajar:</span>
                  <strong className="text-amber-950 text-xs font-extrabold">
                    {stickerSheetsUsed} hoja{stickerSheetsUsed > 1 ? 's' : ''} (Adhesivo Carta)
                  </strong>
                </div>
                <div>
                  <span className="text-amber-800/80 text-[10px] block font-medium">Costo Insumos (Papel+Tinta):</span>
                  <strong className="text-amber-950 text-xs font-extrabold">
                    {formatCurrency(stickerSheetsUsed * 4.66)}
                  </strong>
                </div>
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 3: COBRO RÁPIDO / DIRECTO (PARA TRABAJOS FUERA DE TARIFA) */}
          {/* ========================================================= */}
          {activeTab === 'direct' && (
            <>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Registro Rápido Sin Tarifas Fijas
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-tight">
                  Úsalo cuando hagas un trabajo a la medida (ej: 25 stickers a C$8 = C$200 y ocupaste 4 hojas). Escribe el total y el material para rebajar stock exacto.
                </p>

                {/* Concepto / Nombre */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Descripción del Trabajo:
                  </label>
                  <input
                    type="text"
                    value={directDescription}
                    onChange={(e) => setDirectDescription(e.target.value)}
                    placeholder="Ej: 25 Stickers redondos, Proyecto Escolar, etc."
                    className="w-full py-2 px-3 text-xs font-semibold bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Tipo de Papel / Material a descontar */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Material / Papel Utilizado:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'adhesivo', label: '🏷️ Adhesivo' },
                      { id: 'foto', label: '📸 Foto' },
                      { id: 'opalina', label: '📄 Opalina' },
                      { id: 'carta', label: '📝 Bond Carta' },
                      { id: 'legal', label: '📑 Bond Legal' }
                    ].map((m) => {
                      const isSelected = directMaterial === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setDirectMaterial(m.id)}
                          className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hojas gastadas y Unidades */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Hojas Gastadas:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={directSheets}
                      onChange={(e) => setDirectSheets(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center py-2 px-2 text-sm font-black bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Piezas / Unidades:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={directUnits}
                      onChange={(e) => setDirectUnits(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center py-2 px-2 text-sm font-black bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Total C$ a Cobrar */}
                <div className="pt-2 border-t border-emerald-200">
                  <label className="text-[11px] font-black text-emerald-950 uppercase block mb-1 text-center">
                    Monto Total a Cobrar (C$)
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-emerald-700 text-base">
                      C$
                    </span>
                    <input
                      type="number"
                      step="1"
                      placeholder="0.00"
                      value={directTotal}
                      onChange={(e) => setDirectTotal(e.target.value)}
                      className="w-full text-center pl-10 pr-4 py-2.5 text-xl font-black bg-white border-2 border-emerald-500 text-emerald-950 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-hidden shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer con Total y Botón Agregar */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
              Total a Facturar
            </span>
            <span className={`text-xl sm:text-2xl font-black ${
              activeTab === 'stickers' ? 'text-amber-800' : activeTab === 'direct' ? 'text-emerald-800' : 'text-blue-900'
            }`}>
              {formatCurrency(
                activeTab === 'stickers' ? stickerSubtotal : activeTab === 'direct' ? directSubtotal : printSubtotal
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 py-3 px-3.5 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition ${
              activeTab === 'stickers'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                : activeTab === 'direct'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/25'
            }`}
          >
            <span>Agregar a Factura</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
