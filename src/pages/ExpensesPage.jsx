import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  X,
  Tag,
  TrendingDown
} from 'lucide-react';
import { expensesService } from '../services/expensesService';
import { formatCurrency, formatDate, getMonthName } from '../lib/formatters';
import { toast } from 'sonner';

const defaultCategories = [
  'Insumos & Operación',
  'Alquiler / Local',
  'Servicios (Luz/Agua/Internet)',
  'Salarios / Personal',
  'Transporte & Envíos',
  'Mantenimiento',
  'Otros / Varios'
];

export const ExpensesPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Insumos & Operación',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expensesService.getAll({
        month: selectedMonth,
        year: selectedYear
      });
      setExpenses(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar gastos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth, selectedYear]);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.category && e.category.toLowerCase().includes(q))
    );
  }, [expenses, searchQuery]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category || 'General',
        expense_date: expense.expense_date
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        description: '',
        amount: '',
        category: 'Insumos & Operación',
        expense_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description.trim()) {
      toast.warning('Ingresa la descripción del gasto');
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.warning('Ingresa un monto válido');
      return;
    }

    try {
      if (editingExpense) {
        await expensesService.update(editingExpense.id, expenseForm);
        toast.success('Gasto actualizado');
      } else {
        await expensesService.create(expenseForm);
        toast.success('Gasto registrado exitosamente');
      }
      setIsModalOpen(false);
      await loadExpenses();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar: ' + (err.message || ''));
    }
  };

  const handleDeleteExpense = async (id, desc) => {
    if (window.confirm(`¿Eliminar el gasto "${desc}"?`)) {
      try {
        await expensesService.delete(id);
        toast.success('Gasto eliminado');
        await loadExpenses();
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar');
      }
    }
  };

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-700" />
            Registro de Gastos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Egresos que impactan directamente el balance de Ganancia Neta
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-700/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Registrar Gasto</span>
          <span className="sm:hidden">Gasto</span>
        </button>
      </div>

      {/* Resumen y Selector Móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 block">
              Total Gastos ({getMonthName(selectedMonth)})
            </span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-[11px] text-slate-500">{filteredExpenses.length} egresos</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {getMonthName(i)}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 px-1 py-0.5 border-l border-slate-200 focus:outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-700 text-white rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-950 block">Deducción Automática</span>
            <p className="text-[11px] text-blue-800 mt-0.5">
              Cada gasto resta de forma automática de las ganancias en el módulo de Finanzas.
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar gasto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Lista Mobile Cards & Desktop Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Cargando gastos...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No hay gastos registrados en este periodo.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {exp.description}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                    {exp.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(exp.expense_date)}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-base sm:text-lg text-rose-600 font-mono">
                  {formatCurrency(exp.amount)}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(exp)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(exp.id, exp.description)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Registrar / Editar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-200" />
                {editingExpense ? 'Editar Gasto' : 'Registrar Gasto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Concepto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Recibo de luz, Alquiler local, etc."
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto (C$) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-rose-600 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, expense_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoría
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  {defaultCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-700/20 transition"
                >
                  {editingExpense ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
