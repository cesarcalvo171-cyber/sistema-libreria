import { supabase } from '../lib/supabase';

// Tarifas Oficiales en Córdobas (C$)
export const defaultPrintRates = [
  { service_type: 'copy_cedula', paper_type: 'carta', name: 'Copia de Cédula (Ambos Lados)', sale_price: 4.00, cost_price: 0.80, estimated_ink_ml: 0.050 },
  { service_type: 'print_opalina', paper_type: 'carta', name: 'Impresión Opalina Color', sale_price: 15.00, cost_price: 3.52, estimated_ink_ml: 0.180 },
  { service_type: 'photo_13x9', paper_type: 'foto', name: 'Foto 12.8 x 9.1 cm', sale_price: 15.00, cost_price: 4.35, estimated_ink_ml: 0.150 },
  { service_type: 'photo_18x13', paper_type: 'foto', name: 'Foto 18.2 x 12.8 cm', sale_price: 25.00, cost_price: 4.35, estimated_ink_ml: 0.250 },
  { service_type: 'photo_21x15', paper_type: 'foto', name: 'Foto 21 x 14.8 cm (Media Carta)', sale_price: 30.00, cost_price: 4.35, estimated_ink_ml: 0.350 },
  { service_type: 'photo_carta', paper_type: 'foto', name: 'Foto Tamaño Carta Completa', sale_price: 40.00, cost_price: 4.35, estimated_ink_ml: 0.500 },
  { service_type: 'print_bn', paper_type: 'carta', name: 'Impresión B/N Carta', sale_price: 4.00, cost_price: 0.50, estimated_ink_ml: 0.050 },
  { service_type: 'print_bn', paper_type: 'legal', name: 'Impresión B/N Legal', sale_price: 5.00, cost_price: 0.75, estimated_ink_ml: 0.060 },
  { service_type: 'print_color', paper_type: 'carta', name: 'Impresión Color Carta', sale_price: 8.00, cost_price: 1.50, estimated_ink_ml: 0.150 },
  { service_type: 'print_color', paper_type: 'legal', name: 'Impresión Color Legal', sale_price: 10.00, cost_price: 2.00, estimated_ink_ml: 0.180 },
  { service_type: 'copy_bn', paper_type: 'carta', name: 'Copia B/N Carta', sale_price: 4.00, cost_price: 0.30, estimated_ink_ml: 0.040 },
  { service_type: 'copy_bn', paper_type: 'legal', name: 'Copia B/N Legal', sale_price: 3.00, cost_price: 0.50, estimated_ink_ml: 0.050 },
  { service_type: 'copy_color', paper_type: 'carta', name: 'Copia Color Carta', sale_price: 4.00, cost_price: 1.20, estimated_ink_ml: 0.120 },
  { service_type: 'copy_color', paper_type: 'legal', name: 'Copia Color Legal', sale_price: 3.00, cost_price: 1.50, estimated_ink_ml: 0.150 }
];

export const printService = {
  // Obtener tarifas configuradas
  async getRates() {
    try {
      localStorage.removeItem('POS_PRINT_RATES');

      const { data, error } = await supabase
        .from('print_rates')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        // Si falta alguna tarifa predeterminada, agregarla
        const hasCedula = data.some(r => r.service_type === 'copy_cedula');
        const hasOpalina = data.some(r => r.service_type === 'print_opalina');
        const hasPhotos = data.some(r => r.service_type === 'photo_13x9');
        if (!hasCedula || !hasOpalina || !hasPhotos) {
          await this.syncOfficialRates(data);
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
          // Mantener si ya existe
        } else {
          await supabase.from('print_rates').insert([def]);
        }
      }
    } catch (e) {
      console.warn('Error durante sincronización de tarifas:', e);
    }
  },

  // Crear nueva tarifa personalizada
  async createRate(rateData) {
    try {
      const { data, error } = await supabase
        .from('print_rates')
        .insert([{
          name: rateData.name,
          service_type: rateData.service_type || `custom_${Date.now()}`,
          paper_type: rateData.paper_type || 'carta',
          sale_price: Number(rateData.sale_price) || 0,
          cost_price: Number(rateData.cost_price) || 0,
          estimated_ink_ml: Number(rateData.estimated_ink_ml) || 0.05
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error al crear tarifa:', e);
      throw e;
    }
  },

  // Guardar / Actualizar tarifa individual
  async updateRate(id, rateData) {
    try {
      const { data, error } = await supabase
        .from('print_rates')
        .update({
          name: rateData.name,
          service_type: rateData.service_type,
          paper_type: rateData.paper_type,
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

  // Eliminar tarifa personalizada
  async deleteRate(id) {
    try {
      const { error } = await supabase
        .from('print_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error al eliminar tarifa:', e);
      throw e;
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
      pages_count: Number(item.pages_count) || Number(item.quantity) || 1,
      sheets_used: Number(item.sheets_used) || Number(item.pages_count) || Number(item.quantity) || 1,
      ink_used_estimate: Number(item.ink_used_estimate) || 0,
      unit_price: Number(item.sale_price) || 0,
      cost_price: Number(item.cost_price) || 0,
      subtotal: Number(item.sale_price * (item.quantity || 1)) || 0
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
    let totalPhotos = 0;
    let cartaSheetsUsed = 0;
    let legalSheetsUsed = 0;
    let opalinaSheetsUsed = 0;
    let fotoSheetsUsed = 0;
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

      const sType = log.service_type || '';
      const isFoto = sType.startsWith('photo_') || log.paper_type === 'foto';

      if (isFoto) {
        fotoSheetsUsed += sheets;
        totalPhotos += pages;
      } else if (sType === 'print_opalina') {
        opalinaSheetsUsed += sheets;
        totalColorPrints += pages;
      } else if (log.paper_type === 'carta') {
        cartaSheetsUsed += sheets;
      } else if (log.paper_type === 'legal') {
        legalSheetsUsed += sheets;
      }

      if (sType === 'print_bn') {
        totalBnPrints += pages;
      } else if (sType === 'print_color') {
        totalColorPrints += pages;
      } else if (sType === 'copy_bn' || sType === 'copy_color' || sType === 'copy_cedula') {
        totalCopies += pages;
      }
    });

    return {
      date: selectedDate,
      metrics: {
        totalBnPrints,
        totalColorPrints,
        totalCopies,
        totalPhotos,
        cartaSheetsUsed,
        legalSheetsUsed,
        opalinaSheetsUsed,
        fotoSheetsUsed,
        inkConsumedMl: Number(inkConsumedMl.toFixed(2)),
        dailyRevenue,
        dailyProfit: dailyRevenue - dailyCost
      },
      logs
    };
  }
};
