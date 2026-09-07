import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  AlertCircle,
  Boxes,
  X,
  Layers,
  Link2
} from 'lucide-react';
import { productsService } from '../services/productsService';
import { formatCurrency } from '../lib/formatters';
import { toast } from 'sonner';

export const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStockLow, setFilterStockLow] = useState(false);

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    cost_price: '',
    sale_price: '',
    stock: '',
    min_stock: '5',
    units_deducted_per_sale: '1',
    deduct_from_product_id: ''
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: '',
    type: 'restock',
    note: ''
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar inventario: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStockLow = filterStockLow ? p.stock <= (p.min_stock || 5) : true;
      return matchesSearch && matchesStockLow;
    });
  }, [products, searchQuery, filterStockLow]);

  // Métricas
  const totalStockCount = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.stock), 0);
  }, [products]);

  const totalCostInvestment = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.cost_price) * Number(p.stock)), 0);
  }, [products]);

  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        cost_price: product.cost_price.toString(),
        sale_price: product.sale_price.toString(),
        stock: product.stock.toString(),
        min_stock: (product.min_stock || 5).toString(),
        units_deducted_per_sale: (product.units_deducted_per_sale || 1).toString(),
        deduct_from_product_id: product.deduct_from_product_id || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        cost_price: '',
        sale_price: '',
        stock: '0',
        min_stock: '5',
        units_deducted_per_sale: '1',
        deduct_from_product_id: ''
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      toast.warning('El nombre del producto es obligatorio');
      return;
    }

    try {
      if (editingProduct) {
        await productsService.update(editingProduct.id, productForm);
        toast.success('Producto actualizado');
      } else {
        await productsService.create(productForm);
        toast.success('Producto creado con éxito');
      }
      setIsProductModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar: ' + (err.message || ''));
    }
  };

  const handleOpenStockModal = (product) => {
    setStockProduct(product);
    setStockAdjustment({
      quantity: '',
      type: 'restock',
      note: 'Entrada de mercadería / Compra'
    });
    setIsStockModalOpen(true);
  };

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    const qty = parseInt(stockAdjustment.quantity, 10);
    if (isNaN(qty) || qty === 0) {
      toast.warning('Ingresa una cantidad válida');
      return;
    }

    try {
      const finalQtyChange = stockAdjustment.type === 'restock' ? Math.abs(qty) : qty;
      await productsService.adjustStock(
        stockProduct.id,
        finalQtyChange,
        stockAdjustment.type,
        stockAdjustment.note
      );

      toast.success(
        stockAdjustment.type === 'restock'
          ? `Se sumaron ${qty} unidades a "${stockProduct.name}"`
          : `Ajuste realizado para "${stockProduct.name}"`
      );

      setIsStockModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al ajustar stock: ' + (err.message || ''));
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`¿Eliminar producto "${name}"?`)) {
      try {
        await productsService.delete(id);
        toast.success('Producto eliminado');
        await loadProducts();
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera Móvil y Desktop */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-700" />
            Inventario & Stock
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Control de productos, papel, menudeo, precios en C$ y stock
          </p>
        </div>

        <button
          onClick={() => handleOpenProductModal()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-700/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Producto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Tarjetas de Resumen en Azul & Blanco */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">
            Unidades en Stock
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalStockCount} <span className="text-xs font-medium text-slate-500">unid.</span>
          </p>
          <p className="text-[11px] text-blue-700 font-semibold mt-1">
            {products.length} productos registrados
          </p>
        </div>

        <div className="p-4 bg-blue-900 text-white rounded-2xl shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-blue-200 block">
            Inversión en Costo
          </span>
          <p className="text-xl sm:text-2xl font-black text-white mt-1">
            {formatCurrency(totalCostInvestment)}
          </p>
          <p className="text-[11px] text-blue-200 font-medium mt-1">Capital en mercadería</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar producto o papel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <button
          onClick={() => setFilterStockLow(!filterStockLow)}
          className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
            filterStockLow
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-white border-slate-300 text-slate-600'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Stock Bajo / Agotado
        </button>
      </div>

      {/* Lista Mobile Cards & Desktop Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Cargando inventario...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No hay productos para mostrar.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredProducts.map((p) => {
            const profit = Number(p.sale_price) - Number(p.cost_price);
            const isLow = p.stock <= (p.min_stock || 5);
            const isZero = p.stock <= 0;
            const unitsDeducted = Number(p.units_deducted_per_sale) || 1;

            return (
              <div
                key={p.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{p.name}</h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isZero
                          ? 'bg-rose-100 text-rose-700'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.stock} unid. disp.
                    </span>

                    {unitsDeducted > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-600" />
                        Descuenta {unitsDeducted} hojas/unid. por venta
                      </span>
                    )}
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className="text-slate-500">
                      Costo: <strong className="text-slate-800">{formatCurrency(p.cost_price)}</strong>
                    </span>
                    <span className="text-slate-500">
                      Venta: <strong className="text-blue-700 font-black">{formatCurrency(p.sale_price)}</strong>
                    </span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                      Margen: +{formatCurrency(profit)}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                  <button
                    onClick={() => handleOpenStockModal(p)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-xl text-xs transition active:scale-95"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    + Stock
                  </button>

                  <button
                    onClick={() => handleOpenProductModal(p)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear / Editar Producto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-200" />
                {editingProduct ? 'Editar Producto' : 'Crear Producto'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Hojas de Papel Carta / 3 Hojas Carta x C$2 / Cuaderno"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalles, marca o notas del producto"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio de Costo (C$) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0.00"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio de Venta (C$) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0.00"
                    value={productForm.sale_price}
                    onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-blue-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Venta Menudiada / Multiplicador de Stock */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-700" />
                  Unidades físicas a descontar por venta (Menudeo / Combos)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="1"
                  value={productForm.units_deducted_per_sale}
                  onChange={(e) =>
                    setProductForm({ ...productForm, units_deducted_per_sale: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-blue-800 leading-tight">
                  Ejemplo: Si vendes "3 Hojas Carta por C$2", pon <strong className="text-blue-950 font-bold">3</strong> para que al vender 1 combo descuente 3 hojas físicas del inventario.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingProduct ? 'Stock Actual' : 'Stock Inicial'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={Boolean(editingProduct)}
                    placeholder="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alerta Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={productForm.min_stock}
                    onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 transition"
                >
                  {editingProduct ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajustar Stock */}
      {isStockModalOpen && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div>
                <h3 className="font-bold text-base">Ajuste de Stock</h3>
                <p className="text-xs text-blue-200">{stockProduct.name}</p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <span className="text-blue-950 font-medium">Stock Actual:</span>
                <span className="font-black text-sm text-blue-900">
                  {stockProduct.stock} unidades
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStockAdjustment({
                        ...stockAdjustment,
                        type: 'restock',
                        note: 'Entrada de mercadería / Compra de resmas'
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      stockAdjustment.type === 'restock'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Entrada (Sumar)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStockAdjustment({
                        ...stockAdjustment,
                        type: 'adjustment',
                        note: 'Ajuste manual / Conteo'
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      stockAdjustment.type === 'adjustment'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Ajuste Manual
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad {stockAdjustment.type === 'restock' ? 'a Sumar (+)' : 'de Cambio (+ / -)'}
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej. 500"
                  value={stockAdjustment.quantity}
                  onChange={(e) =>
                    setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Nota
                </label>
                <input
                  type="text"
                  placeholder="Ej. Compra de resma de 500 hojas, etc."
                  value={stockAdjustment.note}
                  onChange={(e) =>
                    setStockAdjustment({ ...stockAdjustment, note: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 transition"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
