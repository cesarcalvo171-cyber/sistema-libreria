import { supabase } from '../lib/supabase';

export const expensesService = {
  // Obtener todos los gastos con filtros opcionales
  async getAll({ month = null, year = null, startDate = null, endDate = null } = {}) {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    } else if (month !== null && year !== null) {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      query = query.gte('expense_date', start).lte('expense_date', end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Registrar un gasto
  async create(expenseData) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          description: expenseData.description.trim(),
          amount: Number(expenseData.amount) || 0,
          category: expenseData.category || 'General',
          expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar gasto
  async update(id, expenseData) {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        description: expenseData.description.trim(),
        amount: Number(expenseData.amount) || 0,
        category: expenseData.category || 'General',
        expense_date: expenseData.expense_date
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar gasto
  async delete(id) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
