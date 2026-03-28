import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS
// ============================================================================

export interface ItemFinancial {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  quantity: number;
  costUnitPrice: number;
  saleUnitPrice: number;
  costSubtotal: number;
  saleSubtotal: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  // Ingresos
  totalRevenue: number;       // Suma de sale_subtotals
  // Costos
  totalCostItems: number;     // Suma de cost_subtotals (costo estimado de partidas)
  totalExpenses: number;      // Gastos adicionales registrados
  totalCost: number;          // totalCostItems + totalExpenses
  // Ejecución real
  totalPaid: number;          // Pagos PAID a contratistas
  totalPending: number;       // Pagos PENDING + OVERDUE
  totalExecuted: number;      // totalPaid + totalExpenses (costo real ejecutado)
  // Márgenes
  grossProfit: number;        // totalRevenue - totalCost
  profitMargin: number;       // (grossProfit / totalRevenue) * 100
  // Comparativa presupuesto vs ejecución
  costVariance: number;       // totalCostItems - totalExecuted (positivo = bajo presupuesto)
  costVariancePercent: number;
  // Desglose por tipo de gasto
  expensesByType: { expenseType: string; total: number; count: number }[];
  // Partidas con mayor rentabilidad
  topItems: ItemFinancial[];
  // Partidas con menor/negativa rentabilidad
  riskItems: ItemFinancial[];
}

// ============================================================================
// RESUMEN FINANCIERO POR PROYECTO — 3 queries en paralelo
// ============================================================================

