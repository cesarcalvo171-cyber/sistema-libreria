import { supabase } from '../lib/supabase';
import { printService } from './printService';

export const salesService = {
  // Crear y procesar una venta completa
  async processSale({ total, amountPaid, changeGiven, paymentMethod = 'efectivo', notes = '', items }) {
    if (!items || items.length === 0) {
      throw new Error('Debes agregar al menos un producto o servicio');
    }

    if (amountPaid < total) {
      throw new Error('El monto pagado no puede ser menor al total');
    }

    // 1. Insertar venta
    const { data: saleData, error: saleErr } = await supabase
      .from('sales')
      .insert([
        {
          total: Number(total),
          amount_paid: Number(amountPaid),
          change_given: Number(changeGiven),
          payment_method: paymentMethod,
          notes: notes || null,
          status: 'completed'
        }
      ])
      .select()
      .single();

    if (saleErr) throw saleErr;

    const printItems = [];

    // 2. Insertar items y descontar stock sólo para productos físicos
    for (const item of items) {
      const isPrintService = item.item_type === 'print_service' || item.is_service;

      if (isPrintService) {
        printItems.push(item);

        // Insertar item de servicio de impresión
        await supabase.from('sale_items').insert([
          {
            sale_id: saleData.id,
            product_id: null,
            product_name: item.name,
            cost_price: Number(item.cost_price) || 0,
            unit_price: Number(item.sale_price) || 0,
            quantity: Number(item.quantity) || 1,
            subtotal: Number(item.quantity * item.sale_price),
            item_type: 'print_service',
            metadata: {
              service_type: item.service_type,
              paper_type: item.paper_type,
              is_duplex: item.is_duplex,
              pages_count: item.pages_count,
              sheets_used: item.sheets_used,
              ink_used_estimate: item.ink_used_estimate
            }
          }
        ]);
      } else {
        // Producto físico tradicional
        const { data: prod } = await supabase
          .from('products')
          .select('name, stock, cost_price')
          .eq('id', item.id)
          .single();

        const currentStock = prod ? prod.stock : 0;
        const costPrice = prod ? prod.cost_price : (item.cost_price || 0);
        const newStock = Math.max(0, currentStock - item.quantity);

        // Insertar item
        await supabase.from('sale_items').insert([
          {
            sale_id: saleData.id,
            product_id: item.id,
            product_name: item.name,
            cost_price: costPrice,
            unit_price: Number(item.sale_price),
            quantity: item.quantity,
            subtotal: Number(item.quantity * item.sale_price),
            item_type: 'product'
          }
        ]);

        // Descontar stock
        await supabase
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        // Registrar movimiento
        await supabase.from('stock_movements').insert([
          {
            product_id: item.id,
            type: 'sale',
            quantity: -item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_id: saleData.id,
            note: `Venta Factura #${saleData.invoice_number}`
          }
        ]);
      }
    }

    // 3. Si hubo impresiones, registrar en print_logs
    if (printItems.length > 0) {
      await printService.logPrintJobs(saleData.id, printItems);
    }

    return {
      success: true,
      sale_id: saleData.id,
      invoice_number: saleData.invoice_number,
      message: 'Venta completada con éxito'
    };
  },

  // Obtener historial de ventas
  async getAll({ startDate = null, endDate = null, status = null } = {}) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          id,
          product_id,
          product_name,
          cost_price,
          unit_price,
          quantity,
          subtotal,
          item_type,
          metadata
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Obtener venta por ID con sus items
  async getById(id) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          id,
          product_id,
          product_name,
          cost_price,
          unit_price,
          quantity,
          subtotal,
          item_type,
          metadata
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Anular / Cancelar factura
  async cancelSale(saleId, reason = 'Anulación de venta') {
    const sale = await this.getById(saleId);
    if (sale.status === 'cancelled') {
      throw new Error('La factura ya está cancelada');
    }

    // Marcar como cancelada
    const { error: updateErr } = await supabase
      .from('sales')
      .update({
        status: 'cancelled',
        notes: `${sale.notes || ''} [ANULADA: ${reason}]`.trim()
      })
      .eq('id', saleId);

    if (updateErr) throw updateErr;

    // Reponer stock sólo para productos físicos
    for (const item of sale.sale_items || []) {
      if (item.product_id && item.item_type !== 'print_service') {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        const currentStock = prod ? prod.stock : 0;
        const newStock = currentStock + item.quantity;

        await supabase
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.product_id);

        await supabase.from('stock_movements').insert([
          {
            product_id: item.product_id,
            type: 'cancel_sale',
            quantity: item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_id: saleId,
            note: `Anulación Factura #${sale.invoice_number}`
          }
        ]);
      }
    }

    return { success: true, message: 'Factura anulada con éxito' };
  }
};
