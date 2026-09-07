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

    // 1. Insertar cabecera de venta
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

    // 2. Procesar items y descontar stock correspondiente
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

        // DESCONTAR STOCK DE HOJAS FÍSICAS UTILIZADAS EN LA IMPRESIÓN/COPIA
        const sheetsCount = Number(item.sheets_used) || Number(item.pages_count) || 1;
        const paperType = item.paper_type || 'carta';

        try {
          // Buscar producto de papel en inventario
          const { data: paperProducts } = await supabase
            .from('products')
            .select('id, name, stock')
            .eq('is_active', true);

          let targetPaper = null;
          if (paperType === 'carta') {
            targetPaper = (paperProducts || []).find(p => p.name.toLowerCase().includes('carta'));
          } else {
            targetPaper = (paperProducts || []).find(p => p.name.toLowerCase().includes('legal') || p.name.toLowerCase().includes('oficio'));
          }

          if (targetPaper) {
            const currentStock = targetPaper.stock || 0;
            const newStock = Math.max(0, currentStock - sheetsCount);

            await supabase
              .from('products')
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', targetPaper.id);

            await supabase.from('stock_movements').insert([
              {
                product_id: targetPaper.id,
                type: 'sale',
                quantity: -sheetsCount,
                previous_stock: currentStock,
                new_stock: newStock,
                reference_id: saleData.id,
                note: `Consumo en ${item.name} - Factura #${saleData.invoice_number}`
              }
            ]);
          }
        } catch (paperErr) {
          console.warn('Error al descontar stock de papel para impresión:', paperErr);
        }

      } else {
        // Producto Físico o Menudeo (ej. 3 Hojas Carta x C$2)
        const { data: prod } = await supabase
          .from('products')
          .select('id, name, stock, cost_price, units_deducted_per_sale, deduct_from_product_id')
          .eq('id', item.id)
          .single();

        const unitsMultiplier = prod ? (Number(prod.units_deducted_per_sale) || 1) : 1;
        const totalUnitsToDeduct = Number(item.quantity) * unitsMultiplier;
        const costPrice = prod ? prod.cost_price : (item.cost_price || 0);

        // Insertar item en detalle de venta
        await supabase.from('sale_items').insert([
          {
            sale_id: saleData.id,
            product_id: item.id,
            product_name: item.name,
            cost_price: costPrice,
            unit_price: Number(item.sale_price),
            quantity: item.quantity,
            subtotal: Number(item.quantity * item.sale_price),
            item_type: 'product',
            metadata: {
              units_deducted: totalUnitsToDeduct
            }
          }
        ]);

        // Determinar qué producto descuenta stock (si tiene producto padre o él mismo)
        const targetDeductId = (prod && prod.deduct_from_product_id) ? prod.deduct_from_product_id : item.id;

        const { data: targetProd } = await supabase
          .from('products')
          .select('name, stock')
          .eq('id', targetDeductId)
          .single();

        if (targetProd) {
          const currentStock = targetProd.stock || 0;
          const newStock = Math.max(0, currentStock - totalUnitsToDeduct);

          // Descontar stock
          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', targetDeductId);

          // Registrar movimiento en Kardex
          await supabase.from('stock_movements').insert([
            {
              product_id: targetDeductId,
              type: 'sale',
              quantity: -totalUnitsToDeduct,
              previous_stock: currentStock,
              new_stock: newStock,
              reference_id: saleData.id,
              note: `Venta de ${item.quantity} x "${item.name}" (Deducción: -${totalUnitsToDeduct} unid.) - Factura #${saleData.invoice_number}`
            }
          ]);
        }
      }
    }

    // 3. Registrar logs de impresión si hubo
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

    // Reponer stock para productos y para papel de impresiones
    for (const item of sale.sale_items || []) {
      if (item.item_type === 'print_service') {
        const meta = item.metadata || {};
        const sheetsCount = Number(meta.sheets_used) || Number(item.quantity) || 1;
        const paperType = meta.paper_type || 'carta';

        const { data: paperProducts } = await supabase
          .from('products')
          .select('id, name, stock')
          .eq('is_active', true);

        const targetPaper = (paperProducts || []).find(p =>
          paperType === 'carta' ? p.name.toLowerCase().includes('carta') : (p.name.toLowerCase().includes('legal') || p.name.toLowerCase().includes('oficio'))
        );

        if (targetPaper) {
          const currentStock = targetPaper.stock || 0;
          const newStock = currentStock + sheetsCount;

          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', targetPaper.id);

          await supabase.from('stock_movements').insert([
            {
              product_id: targetPaper.id,
              type: 'cancel_sale',
              quantity: sheetsCount,
              previous_stock: currentStock,
              new_stock: newStock,
              reference_id: saleId,
              note: `Devolución por Anulación Factura #${sale.invoice_number}`
            }
          ]);
        }
      } else if (item.product_id) {
        const { data: prod } = await supabase
          .from('products')
          .select('id, stock, units_deducted_per_sale, deduct_from_product_id')
          .eq('id', item.product_id)
          .single();

        const unitsMultiplier = prod ? (Number(prod.units_deducted_per_sale) || 1) : 1;
        const unitsToRestore = Number(item.quantity) * unitsMultiplier;
        const targetDeductId = (prod && prod.deduct_from_product_id) ? prod.deduct_from_product_id : item.product_id;

        const { data: targetProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', targetDeductId)
          .single();

        if (targetProd) {
          const currentStock = targetProd.stock || 0;
          const newStock = currentStock + unitsToRestore;

          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', targetDeductId);

          await supabase.from('stock_movements').insert([
            {
              product_id: targetDeductId,
              type: 'cancel_sale',
              quantity: unitsToRestore,
              previous_stock: currentStock,
              new_stock: newStock,
              reference_id: saleId,
              note: `Devolución Factura #${sale.invoice_number} (+${unitsToRestore} unid.)`
            }
          ]);
        }
      }
    }

    return { success: true, message: 'Factura anulada con éxito' };
  }
};