export async function getProjectFinancialSummary(
  projectId: string
): Promise<ProjectFinancialSummary> {
  const sql = `
    SELECT
      -- Ingresos y costos de partidas
      COALESCE(SUM(bi.sale_subtotal), 0)    AS total_revenue,
      COALESCE(SUM(bi.cost_subtotal), 0)    AS total_cost_items,

      -- Pagos por estado (un solo scan de payments)
      COALESCE(SUM(CASE WHEN p.status = 'PAID'    THEN p.amount END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN p.status IN ('PENDING','OVERDUE') THEN p.amount END), 0) AS total_pending,

      -- Gastos adicionales
      (
        SELECT COALESCE(SUM(e.amount), 0)
        FROM project_expenses e
        WHERE e.project_id = $1
      ) AS total_expenses

    FROM categories c
    LEFT JOIN budget_items bi ON bi.category_id = c.id
    LEFT JOIN payments p ON p.project_id = $1
    WHERE c.project_id = $1
  `;

  const [rawRows, itemsRaw, expensesByTypeRaw] = await Promise.all([
    // 1. Totales numéricos
    prisma.$queryRawUnsafe<{
      total_revenue: string;
      total_cost_items: string;
      total_paid: string;
      total_pending: string;
      total_expenses: string;
    }[]>(sql, projectId),

    // 2. Detalle por partida (para top/risk items)
    prisma.$queryRawUnsafe<{
      item_id: string;
      item_name: string;
      category_id: string;
      category_name: string;
      unit: string;
      quantity: string;
      cost_unit_price: string;
      sale_unit_price: string;
      cost_subtotal: string;
      sale_subtotal: string;
    }[]>(
      `SELECT
        bi.id AS item_id,
        bi.name AS item_name,
        c.id AS category_id,
        c.name AS category_name,
        bi.unit,
        bi.quantity,
        bi.cost_unit_price,
        bi.sale_unit_price,
        bi.cost_subtotal,
        bi.sale_subtotal
      FROM budget_items bi
      INNER JOIN categories c ON c.id = bi.category_id
      WHERE c.project_id = $1
      ORDER BY c.sort_order, bi.sort_order`,
      projectId
    ),

    // 3. Gastos agrupados por tipo
    prisma.projectExpense.groupBy({
      by: ["expenseType"],
      where: { projectId },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const row = rawRows[0] ?? {
    total_revenue: "0",
    total_cost_items: "0",
    total_paid: "0",
    total_pending: "0",
    total_expenses: "0",
  };

  const n = (v: string) => Number(v ?? 0);

  const totalRevenue = n(row.total_revenue);
  const totalCostItems = n(row.total_cost_items);
  const totalExpenses = n(row.total_expenses);
  const totalPaid = n(row.total_paid);
  const totalPending = n(row.total_pending);
  const totalCost = totalCostItems + totalExpenses;
  const totalExecuted = totalPaid + totalExpenses;
  const grossProfit = totalRevenue - totalCost;
  const profitMargin =
    totalRevenue > 0
      ? Math.round((grossProfit / totalRevenue) * 10000) / 100
      : 0;
  const costVariance = totalCostItems - totalExecuted;
  const costVariancePercent =
    totalCostItems > 0
      ? Math.round((costVariance / totalCostItems) * 10000) / 100
      : 0;

  // Mapear partidas con métricas financieras
  const items: ItemFinancial[] = itemsRaw.map((r) => {
    const costSubtotal = n(r.cost_subtotal);
    const saleSubtotal = n(r.sale_subtotal);
    const gp = saleSubtotal - costSubtotal;
    return {
      itemId: r.item_id,
      itemName: r.item_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      unit: r.unit,
      quantity: n(r.quantity),
      costUnitPrice: n(r.cost_unit_price),
      saleUnitPrice: n(r.sale_unit_price),
      costSubtotal,
      saleSubtotal,
      grossProfit: gp,
      marginPercent:
        saleSubtotal > 0
          ? Math.round((gp / saleSubtotal) * 10000) / 100
          : 0,
    };
  });

  // Top 5 más rentables (mayor margen %)
  const topItems = [...items]
    .filter((i) => i.saleSubtotal > 0)
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 5);

  // Items con margen negativo o menor a 10%
  const riskItems = items
    .filter((i) => i.marginPercent < 10)
    .sort((a, b) => a.marginPercent - b.marginPercent)
    .slice(0, 5);

  return {
    projectId,
    totalRevenue,
    totalCostItems,
    totalExpenses,
    totalCost,
    totalPaid,
    totalPending,
    totalExecuted,
    grossProfit,
    profitMargin,
    costVariance,
    costVariancePercent,
    expensesByType: expensesByTypeRaw.map((e) => ({
      expenseType: e.expenseType,
      total: Number(e._sum.amount ?? 0),
      count: e._count.id,
    })),
    topItems,
    riskItems,
  };
}

// ============================================================================
// GANANCIA POR PARTIDA — para tabla de presupuesto con columna de margen
// ============================================================================

export async function getItemsFinancial(projectId: string): Promise<ItemFinancial[]> {
  const rows = await prisma.$queryRawUnsafe<{
    item_id: string;
    item_name: string;
    category_id: string;
    category_name: string;
    unit: string;
    quantity: string;
    cost_unit_price: string;
    sale_unit_price: string;
    cost_subtotal: string;
    sale_subtotal: string;
  }[]>(
    `SELECT
      bi.id AS item_id,
      bi.name AS item_name,
      c.id AS category_id,
      c.name AS category_name,
      bi.unit,
      bi.quantity,
      bi.cost_unit_price,
      bi.sale_unit_price,
      bi.cost_subtotal,
      bi.sale_subtotal
    FROM budget_items bi
    INNER JOIN categories c ON c.id = bi.category_id
    WHERE c.project_id = $1
    ORDER BY c.sort_order, bi.sort_order`,
    projectId
  );

  return rows.map((r) => {
    const costSubtotal = Number(r.cost_subtotal);
    const saleSubtotal = Number(r.sale_subtotal);
    const gp = saleSubtotal - costSubtotal;
    return {
      itemId: r.item_id,
      itemName: r.item_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      unit: r.unit,
      quantity: Number(r.quantity),
      costUnitPrice: Number(r.cost_unit_price),
      saleUnitPrice: Number(r.sale_unit_price),
      costSubtotal,
      saleSubtotal,
      grossProfit: gp,
      marginPercent:
        saleSubtotal > 0
          ? Math.round((gp / saleSubtotal) * 10000) / 100
          : 0,
    };
  });
}
