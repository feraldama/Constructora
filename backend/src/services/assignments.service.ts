import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS
// ============================================================================

export interface AssignmentFinancials {
  // ── Cantidades ──────────────────────────────────────────────────────────
  assignedQuantity: number;
  // ── Precios ─────────────────────────────────────────────────────────────
  agreedPrice: number;         // Total acordado (almacenado directamente)
  impliedUnitPrice: number;    // agreedPrice / assignedQuantity — derivado, informativo
  // ── Estado de pagos ─────────────────────────────────────────────────────
  paid: number;                // Suma de pagos PAID
  pending: number;             // Suma de pagos PENDING
  overdue: number;             // Suma de pagos OVERDUE
  committed: number;           // paid + pending + overdue (compromiso total)
  remaining: number;           // agreedPrice - committed (lo que aún se puede pagar)
  cancelled: number;           // Suma de pagos CANCELLED (informativo, no bloquea)
  // ── Ratios ──────────────────────────────────────────────────────────────
  paidPercent: number;         // (paid / agreedPrice) × 100
  committedPercent: number;    // (committed / agreedPrice) × 100
  isFullyPaid: boolean;        // remaining ≤ 0 y todo PAID
  isOvercommitted: boolean;    // committed > agreedPrice (no debería pasar, pero se detecta)
}

export interface AssignmentDetail {
  id: string;
  contractorId: string;
  budgetItemId: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contractor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
  budgetItem: {
    id: string;
    name: string;
    unit: string;
    quantity: number;       // Cantidad total de la partida
    costUnitPrice: number;
    saleUnitPrice: number;
    categoryId: string;
    categoryName: string;
    projectId: string;
  };
  financials: AssignmentFinancials;
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    description: string | null;
    invoiceNumber: string | null;
    dueDate: Date | null;
    paidAt: Date | null;
    createdAt: Date;
  }[];
}

// ============================================================================
// FINANCIALS — cálculo por asignación individual
// ============================================================================

/**
 * Devuelve el cuadro financiero completo de una asignación.
 *
 * Estrategia:
 *   1 query Prisma para la asignación + relaciones
 *   1 query $queryRaw para los totales por estado (1 scan de payments)
 *   → 2 queries en paralelo
 */
