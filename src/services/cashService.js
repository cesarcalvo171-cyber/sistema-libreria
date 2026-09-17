import { getLocalDateString } from '../lib/formatters';

const STORAGE_KEY = 'POS_CASH_DRAWER_TRANSACTIONS_V1';

// Movimientos iniciales registrados hoy
const INITIAL_MOVEMENTS = [
  {
    id: 'w-1',
    description: 'Compra de poroplas',
    clean_description: 'Compra de poroplas',
    amount: 300,
    category: 'Gasto Operativo',
    expense_date: '2026-09-16',
    created_at: new Date().toISOString(),
    is_settled: false
  },
  {
    id: 'w-2',
    description: 'Prestamo a muro',
    clean_description: 'Prestamo a muro',
    amount: 409,
    category: 'Gasto Operativo',
    expense_date: '2026-09-16',
    created_at: new Date().toISOString(),
    is_settled: false
  },
  {
    id: 'w-3',
    description: 'gastos de rosas eternas',
    clean_description: 'gastos de rosas eternas',
    amount: 447,
    category: 'Gasto Operativo',
    expense_date: '2026-09-16',
    created_at: new Date().toISOString(),
    is_settled: false
  },
  {
    id: 'w-4',
    description: 'cinta color perlas',
    clean_description: 'cinta color perlas',
    amount: 110,
    category: 'Gasto Operativo',
    expense_date: '2026-09-16',
    created_at: new Date().toISOString(),
    is_settled: false
  },
  {
    id: 'w-5',
    description: 'Libro de acta',
    clean_description: 'Libro de acta',
    amount: 120,
    category: 'Gasto Operativo',
    expense_date: '2026-09-16',
    created_at: new Date().toISOString(),
    is_settled: false
  }
];

export const cashService = {
  // Obtener la lista de movimientos guardados
  _getStoredList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOVEMENTS));
        return INITIAL_MOVEMENTS;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error al leer storage de caja:', e);
      return [];
    }
  },

  _saveList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error al guardar storage de caja:', e);
    }
  },

  // Obtener retiros / gastos sobre caja con filtros (Día o Mes)
  async getAll({ date = null, month = null, year = null } = {}) {
    const list = this._getStoredList();

    return list.filter(item => {
      const itemDate = item.expense_date || (item.created_at ? getLocalDateString(item.created_at) : '');
      if (date) {
        return itemDate === date;
      }
      if (month !== null && year !== null) {
        const dObj = new Date(itemDate || item.created_at);
        return dObj.getMonth() === month && dObj.getFullYear() === year;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at || b.expense_date) - new Date(a.created_at || a.expense_date));
  },

  // Registrar un nuevo retiro / salida de dinero de caja
  async createWithdrawal({ description, amount, expense_date = null, category = 'Gasto Operativo' }) {
    const list = this._getStoredList();
    const dateStr = expense_date || getLocalDateString();
    
    const newItem = {
      id: 'cash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      description: description.trim(),
      clean_description: description.trim(),
      amount: Number(amount) || 0,
      category: category || 'Gasto Operativo',
      expense_date: dateStr,
      created_at: new Date().toISOString(),
      is_settled: false
    };

    list.unshift(newItem);
    this._saveList(list);
    return newItem;
  },

  // Marcar como saldado / repuesto o pendiente
  async toggleSettled(id, currentDescription, makeSettled) {
    const list = this._getStoredList();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx].is_settled = makeSettled;
      this._saveList(list);
      return list[idx];
    }
    return null;
  },

  // Eliminar un movimiento de caja
  async delete(id) {
    const list = this._getStoredList();
    const updated = list.filter(item => item.id !== id);
    this._saveList(updated);
    return true;
  }
};

