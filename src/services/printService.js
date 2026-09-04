import { supabase } from '../lib/supabase';

// Tarifas por defecto si Supabase aún no tiene la tabla o no está conectada
export const defaultPrintRates = [
  { id: '1', service_type: 'print_bn', paper_type: 'carta', name: 'Impresión B/N Carta', sale_price: 2.00, cost_price: 0.50, estimated_ink_ml: 0.050 },
  { id: '2', service_type: 'print_bn', paper_type: 'legal', name: 'Impresión B/N Legal / Oficio', sale_price: 3.00, cost_price: 0.75, estimated_ink_ml: 0.060 },
  { id: '3', service_type: 'print_color', paper_type: 'carta', name: 'Impresión Color Carta', sale_price: 5.00, cost_price: 1.50, estimated_ink_ml: 0.150 },
  { id: '4', service_type: 'print_color', paper_type: 'legal', name: 'Impresión Color Legal / Oficio', sale_price: 7.00, cost_price: 2.00, estimated_ink_ml: 0.180 },
  { id: '5', service_type: 'copy_bn', paper_type: 'carta', name: 'Copia B/N Carta', sale_price: 1.00, cost_price: 0.30, estimated_ink_ml: 0.040 },
  { id: '6', service_type: 'copy_bn', paper_type: 'legal', name: 'Copia B/N Legal / Oficio', sale_price: 1.50, cost_price: 0.50, estimated_ink_ml: 0.050 },
  { id: '7', service_type: 'copy_color', paper_type: 'carta', name: 'Copia Color Carta', sale_price: 4.00, cost_price: 1.20, estimated_ink_ml: 0.120 },
  { id: '8', service_type: 'copy_color', paper_type: 'legal', name: 'Copia Color Legal / Oficio', sale_price: 5.00, cost_price: 1.50, estimated_ink_ml: 0.150 }
];

export const printService = {
  // Obtener tarifas configuradas
  async getRates() {
    try {
      const { data, error } = await supabase
        .from('print_rates')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback a localStorage o default
        const local = localStorage.getItem('POS_PRINT_RATES');
        if (local) return JSON.parse(local);
        return defaultPrintRates;
      }
      return data;
    } catch (e) {
      const local = localStorage.getItem('POS_PRINT_RATES');
      if (local) return JSON.parse(local);
      return defaultPrintRates;
    }
  },

  // Guardar / Actualizar tarifa
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
      // Fallback a localStorage
      const currentRates = await this.getRates();
      const updated = currentRates.map(r => r.id === id ? { ...r, ...rateData } : r);
      localStorage.setItem('POS_PRINT_RATES', JSON.stringify(updated));
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

  // Obtener resumen y métricas de consumo de una fecha específica (ej. '2026-09-04')
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

    // Calcular las 7 métricas solicitadas
    let totalBnPrints = 0;       // Total impresiones B/N
    let totalColorPrints = 0;    // Total impresiones color
    let totalCopies = 0;         // Copias (B/N + Color)
    let cartaSheetsUsed = 0;     // Hojas carta utilizadas
    let legalSheetsUsed = 0;     // Hojas legal utilizadas
    let inkConsumedMl = 0;       // Tinta consumida estimada en ml
    let dailyRevenue = 0;        // Ingresos diarios por impresiones
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

      // Hojas según tipo de papel
      if (log.paper_type === 'carta') {
        cartaSheetsUsed += sheets;
      } else if (log.paper_type === 'legal') {
        legalSheetsUsed += sheets;
      }

      // Conteo por tipo de servicio
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
        totalBnPrints,         // 1. Total impresiones B/N
        totalColorPrints,      // 2. Total impresiones color
        totalCopies,           // 3. Copias
        cartaSheetsUsed,       // 4. Hojas carta utilizadas
        legalSheetsUsed,       // 5. Hojas legal utilizadas
        inkConsumedMl: Number(inkConsumedMl.toFixed(2)), // 6. Tinta consumida (ml)
        dailyRevenue,          // 7. Ingresos diarios
        dailyProfit: dailyRevenue - dailyCost
      },
      logs
    };
  }
};
