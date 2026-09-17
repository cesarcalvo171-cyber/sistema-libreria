import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'POS_CASH_MOVEMENTS';

export const cashService = {
  // Obtener todos los retiros y movimientos de caja
  async getAll({ date = null, month = null, year = null } = {}) {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (date) {
        query = query.eq('expense_date', date);
      } else if (month !== null && year !== null) {
        const start = new Date(year, month, 1).toISOString().split('T')[0];
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        query = query.gte('expense_date', start).lte('expense_date', end);
      }

      const { data, error } = await query;
      if (error) throw error;

      const localSettled = this.getSettledMap();

      return (data || []).map(exp => {
        const isSettledInDesc = (exp.description || '').includes('[SALDADO]');
        const isSettled = isSettledInDesc || Boolean(localSettled[exp.id]);
        const cleanDesc = (exp.description || '').replace('[SALDADO]', '').trim();

        return {
          ...exp,
          clean_description: cleanDesc,
          is_settled: isSettled,
          is_withdrawal: exp.category === 'Retiro / Caja Chica' || exp.category === 'Gasto Operativo' || (exp.description || '').toLowerCase().includes('retiro') || (exp.description || '').toLowerCase().includes('caja')
        };
      });
    } catch (e) {
      console.error('Error al obtener movimientos de caja:', e);
      return [];
    }
  },

  // Registrar un retiro de caja / gasto operativo
  async createWithdrawal({ description, amount, expense_date = null, category = 'Retiro / Caja Chica' }) {
    const dateStr = expense_date || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          description: description.trim(),
          amount: Number(amount) || 0,
          category: category || 'Retiro / Caja Chica',
          expense_date: dateStr
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marcar como saldado/repuesto o pendiente
  async toggleSettled(expenseId, currentDescription, makeSettled) {
    try {
      let newDescription = (currentDescription || '').replace('[SALDADO]', '').trim();
      if (makeSettled) {
        newDescription = `[SALDADO] ${newDescription}`;
      }

      const { data, error } = await supabase
        .from('expenses')
        .update({
          description: newDescription
        })
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      const map = this.getSettledMap();
      if (makeSettled) {
        map[expenseId] = true;
      } else {
        delete map[expenseId];
      }
      this.saveSettledMap(map);

      return data;
    } catch (e) {
      console.error('Error al cambiar estado de saldado:', e);
      throw e;
    }
  },

  // Eliminar movimiento
  async delete(expenseId) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
    const map = this.getSettledMap();
    delete map[expenseId];
    this.saveSettledMap(map);
    return true;
  },

  // Helpers de persistencia local para estados de saldado
  getSettledMap() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveSettledMap(map) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Error al guardar en localStorage:', e);
    }
  }
};
