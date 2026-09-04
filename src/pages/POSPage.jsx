import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Banknote,
  Package,
  Receipt,
  Printer,
  X,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { productsService } from '../services/productsService';
import { salesService } from '../services/salesService';
import { formatCurrency } from '../lib/formatters';
import { PrintCalculatorModal } from '../components/PrintCalculatorModal';
import { toast } from 'sonner';

export const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito y Cobro
  const [cart, setCart] = useState([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modales
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Cargar productos
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar productos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  // Totales
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const numAmountPaid = parseFloat(amountPaid) || 0;
  const changeGiven = Math.max(0, numAmountPaid - total);
  const isPaidEnough = numAmountPaid >= total && total > 0;
  const missingAmount = Math.max(0, total - numAmountPaid);

  // Agregar producto físico al carrito
  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Stock máximo disponible: ${product.stock}`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, item_type: 'product' }];
    });
  };

  // Agregar servicio de impresión al carrito
  const handleAddPrintToCart = (printItem) => {
    setCart((prevCart) => [...prevCart, printItem]);
  };

  // Modificar cantidad
  const updateQuantity = (productId, newQty) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    // Si es producto físico, validar stock
    if (item.item_type !== 'print_service') {
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? product.stock : 999;
      if (newQty > maxStock) {
        toast.warning(`Stock máximo: ${maxStock} unidades`);
        return;
      }
    }

    setCart((prevCart) =>
      prevCart.map((i) =>
        i.id === productId ? { ...i, quantity: newQty } : i
      )
    );
  };

  // Eliminar del carrito
  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Cancelar factura
  const handleCancelInvoice = () => {
    if (cart.length === 0) return;
    if (window.confirm('¿Cancelar y vaciar esta factura?')) {
      setCart([]);
      setAmountPaid('');
      setNotes('');
      setIsCartModalOpen(false);
      toast.info('Factura cancelada');
    }
  };

  // Emitir Factura
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Agrega productos o impresiones a la factura');
      return;
    }

    if (!isPaidEnough) {
      toast.warning(`Monto insuficiente. Faltan ${formatCurrency(missingAmount)}`);
      return;
    }

    try {
      setProcessing(true);
      const res = await salesService.processSale({
        total,
        amountPaid: numAmountPaid,
        changeGiven,
        paymentMethod,
        notes,
        items: cart
      });

      toast.success(`¡Factura #${res.invoice_number || 'OK'} emitida con éxito!`);
      setCart([]);
      setAmountPaid('');
      setNotes('');
      setIsCartModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al emitir factura: ' + (err.message || ''));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)]">
      {/* SECCIÓN IZQUIERDA: Catálogo de Productos y Botón de Impresión */}
      <div className="flex-1 p-4 sm:p-6 pb-28 lg:pb-6 overflow-y-auto space-y-3">
        {/* Barra Superior con Buscador y Botón de Impresión Rápida */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pb-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Botón Destacado: Cobrar Impresión / Copia */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-2xl text-sm shadow-md shadow-blue-900/20 active:scale-98 transition shrink-0 border border-blue-800"
          >
            <Printer className="w-5 h-5 text-cyan-300" />
            <span>🖨️ Cobrar Impresión / Copia</span>
          </button>

          {/* Buscador de Productos */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar producto físico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Listado / Grid de Productos (2 columnas en móvil) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-medium">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <Package className="w-12 h-12 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No se encontraron productos</p>
            <p className="text-xs text-slate-500 mt-1">Crea productos en el módulo de Inventario</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const inCart = cart.find((i) => i.id === product.id);

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product)}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all active:scale-[0.98] flex flex-col justify-between relative shadow-xs ${
                    isOutOfStock
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : inCart
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 bg-blue-700 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  )}

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Precio
                      </span>
                      <span className="text-base font-black text-blue-700">
                        {formatCurrency(product.sale_price)}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : product.stock <= (product.min_stock || 5)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {product.stock} disp.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BARRA FLOTANTE INFERIOR EN MÓVIL (Touch Action) */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-30 lg:hidden">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{totalItemsCount} ítems</p>
              <p className="text-lg font-black text-slate-900">{formatCurrency(total)}</p>
            </div>
          </div>

          <button
            onClick={() => setIsCartModalOpen(true)}
            disabled={cart.length === 0}
            className="flex-1 max-w-[200px] py-3 px-4 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Cobrar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Mesa de Facturación (Desktop) / Drawer Modal (Mobile) */}
      <div
        className={`${
          isCartModalOpen
            ? 'fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm lg:relative lg:bg-transparent lg:inset-auto'
            : 'hidden lg:flex'
        } w-full lg:w-[400px] xl:w-[440px] flex-col bg-white border-l border-slate-200 lg:h-[calc(100vh-4rem)] shadow-xl lg:shadow-none`}
      >
        <div className="bg-white flex flex-col h-full mt-auto lg:mt-0 rounded-t-3xl lg:rounded-none overflow-hidden max-h-[90vh] lg:max-h-full">
          {/* Cabecera del Carrito */}
          <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-200" />
              <h3 className="font-bold text-base">Factura Actual</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-800 px-2.5 py-1 rounded-full font-bold text-blue-100">
                {totalItemsCount} ítems
              </span>
              <button
                onClick={() => setIsCartModalOpen(false)}
                className="lg:hidden p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Lista de Ítems */}
          <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Factura sin productos</p>
                <p className="text-xs text-slate-400">Selecciona productos o cobra impresiones</p>
              </div>
            ) : (
              cart.map((item) => {
                const isPrint = item.item_type === 'print_service';

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isPrint && <Printer className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
                        <h5 className="font-bold text-sm text-slate-900 truncate">{item.name}</h5>
                      </div>
                      <p className="text-xs text-blue-700 font-bold mt-0.5">
                        {formatCurrency(item.sale_price)} c/u
                      </p>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-700 hover:bg-slate-200 active:scale-95 shadow-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-700 hover:bg-slate-200 active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal y Eliminar */}
                    <div className="text-right">
                      <p className="font-black text-sm text-slate-900">
                        {formatCurrency(item.sale_price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-rose-600 hover:text-rose-700 p-0.5 ml-auto block mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel de Cobro y Vuelto */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 uppercase">Total a Pagar:</span>
              <span className="text-2xl font-black text-blue-900">{formatCurrency(total)}</span>
            </div>

            {/* Con cuánto paga */}
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-blue-700" />
                  Con cuánto paga:
                </label>
                {total > 0 && (
                  <button
                    onClick={() => setAmountPaid(total.toString())}
                    className="text-[11px] px-2 py-0.5 bg-blue-200/70 hover:bg-blue-200 text-blue-900 font-bold rounded-md"
                  >
                    Exacto
                  </button>
                )}
              </div>

              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xl font-black text-blue-950 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              {/* Vuelto en tiempo real */}
              {numAmountPaid > 0 && total > 0 && (
                <div
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    isPaidEnough
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}
                >
                  <span>{isPaidEnough ? 'Vuelto a entregar:' : 'Faltante:'}</span>
                  <span className="text-base font-black">
                    {isPaidEnough ? formatCurrency(changeGiven) : formatCurrency(missingAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={cart.length === 0 || processing}
                className="py-3 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || !isPaidEnough || processing}
                className="col-span-2 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 transition disabled:opacity-40"
              >
                {processing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Emitir Factura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Calculadora de Impresión */}
      <PrintCalculatorModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onAddPrintToCart={handleAddPrintToCart}
      />
    </div>
  );
};
