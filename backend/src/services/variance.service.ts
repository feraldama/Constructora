import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS
// ============================================================================

export interface VarianceItem {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  // Presupuestado
  budgetedQty: number;
  costUnitPrice: number;
  saleUnitPrice: number;
  budgetedCost: number;       // costSubtotal
  budgetedSale: number;       // saleSubtotal
  // Comprometido (asignaciones)
  committedPrice: number;     // agreedPrice total de asignaciones
  // Ejecutado real
  paidAmount: number;         // pagos PAID vinculados al item
  pendingAmount: number;      // pagos PENDING/OVERDUE vinculados al item
  totalExecuted: number;      // paidAmount + linkedExpenses
  // Gastos vinculados
  linkedExpenses: number;     // gastos adicionales vinculados al item
  // Certificado
  certifiedAmount: number;    // monto certificado aprobado
  certifiedQty: number;       // cantidad certificada acumulada
  // Avance físico
  progressQty: number;        // cantidad medida de progress entries
  progressPercent: number;    // progressQty / budgetedQty * 100
  // Variación
  costVariance: number;       // budgetedCost - totalExecuted (positivo = ahorro)
  costVariancePercent: number;
  saleVariance: number;       // budgetedSale - committedPrice (positivo = ganancia extra)
  status: "under" | "on_track" | "over"; // bajo/en/sobre presupuesto
}

export interface CategoryVariance {
  categoryId: string;
  categoryName: string;
  budgetedCost: number;
  budgetedSale: number;
  committedPrice: number;
  paidAmount: number;
  pendingAmount: number;
  totalExecuted: number;
  certifiedAmount: number;
  costVariance: number;
  costVariancePercent: number;
  itemCount: number;
  overCount: number;
}

export interface VarianceAnalysisResult {
  // Totales del proyecto
  summary: {
    totalBudgetedCost: number;
    totalBudgetedSale: number;
    totalCommitted: number;
    totalPaid: number;
    totalPending: number;
    totalExecuted: number;
    totalCertified: number;
    costVariance: number;
    costVariancePercent: number;
    commitVariance: number;       // budgetedCost - committed
    commitVariancePercent: number;
    overBudgetItems: number;
    onTrackItems: number;
    underBudgetItems: number;
  };
  // Desglose por categoría
  categories: CategoryVariance[];
  // Detalle por partida
  items: VarianceItem[];
  generatedAt: string;
}

// ============================================================================
// ANÁLISIS DE VARIACIÓN — presupuesto vs ejecución real
// ============================================================================