export async function getAssignmentFinancials(
  assignmentId: string
): Promise<AssignmentDetail | null> {
  // Query 1: datos estructurales — necesitamos contractorId y budgetItemId
  // antes de poder hacer las queries de pagos, así que va primero.
  const assignment = await prisma.contractorAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      contractor: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
      budgetItem: {
        include: {
          category: { select: { id: true, name: true, projectId: true } },
        },
      },
    },
  });

  if (!assignment) return null;

  // Queries 2 y 3 en paralelo: ya tenemos contractorId y budgetItemId
  const paymentFilter = {
    contractorId: assignment.contractorId,
    budgetItemId: assignment.budgetItemId,
  };

  const [paymentsByStatus, recentPayments] = await Promise.all([
    // Totales por estado (1 scan de la tabla payments)
    prisma.payment.groupBy({
      by: ["status"],
      where: paymentFilter,
      _sum: { amount: true },
    }),

    // Últimos 5 pagos para contexto
    prisma.payment.findMany({
      where: paymentFilter,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        invoiceNumber: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Construir el cuadro financiero
  const financials = buildFinancials(assignment, paymentsByStatus);

  return {
    id: assignment.id,
    contractorId: assignment.contractorId,
    budgetItemId: assignment.budgetItemId,
    notes: assignment.notes,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    contractor: assignment.contractor,
    budgetItem: {
      id: assignment.budgetItem.id,
      name: assignment.budgetItem.name,
      unit: assignment.budgetItem.unit,
      quantity: Number(assignment.budgetItem.quantity),
      costUnitPrice: Number(assignment.budgetItem.costUnitPrice),
      saleUnitPrice: Number(assignment.budgetItem.saleUnitPrice),
      categoryId: assignment.budgetItem.category.id,
      categoryName: assignment.budgetItem.category.name,
      projectId: assignment.budgetItem.category.projectId,
    },
    financials,
    recentPayments: recentPayments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
  };
}

// ============================================================================
// FINANCIALS — resumen de todas las asignaciones de un proyecto
// ============================================================================

export interface ProjectAssignmentsSummary {
  projectId: string;
  totalAgreed: number;       // Suma de agreedPrice de todas las asignaciones
  totalPaid: number;         // Suma de pagos PAID en todas las asignaciones
  totalPending: number;      // PENDING + OVERDUE
  totalRemaining: number;    // totalAgreed - totalPaid - totalPending
  paymentProgress: number;   // (totalPaid / totalAgreed) × 100
  assignments: {
    id: string;
    contractorName: string;
    budgetItemName: string;
    categoryName: string;
    agreedPrice: number;
    paid: number;
    pending: number;
    remaining: number;
    paidPercent: number;
  }[];
}

export async function getProjectAssignmentsSummary(
  projectId: string
): Promise<ProjectAssignmentsSummary> {
  // 1 query SQL: todas las asignaciones del proyecto con sus totales de pagos
  type Row = {
    id: string;
    contractor_name: string;
    budget_item_name: string;
    category_name: string;
    agreed_price: string;
    total_paid: string;
    total_pending: string;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       ca.id,
       c.name    AS contractor_name,
       bi.name   AS budget_item_name,
       cat.name  AS category_name,
       ca.agreed_price,
       COALESCE(SUM(CASE WHEN p.status = 'PAID'                 THEN p.amount END), 0) AS total_paid,
       COALESCE(SUM(CASE WHEN p.status IN ('PENDING','OVERDUE') THEN p.amount END), 0) AS total_pending
     FROM contractor_assignments ca
     INNER JOIN contractors  c   ON c.id   = ca.contractor_id
     INNER JOIN budget_items bi  ON bi.id  = ca.budget_item_id
     INNER JOIN categories   cat ON cat.id = bi.category_id
     LEFT  JOIN payments     p   ON p.contractor_id  = ca.contractor_id
                                 AND p.budget_item_id = ca.budget_item_id
     WHERE cat.project_id = $1
     GROUP BY ca.id, c.name, bi.name, cat.name
     ORDER BY cat.name, bi.name`,
    projectId
  );

  let totalAgreed = 0;
  let totalPaid = 0;
  let totalPending = 0;

  const assignments = rows.map((r) => {
    const agreedPrice = Number(r.agreed_price);
    const paid = Number(r.total_paid);
    const pending = Number(r.total_pending);

    totalAgreed += agreedPrice;
    totalPaid += paid;
    totalPending += pending;

    return {
      id: r.id,
      contractorName: r.contractor_name,
      budgetItemName: r.budget_item_name,
      categoryName: r.category_name,
      agreedPrice,
      paid,
      pending,
      remaining: agreedPrice - paid - pending,
      paidPercent:
        agreedPrice > 0 ? Math.round((paid / agreedPrice) * 100) : 0,
    };
  });

  return {
    projectId,
    totalAgreed,
    totalPaid,
    totalPending,
    totalRemaining: totalAgreed - totalPaid - totalPending,
    paymentProgress:
      totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0,
    assignments,
  };
}

// ============================================================================
// HELPER — construye AssignmentFinancials desde el groupBy de Prisma
// ============================================================================

function buildFinancials(
  assignment: { agreedPrice: unknown; assignedQuantity: unknown },
  paymentsByStatus: { status: string; _sum: { amount: unknown } }[]
): AssignmentFinancials {
  const agreedPrice = Number(assignment.agreedPrice);
  const assignedQuantity = Number(assignment.assignedQuantity);

  const getStatus = (status: string) =>
    Number(
      paymentsByStatus.find((p) => p.status === status)?._sum.amount ?? 0
    );

  const paid = getStatus("PAID");
  const pending = getStatus("PENDING");
  const overdue = getStatus("OVERDUE");
  const cancelled = getStatus("CANCELLED");
  const committed = paid + pending + overdue;
  const remaining = agreedPrice - committed;

  return {
    assignedQuantity,
    agreedPrice,
    // Precio unitario implícito: agreedPrice / assignedQuantity
    // Útil para mostrar en tablas pero NO es el campo almacenado
    impliedUnitPrice:
      assignedQuantity > 0
        ? Math.round((agreedPrice / assignedQuantity) * 100) / 100
        : 0,
    paid,
    pending,
    overdue,
    committed,
    remaining,
    cancelled,
    paidPercent:
      agreedPrice > 0 ? Math.round((paid / agreedPrice) * 100) : 0,
    committedPercent:
      agreedPrice > 0 ? Math.round((committed / agreedPrice) * 100) : 0,
    isFullyPaid: remaining <= 0 && overdue === 0 && pending === 0,
    isOvercommitted: committed > agreedPrice,
  };
}

// ============================================================================
// QUERIES ANALÍTICAS DE PROYECTO
// ============================================================================

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ContractorFinancialStats {
  contractorId: string;
  contractorName: string;
  email: string | null;
  phone: string | null;
  assignmentCount: number;
  /** Suma de agreed_price de todas las asignaciones del contratista */
  totalAgreed: number;
  /** Pagos en estado PAID */
  totalPaid: number;
  /** Pagos en estado PENDING */
  totalPending: number;
  /** Pagos en estado OVERDUE */
  totalOverdue: number;
  /** totalAgreed - totalPaid — todo lo que todavía se debe (incluyendo no programado) */
  balanceRemaining: number;
  /** Solo vencidos — deuda urgente */
  overdueDebt: number;
  /** (totalPaid / totalAgreed) × 100 */
  paidPercent: number;
  /** Posición en ranking por totalAgreed (1 = más costoso) */
  costRank: number;
}

export interface ProjectContractorStats {
  projectId: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  /** Suma de balanceRemaining de todos los contratistas */
  totalOwed: number;
  contractors: ContractorFinancialStats[];
}

export interface ItemCost {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  categoryId: string;
  categoryName: string;
  /** cost_subtotal = quantity × costUnitPrice (costo presupuestado) */
  budgetedCost: number;
  /** sale_subtotal = quantity × saleUnitPrice (ingreso presupuestado) */
  budgetedRevenue: number;
  /** Número de contratistas asignados a esta partida */
  contractorCount: number;
  /** Suma de agreed_price de todas las asignaciones de la partida */
  totalContracted: number;
  /** budgetedCost − totalContracted (positivo = se contrató por debajo del presupuesto) */
  costVariance: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  /** totalContracted − totalPaid */
  balanceRemaining: number;
}

export interface ProjectItemCosts {
  projectId: string;
  totalBudgetedCost: number;
  totalContracted: number;
  totalPaid: number;
  items: ItemCost[];
}

// ── Implementaciones ─────────────────────────────────────────────────────────

/**
 * Queries 1-3 combinadas en una sola ida a la BD:
 *
 *   1. Cuánto se le debe a cada contratista  →  balanceRemaining (totalAgreed - totalPaid)
 *   2. Total pagado por contratista           →  totalPaid
 *   3. Ranking de contratistas por costo      →  costRank (RANK() sobre totalAgreed)
 *
 * Estrategia CTE:
 *   - `assignment_totals` : 1 scan de contractor_assignments → SUM(agreed_price) por contratista
 *   - `payment_totals`    : 1 scan de payments               → SUM por estado, por contratista
 *   - JOIN final sobre contractors + project_contractors
 *   - RANK() window function sin sub-select extra
 */
export async function getProjectContractorStats(
  projectId: string
): Promise<ProjectContractorStats> {
  type Row = {
    contractor_id: string;
    contractor_name: string;
    email: string | null;
    phone: string | null;
    assignment_count: string;
    total_agreed: string;
    total_paid: string;
    total_pending: string;
    total_overdue: string;
    balance_remaining: string;
    overdue_debt: string;
    paid_percent: string;
    cost_rank: string;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `WITH assignment_totals AS (
       -- 1 scan de contractor_assignments, filtrado por proyecto vía categories
       SELECT
         ca.contractor_id,
         COUNT(ca.id)::int            AS assignment_count,
         SUM(ca.agreed_price)         AS total_agreed
       FROM contractor_assignments ca
       INNER JOIN budget_items bi  ON bi.id  = ca.budget_item_id
       INNER JOIN categories   cat ON cat.id = bi.category_id
       WHERE cat.project_id = $1
       GROUP BY ca.contractor_id
     ),
     payment_totals AS (
       -- 1 scan de payments, sólo este proyecto, excluye CANCELLED
       SELECT
         contractor_id,
         COALESCE(SUM(CASE WHEN status = 'PAID'    THEN amount END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount END), 0) AS overdue
       FROM payments
       WHERE project_id = $1
         AND status != 'CANCELLED'
       GROUP BY contractor_id
     ),
     ranked AS (
       SELECT
         c.id                                    AS contractor_id,
         c.name                                  AS contractor_name,
         c.email,
         c.phone,
         COALESCE(at.assignment_count, 0)        AS assignment_count,
         COALESCE(at.total_agreed,     0)        AS total_agreed,
         COALESCE(pt.paid,    0)                 AS total_paid,
         COALESCE(pt.pending, 0)                 AS total_pending,
         COALESCE(pt.overdue, 0)                 AS total_overdue,
         -- Saldo total: lo que acordamos − lo que ya se pagó
         COALESCE(at.total_agreed, 0)
           - COALESCE(pt.paid, 0)                AS balance_remaining,
         -- Deuda urgente: sólo vencidos
         COALESCE(pt.overdue, 0)                 AS overdue_debt,
         -- % pagado respecto al total acordado
         CASE WHEN COALESCE(at.total_agreed, 0) > 0
           THEN ROUND(
             (COALESCE(pt.paid, 0) / COALESCE(at.total_agreed, 0)) * 100, 1
           )
           ELSE 0
         END                                     AS paid_percent,
         -- Ranking: 1 = contratista más costoso del proyecto
         RANK() OVER (
           ORDER BY COALESCE(at.total_agreed, 0) DESC
         )                                       AS cost_rank
       FROM contractors c
       INNER JOIN project_contractors pc
               ON pc.contractor_id = c.id
              AND pc.project_id    = $1
       LEFT JOIN assignment_totals at ON at.contractor_id = c.id
       LEFT JOIN payment_totals    pt ON pt.contractor_id = c.id
     )
     SELECT * FROM ranked
     ORDER BY cost_rank, contractor_name`,
    projectId
  );

  let totalAgreed = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let totalOwed = 0;

  const contractors: ContractorFinancialStats[] = rows.map((r) => {
    const ta = Number(r.total_agreed);
    const tp = Number(r.total_paid);
    const tpd = Number(r.total_pending);
    const tov = Number(r.total_overdue);
    const br = Number(r.balance_remaining);

    totalAgreed  += ta;
    totalPaid    += tp;
    totalPending += tpd;
    totalOverdue += tov;
    totalOwed    += br;

    return {
      contractorId:    r.contractor_id,
      contractorName:  r.contractor_name,
      email:           r.email,
      phone:           r.phone,
      assignmentCount: Number(r.assignment_count),
      totalAgreed:     ta,
      totalPaid:       tp,
      totalPending:    tpd,
      totalOverdue:    tov,
      balanceRemaining: br,
      overdueDebt:     Number(r.overdue_debt),
      paidPercent:     Number(r.paid_percent),
      costRank:        Number(r.cost_rank),
    };
  });

  return {
    projectId,
    totalAgreed,
    totalPaid,
    totalPending,
    totalOverdue,
    totalOwed,
    contractors,
  };
}

/**
 * Query 4: Costos por partida.
 *
 * Por cada budget_item del proyecto devuelve:
 *   - Costo presupuestado (cost_subtotal del ítem)
 *   - Total contratado    (suma de agreed_price de asignaciones)
 *   - Varianza de costo   (presupuestado − contratado)
 *   - Estado de pagos     (paid / pending / overdue)
 *   - Saldo por pagar
 *
 * Estrategia CTE:
 *   - `item_contracted` : 1 scan de contractor_assignments → agrega por budget_item_id
 *   - `item_payments`   : 1 scan de payments               → agrega por budget_item_id
 *   - JOIN final sobre budget_items + categories
 */
export async function getProjectItemCosts(
  projectId: string
): Promise<ProjectItemCosts> {
  type Row = {
    item_id: string;
    item_name: string;
    unit: string;
    quantity: string;
    category_id: string;
    category_name: string;
    budgeted_cost: string;
    budgeted_revenue: string;
    contractor_count: string;
    total_contracted: string;
    cost_variance: string;
    total_paid: string;
    total_pending: string;
    total_overdue: string;
    balance_remaining: string;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `WITH item_contracted AS (
       -- 1 scan de contractor_assignments: cuánto se contrató por partida
       SELECT
         budget_item_id,
         COUNT(id)::int       AS contractor_count,
         SUM(agreed_price)    AS total_contracted
       FROM contractor_assignments
       GROUP BY budget_item_id
     ),
     item_payments AS (
       -- 1 scan de payments: estado de cobros por partida, sólo este proyecto
       SELECT
         budget_item_id,
         COALESCE(SUM(CASE WHEN status = 'PAID'    THEN amount END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount END), 0) AS overdue
       FROM payments
       WHERE project_id     = $1
         AND budget_item_id IS NOT NULL
         AND status        != 'CANCELLED'
       GROUP BY budget_item_id
     )
     SELECT
       bi.id                               AS item_id,
       bi.name                             AS item_name,
       bi.unit,
       bi.quantity,
       cat.id                              AS category_id,
       cat.name                            AS category_name,
       bi.cost_subtotal                    AS budgeted_cost,
       bi.sale_subtotal                    AS budgeted_revenue,
       COALESCE(ic.contractor_count,  0)   AS contractor_count,
       COALESCE(ic.total_contracted,  0)   AS total_contracted,
       -- Varianza: positivo = se contrató por debajo del presupuesto (favorable)
       bi.cost_subtotal
         - COALESCE(ic.total_contracted, 0) AS cost_variance,
       COALESCE(ip.paid,    0)             AS total_paid,
       COALESCE(ip.pending, 0)             AS total_pending,
       COALESCE(ip.overdue, 0)             AS total_overdue,
       COALESCE(ic.total_contracted, 0)
         - COALESCE(ip.paid, 0)            AS balance_remaining
     FROM budget_items bi
     INNER JOIN categories cat ON cat.id = bi.category_id
     LEFT  JOIN item_contracted ic ON ic.budget_item_id = bi.id
     LEFT  JOIN item_payments   ip ON ip.budget_item_id = bi.id
     WHERE cat.project_id = $1
     ORDER BY cat.sort_order, bi.sort_order`,
    projectId
  );

  let totalBudgetedCost = 0;
  let totalContracted = 0;
  let totalPaid = 0;

  const items: ItemCost[] = rows.map((r) => {
    const bc = Number(r.budgeted_cost);
    const tc = Number(r.total_contracted);
    const tp = Number(r.total_paid);

    totalBudgetedCost += bc;
    totalContracted   += tc;
    totalPaid         += tp;

    return {
      itemId:           r.item_id,
      itemName:         r.item_name,
      unit:             r.unit,
      quantity:         Number(r.quantity),
      categoryId:       r.category_id,
      categoryName:     r.category_name,
      budgetedCost:     bc,
      budgetedRevenue:  Number(r.budgeted_revenue),
      contractorCount:  Number(r.contractor_count),
      totalContracted:  tc,
      costVariance:     Number(r.cost_variance),
      totalPaid:        tp,
      totalPending:     Number(r.total_pending),
      totalOverdue:     Number(r.total_overdue),
      balanceRemaining: Number(r.balance_remaining),
    };
  });

  return {
    projectId,
    totalBudgetedCost,
    totalContracted,
    totalPaid,
    items,
  };
}
