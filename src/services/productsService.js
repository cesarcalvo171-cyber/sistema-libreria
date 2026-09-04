import { supabase } from '../lib/supabase';

export const productsService = {
  // Obtener todos los productos activos
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener un producto por ID
  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear producto nuevo
  async create(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: productData.name.trim(),
          description: productData.description || null,
          cost_price: Number(productData.cost_price) || 0,
          sale_price: Number(productData.sale_price) || 0,
          stock: parseInt(productData.stock, 10) || 0,
          min_stock: parseInt(productData.min_stock, 10) || 5,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Registrar movimiento inicial de stock si es > 0
    if (data.stock > 0) {
      await supabase.from('stock_movements').insert([
        {
          product_id: data.id,
          type: 'restock',
          quantity: data.stock,
          previous_stock: 0,
          new_stock: data.stock,
          note: 'Stock inicial al crear producto'
        }
      ]);
    }

    return data;
  },

  // Actualizar producto
  async update(id, productData) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: productData.name.trim(),
        description: productData.description || null,
        cost_price: Number(productData.cost_price) || 0,
        sale_price: Number(productData.sale_price) || 0,
        min_stock: parseInt(productData.min_stock, 10) || 5,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Ajustar stock (entrada de mercadería o corrección)
  async adjustStock(productId, quantityChange, type = 'restock', note = 'Ajuste de inventario') {
    // Intentar primero con la función RPC de Supabase
    try {
      const { data, error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_quantity_change: Number(quantityChange),
        p_type: type,
        p_note: note
      });

      if (!error && data?.success) {
        return data;
      }
    } catch (e) {
      console.warn('RPC adjust_product_stock fallo o no existe, usando fallback directo:', e);
    }

    // Fallback directo si la función RPC aún no está creada
    const current = await this.getById(productId);
    const newStock = (current.stock || 0) + Number(quantityChange);
    if (newStock < 0) {
      throw new Error(`El stock no puede ser negativo (${newStock})`);
    }

    const { data, error } = await supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('stock_movements').insert([
      {
        product_id: productId,
        type: type,
        quantity: Number(quantityChange),
        previous_stock: current.stock,
        new_stock: newStock,
        note: note
      }
    ]);

    return { success: true, new_stock: newStock, product: data };
  },

  // Eliminar (soft-delete desactivando)
  async delete(id) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Obtener historial de movimientos de stock
  async getMovements(productId = null) {
    let query = supabase
      .from('stock_movements')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};