export async function getVarianceAnalysis(
  projectId: string
): Promise<VarianceAnalysisResult> {
  // Query principal: budget items + pagos + asignaciones + certificados + progreso
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
    committed_price: string;
    paid_amount: string;
    pending_amount: string;
    certified_amount: string;
    certified_qty: string;
    progress_qty: string;
    linked_expenses: string;
  }[]>(
    `SELECT
      bi.id                AS item_id,
      bi.name              AS item_name,
      c.id                 AS category_id,
      c.name               AS category_name,
      bi.unit,
      bi.quantity,
      bi.cost_unit_price,
      bi.sale_unit_price,
      bi.cost_subtotal,
      bi.sale_subtotal,

      -- Comprometido: suma de precios acordados en asignaciones
      COALESCE((
        SELECT SUM(ca.agreed_price)
        FROM contractor_assignments ca
        WHERE ca.budget_item_id = bi.id
      ), 0) AS committed_price,

      -- Pagos PAID vinculados al item
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.budget_item_id = bi.id AND p.status = 'PAID'
      ), 0) AS paid_amount,

      -- Pagos PENDING/OVERDUE vinculados al item
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.budget_item_id = bi.id AND p.status IN ('PENDING', 'OVERDUE')
      ), 0) AS pending_amount,

      -- Monto certificado aprobado
      COALESCE((
        SELECT SUM(ci.amount)
        FROM certificate_items ci
        INNER JOIN certificates cert ON cert.id = ci.certificate_id
        WHERE ci.budget_item_id = bi.id AND cert.status = 'APPROVED'
      ), 0) AS certified_amount,

      -- Cantidad certificada acumulada
      COALESCE((
        SELECT SUM(ci.accumulated_quantity)
        FROM certificate_items ci
        INNER JOIN certificates cert ON cert.id = ci.certificate_id
        WHERE ci.budget_item_id = bi.id AND cert.status = 'APPROVED'
      ), 0) AS certified_qty,

      -- Avance físico medido
      COALESCE((
        SELECT SUM(pe.quantity)
        FROM progress_entries pe
        WHERE pe.budget_item_id = bi.id
      ), 0) AS progress_qty,

      -- Gastos adicionales vinculados al item
      COALESCE((
        SELECT SUM(ex.amount)
        FROM project_expenses ex
        WHERE ex.budget_item_id = bi.id
      ), 0) AS linked_expenses

    FROM budget_items bi
    INNER JOIN categories c ON c.id = bi.category_id
    WHERE c.project_id = $1
    ORDER BY c.sort_order, bi.sort_order`,
    projectId
  );

  const n = (v: string) => Number(v ?? 0);

  // Mapear items
  const items: VarianceItem[] = rows.map((r) => {
    const budgetedQty = n(r.quantity);
    const budgetedCost = n(r.cost_subtotal);
    const budgetedSale = n(r.sale_subtotal);
    const committedPrice = n(r.committed_price);
    const paidAmount = n(r.paid_amount);
    const pendingAmount = n(r.pending_amount);
    const linkedExpenses = n(r.linked_expenses);
    const totalExecuted = paidAmount + linkedExpenses;
    const certifiedAmount = n(r.certified_amount);
    const certifiedQty = n(r.certified_qty);
    const progressQty = n(r.progress_qty);

    const costVariance = budgetedCost - totalExecuted;
    const costVariancePercent =
      budgetedCost > 0
        ? Math.round((costVariance / budgetedCost) * 10000) / 100
        : 0;
    const saleVariance = budgetedSale - committedPrice;

    // Determinar estado: >5% ahorro = under, >-5% sobrecosto = over
    let status: "under" | "on_track" | "over" = "on_track";
    if (budgetedCost > 0) {
      if (totalExecuted > budgetedCost * 1.05) status = "over";
      else if (totalExecuted < budgetedCost * 0.95 && totalExecuted > 0) status = "under";
    }

    return {
      itemId: r.item_id,
      itemName: r.item_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      unit: r.unit,
      budgetedQty,
      costUnitPrice: n(r.cost_unit_price),
      saleUnitPrice: n(r.sale_unit_price),
      budgetedCost,
      budgetedSale,
      committedPrice,
      paidAmount,
      pendingAmount,
      totalExecuted,
      linkedExpenses,
      certifiedAmount,
      certifiedQty,
      progressQty,
      progressPercent:
        budgetedQty > 0
          ? Math.round((progressQty / budgetedQty) * 10000) / 100
          : 0,
      costVariance,
      costVariancePercent,
      saleVariance,
      status,
    };
  });

  // Agrupar por categoría
  const catMap = new Map<string, CategoryVariance>();
  for (const item of items) {
    let cat = catMap.get(item.categoryId);
    if (!cat) {
      cat = {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        budgetedCost: 0,
        budgetedSale: 0,
        committedPrice: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalExecuted: 0,
        certifiedAmount: 0,
        costVariance: 0,
        costVariancePercent: 0,
        itemCount: 0,
        overCount: 0,
      };
      catMap.set(item.categoryId, cat);
    }
    cat.budgetedCost += item.budgetedCost;
    cat.budgetedSale += item.budgetedSale;
    cat.committedPrice += item.committedPrice;
    cat.paidAmount += item.paidAmount;
    cat.pendingAmount += item.pendingAmount;
    cat.totalExecuted += item.totalExecuted;
    cat.certifiedAmount += item.certifiedAmount;
    cat.itemCount++;
    if (item.status === "over") cat.overCount++;
  }

  const categories = Array.from(catMap.values()).map((cat) => ({
    ...cat,
    costVariance: cat.budgetedCost - cat.totalExecuted,
    costVariancePercent:
      cat.budgetedCost > 0
        ? Math.round(((cat.budgetedCost - cat.totalExecuted) / cat.budgetedCost) * 10000) / 100
        : 0,
  }));

  // Totales
  const totalBudgetedCost = items.reduce((s, i) => s + i.budgetedCost, 0);
  const totalBudgetedSale = items.reduce((s, i) => s + i.budgetedSale, 0);
  const totalCommitted = items.reduce((s, i) => s + i.committedPrice, 0);
  const totalPaid = items.reduce((s, i) => s + i.paidAmount, 0);
  const totalPending = items.reduce((s, i) => s + i.pendingAmount, 0);
  const totalExecuted = items.reduce((s, i) => s + i.totalExecuted, 0);
  const totalCertified = items.reduce((s, i) => s + i.certifiedAmount, 0);
  const costVariance = totalBudgetedCost - totalExecuted;
  const commitVariance = totalBudgetedCost - totalCommitted;

  return {
    summary: {
      totalBudgetedCost,
      totalBudgetedSale,
      totalCommitted,
      totalPaid,
      totalPending,
      totalExecuted,
      totalCertified,
      costVariance,
      costVariancePercent:
        totalBudgetedCost > 0
          ? Math.round((costVariance / totalBudgetedCost) * 10000) / 100
          : 0,
      commitVariance,
      commitVariancePercent:
        totalBudgetedCost > 0
          ? Math.round((commitVariance / totalBudgetedCost) * 10000) / 100
          : 0,
      overBudgetItems: items.filter((i) => i.status === "over").length,
      onTrackItems: items.filter((i) => i.status === "on_track").length,
      underBudgetItems: items.filter((i) => i.status === "under").length,
    },
    categories,
    items,
    generatedAt: new Date().toISOString(),
  };
}
