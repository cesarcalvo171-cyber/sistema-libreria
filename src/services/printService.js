import { supabase } from '../lib/supabase';

// Tarifas Oficiales en Córdobas (C$)
export const defaultPrintRates = [
  { service_type: 'print_bn', paper_type: 'carta', name: 'Impresión B/N Carta', sale_price: 4.00, cost_price: 1.00, estimated_ink_ml: 0.050 },
  { service_type: 'print_bn', paper_type: 'legal', name: 'Impresión B/N Legal', sale_price: 5.00, cost_price: 1.25, estimated_ink_ml: 0.060 },
  { service_type: 'print_color', paper_type: 'carta', name: 'Impresión Color Carta', sale_price: 8.00, cost_price: 2.50, estimated_ink_ml: 0.150 },
  { service_type: 'print_color', paper_type: 'legal', name: 'Impresión Color Legal', sale_price: 10.00, cost_price: 3.00, estimated_ink_ml: 0.180 },
  { service_type: 'copy_bn', paper_type: 'carta', name: 'Copia B/N Carta', sale_price: 4.00, cost_price: 0.80, estimated_ink_ml: 0.040 },
  { service_type: 'copy_bn', paper_type: 'legal', name: 'Copia B/N Legal', sale_price: 5.00, cost_price: 1.00, estimated_ink_ml: 0.050 },
  { service_type: 'copy_color', paper_type: 'carta', name: 'Copia Color Carta', sale_price: 8.00, cost_price: 2.50, estimated_ink_ml: 0.120 },
  { service_type: 'copy_color', paper_type: 'legal', name: 'Copia Color Legal', sale_price: 10.00, cost_price: 3.00, estimated_ink_ml: 0.150 }
];

export const printService = {
  // Obtener tarifas configuradas
  async getRates() {
    try {
      // Limpiar caché local obsoleta
      localStorage.removeItem('POS_PRINT_RATES');

      const { data, error } = await supabase
        .from('print_rates')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        // Verificar si la base de datos tiene precios viejos (ej. 2.00 para B/N) y sincronizarlos automáticamente
        const bnCarta = data.find(r => r.service_type === 'print_bn' && r.paper_type === 'carta');
        if (bnCarta && Number(bnCarta.sale_price) < 4.00) {
          await this.syncOfficialRates(data);
          // Recargar tras actualizar
          const { data: updatedData } = await supabase.from('print_rates').select('*').order('name', { ascending: true });
          if (updatedData) return updatedData;
        }
        return data;
      }

      return defaultPrintRates;
    } catch (e) {
      console.warn('Error al obtener tarifas:', e);
      return defaultPrintRates;
    }
  },

  // Sincronizar / Actualizar la base de datos con las tarifas oficiales
  async syncOfficialRates(existingData = []) {
    try {
      for (const def of defaultPrintRates) {
        const found = existingData.find(e => e.service_type === def.service_type && e.paper_type === def.paper_type);
        if (found) {
          await supabase
            .from('print_rates')
            .update({
              sale_price: def.sale_price,
              cost_price: def.cost_price,
              name: def.name,
              updated_at: new Date().toISOString()
            })
            .eq('id', found.id);
        } else {
          await supabase.from('print_rates').insert([def]);
        }
      }
    } catch (e) {
      console.warn('Error durante sincronización de tarifas:', e);
    }
  },

  // Guardar / Actualizar tarifa individual
  async updateRate(id, rateData) {
    try {
      const { data, error } = await supabase
        .from('print_rates')
        .update({
          sale_price: Number(rateData.sale_price) || 0,
          cost_price: Number(rateData.cost_price) || 0,
          estimated_ink_ml: Number(rateData.estimated_ink_ml) || 0.05,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      return { ...rateData, id };
    }
  },

  // Registrar log de impresión individual (llamado durante la facturación)
  async logPrintJobs(saleId, printItems) {
    if (!printItems || printItems.length === 0) return;

    const logsToInsert = printItems.map(item => ({
      sale_id: saleId,
      service_type: item.service_type || 'print_bn',
      paper_type: item.paper_type || 'carta',
      is_duplex: Boolean(item.is_duplex),
      pages_count: Number(item.pages_count || item.quantity) || 1,
      sheets_used: Number(item.sheets_used) || 1,
      ink_used_estimate: Number(item.ink_used_estimate) || 0,
      unit_price: Number(item.sale_price) || 0,
      cost_price: Number(item.cost_price) || 0,
      subtotal: Number(item.sale_price * item.quantity) || 0
    }));

    try {
      const { error } = await supabase.from('print_logs').insert(logsToInsert);
      if (error) console.warn('No se pudo insertar en print_logs:', error);
    } catch (e) {
      console.warn('Error al guardar print_logs:', e);
    }
  },

  // Obtener resumen y métricas de consumo de una fecha específica
  async getDailySummary(dateString) {
    const selectedDate = dateString || new Date().toISOString().split('T')[0];
    const startISO = `${selectedDate}T00:00:00.000Z`;
    const endISO = `${selectedDate}T23:59:59.999Z`;

    let logs = [];
    try {
      const { data, error } = await supabase
        .from('print_logs')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (!error && data) {
        logs = data;
      }
    } catch (e) {
      console.warn('Error al consultar print_logs:', e);
    }

    let totalBnPrints = 0;
    let totalColorPrints = 0;
    let totalCopies = 0;
    let cartaSheetsUsed = 0;
    let legalSheetsUsed = 0;
    let inkConsumedMl = 0;
    let dailyRevenue = 0;
    let dailyCost = 0;

    logs.forEach(log => {
      const pages = Number(log.pages_count) || 0;
      const sheets = Number(log.sheets_used) || 0;
      const ink = Number(log.ink_used_estimate) || 0;
      const subtotal = Number(log.subtotal) || 0;
      const cost = Number(log.cost_price) * pages;

      dailyRevenue += subtotal;
      dailyCost += cost;
      inkConsumedMl += ink;

      if (log.paper_type === 'carta') {
        cartaSheetsUsed += sheets;
      } else if (log.paper_type === 'legal') {
        legalSheetsUsed += sheets;
      }

      if (log.service_type === 'print_bn') {
        totalBnPrints += pages;
      } else if (log.service_type === 'print_color') {
        totalColorPrints += pages;
      } else if (log.service_type === 'copy_bn' || log.service_type === 'copy_color') {
        totalCopies += pages;
      }
    });

    return {
      date: selectedDate,
      metrics: {
        totalBnPrints,
        totalColorPrints,
        totalCopies,
        cartaSheetsUsed,
        legalSheetsUsed,
        inkConsumedMl: Number(inkConsumedMl.toFixed(2)),
        dailyRevenue,
        dailyProfit: dailyRevenue - dailyCost
      },
      logs
    };
  }
};
