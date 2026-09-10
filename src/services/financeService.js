import { supabase } from '../lib/supabase';

export const financeService = {
  // Obtener balance y métricas financieras para un mes y año específicos
  async getMonthlySummary(month, year) {
    // 1. Obtener rango de fechas en UTC/ISO
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const startDay = startDate.toISOString().split('T')[0];
    const endDay = endDate.toISOString().split('T')[0];

    // 2. Inversión total actual en inventario
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('cost_price, sale_price, stock')
      .eq('is_active', true);

    if (prodErr) throw prodErr;

    const totalInventoryCost = (products || []).reduce(
      (sum, p) => sum + (Number(p.cost_price) * Number(p.stock)),
      0
    );

    const totalInventorySaleValue = (products || []).reduce(
      (sum, p) => sum + (Number(p.sale_price) * Number(p.stock)),
      0
    );

    const totalStockUnits = (products || []).reduce(
      (sum, p) => sum + Number(p.stock),
      0
    );

    // 3. Ventas completadas del periodo
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at,
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
      .eq('status', 'completed')
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    if (salesErr) throw salesErr;

    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalItemsSold = 0;

    // Desglose por Línea de Negocio: Librería vs Impresiones
    let libraryRevenue = 0;
    let libraryCost = 0;
    let libraryItemsCount = 0;

    let printRevenue = 0;
    let printCost = 0;
    let printItemsCount = 0;

    (sales || []).forEach(sale => {
      totalRevenue += Number(sale.total) || 0;
      (sale.sale_items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.cost_price) || 0;
        const subtotal = Number(item.subtotal) || (qty * Number(item.unit_price) || 0);
        const itemCostTotal = (qty * cost);

        totalCostOfGoodsSold += itemCostTotal;
        totalItemsSold += qty;

        const name = (item.product_name || '').toLowerCase();
        const isPrint =
          item.item_type === 'print_service' ||
          (!item.product_id && item.metadata?.service_type) ||
          name.includes('impresion') ||
          name.includes('impresión') ||
          name.includes('copia') ||
          name.includes('cedula') ||
          name.includes('cédula') ||
          name.includes('escaner') ||
          name.includes('escaneo') ||
          name.includes('plastificado') ||
          name.includes('laminado');

        if (isPrint) {
          printRevenue += subtotal;
          printCost += itemCostTotal;
          printItemsCount += qty;
        } else {
          libraryRevenue += subtotal;
          libraryCost += itemCostTotal;
          libraryItemsCount += qty;
        }
      });
    });

    // 4. Gastos del periodo
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('amount, category')
      .gte('expense_date', startDay)
      .lte('expense_date', endDay);

    if (expErr) throw expErr;

    const totalExpenses = (expenses || []).reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    // Agrupar gastos por categoría
    const expensesByCategory = (expenses || []).reduce((acc, curr) => {
      const cat = curr.category || 'Otros';
      acc[cat] = (acc[cat] || 0) + Number(curr.amount);
      return acc;
    }, {});

    // 5. Cálculos de rentabilidad
    const grossProfit = totalRevenue - totalCostOfGoodsSold; // Ganancia Bruta (Ventas - Costo productos)
    const netProfit = grossProfit - totalExpenses; // Ganancia Neta (Ganancia Bruta - Gastos)
    const profitMarginPercentage = totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100)
      : 0;

    // Ganancias y Márgenes por Línea
    const libraryGrossProfit = libraryRevenue - libraryCost;
    const libraryMarginPercentage = libraryRevenue > 0
      ? ((libraryGrossProfit / libraryRevenue) * 100)
      : 0;

    const printGrossProfit = printRevenue - printCost;
    const printMarginPercentage = printRevenue > 0
      ? ((printGrossProfit / printRevenue) * 100)
      : 0;

    return {
      period: { month, year },
      inventory: {
        totalCost: totalInventoryCost,
        totalSaleValue: totalInventorySaleValue,
        totalUnits: totalStockUnits,
        potentialProfit: totalInventorySaleValue - totalInventoryCost
      },
      sales: {
        totalRevenue,
        totalSalesCount: (sales || []).length,
        totalCostOfGoodsSold,
        totalItemsSold,
        grossProfit
      },
      breakdown: {
        library: {
          revenue: libraryRevenue,
          cost: libraryCost,
          grossProfit: libraryGrossProfit,
          marginPercentage: Number(libraryMarginPercentage.toFixed(1)),
          itemsCount: libraryItemsCount,
          sharePercentage: totalRevenue > 0 ? Number(((libraryRevenue / totalRevenue) * 100).toFixed(1)) : 0
        },
        printing: {
          revenue: printRevenue,
          cost: printCost,
          grossProfit: printGrossProfit,
          marginPercentage: Number(printMarginPercentage.toFixed(1)),
          itemsCount: printItemsCount,
          sharePercentage: totalRevenue > 0 ? Number(((printRevenue / totalRevenue) * 100).toFixed(1)) : 0
        }
      },
      expenses: {
        totalExpenses,
        expensesCount: (expenses || []).length,
        byCategory: expensesByCategory
      },
      profitability: {
        grossProfit,
        netProfit,
        profitMarginPercentage: Number(profitMarginPercentage.toFixed(2))
      }
    };
  }
};
