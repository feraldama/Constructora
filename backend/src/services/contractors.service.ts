import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS
// ============================================================================

export interface AssignmentWithProgress {
  id: string;
  budgetItemId: string;
  budgetItemName: string;
  unit: string;
  projectId: string;
  projectName: string;
  assignedQuantity: number;
  agreedPrice: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
  paidPercent: number;
}

export interface PaymentsByProject {
  projectId: string;
  projectName: string;
  payments: {
    id: string;
    amount: number;
    status: string;
    description: string | null;
    invoiceNumber: string | null;
    dueDate: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    budgetItemName: string | null;
  }[];
  totals: {
    paid: number;
    pending: number;
    overdue: number;
    count: number;
  };
}

export interface ContractorFinancialSummary {
  contractorId: string;
  contractorName: string;
  // Totales globales (todos los proyectos)
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalRemaining: number;
  globalPaidPercent: number;
  // Por proyecto
  projects: {
    projectId: string;
    projectName: string;
    projectStatus: string;
    agreed: number;
    paid: number;
    pending: number;
    overdue: number;
    remaining: number;
    paidPercent: number;
    assignmentCount: number;
  }[];
  // Conteos
  totalAssignments: number;
  totalPayments: number;
  activeProjects: number;
}

// ============================================================================
// RESUMEN FINANCIERO — 1 raw SQL para totales + 1 Prisma para desglose
// ============================================================================

interface FinancialRawRow {
  project_id: string;
  project_name: string;
  project_status: string;
  agreed: string | null;
  assignment_count: string | null;
  paid: string | null;
  pending: string | null;
  overdue: string | null;
  payment_count: string | null;
}

export async function getContractorFinancialSummary(
  contractorId: string
): Promise<ContractorFinancialSummary | null> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { id: true, name: true },
  });

  if (!contractor) return null;

  // 1 query SQL: totales por proyecto con JOIN a asignaciones y pagos
  // Agrupa todo en el engine de PostgreSQL, evita N+1
  const sql = `
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      p.status AS project_status,

      -- Total acordado: suma de agreed_price de contractor_assignments del contratista en este proyecto
      COALESCE((
        SELECT SUM(ca.agreed_price)
        FROM contractor_assignments ca
        INNER JOIN budget_items bi ON bi.id = ca.budget_item_id
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE ca.contractor_id = $1
          AND c.project_id = p.id
      ), 0) AS agreed,

      -- Cantidad de asignaciones
      COALESCE((
        SELECT COUNT(*)
        FROM contractor_assignments ca
        INNER JOIN budget_items bi ON bi.id = ca.budget_item_id
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE ca.contractor_id = $1
          AND c.project_id = p.id
      ), 0) AS assignment_count,

      -- Pagos por estado (1 scan de payments con CASE WHEN)
      COALESCE(SUM(CASE WHEN pay.status = 'PAID' THEN pay.amount END), 0) AS paid,
      COALESCE(SUM(CASE WHEN pay.status = 'PENDING' THEN pay.amount END), 0) AS pending,
      COALESCE(SUM(CASE WHEN pay.status = 'OVERDUE' THEN pay.amount END), 0) AS overdue,
      COUNT(pay.id) AS payment_count

    FROM project_contractors pc
    INNER JOIN projects p ON p.id = pc.project_id
    LEFT JOIN payments pay ON pay.project_id = p.id AND pay.contractor_id = $1
    WHERE pc.contractor_id = $1
    GROUP BY p.id, p.name, p.status
    ORDER BY p.name
  `;

  const rows = await prisma.$queryRawUnsafe<FinancialRawRow[]>(sql, contractorId);

  const n = (val: string | null) => Number(val ?? 0);

  const projects = rows.map((r) => {
    const agreed = n(r.agreed);
    const paid = n(r.paid);
    const pending = n(r.pending);
    const overdue = n(r.overdue);
    const committed = paid + pending + overdue;

    return {
      projectId: r.project_id,
      projectName: r.project_name,
      projectStatus: r.project_status,
      agreed,
      paid,
      pending,
      overdue,
      remaining: agreed - committed,
      paidPercent: agreed > 0 ? Math.round((paid / agreed) * 100) : 0,
      assignmentCount: n(r.assignment_count),
    };
  });

  const totalAgreed = projects.reduce((s, p) => s + p.agreed, 0);
  const totalPaid = projects.reduce((s, p) => s + p.paid, 0);
  const totalPending = projects.reduce((s, p) => s + p.pending, 0);
  const totalOverdue = projects.reduce((s, p) => s + p.overdue, 0);
  const totalCommitted = totalPaid + totalPending + totalOverdue;

  return {
    contractorId: contractor.id,
    contractorName: contractor.name,
    totalAgreed,
    totalPaid,
    totalPending,
    totalOverdue,
    totalRemaining: totalAgreed - totalCommitted,
    globalPaidPercent: totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0,
    projects,
    totalAssignments: projects.reduce((s, p) => s + p.assignmentCount, 0),
    totalPayments: projects.reduce((s, p) => s + Number(p.paid > 0 || p.pending > 0 || p.overdue > 0), 0),
    activeProjects: projects.filter((p) => p.projectStatus === "IN_PROGRESS" || p.projectStatus === "PLANNING").length,
  };
}

// ============================================================================
// PARTIDAS ASIGNADAS con progreso de pago — 1 query optimizada
// ============================================================================

export async function getContractorAssignments(
  contractorId: string,
  projectId?: string
): Promise<AssignmentWithProgress[]> {
  // 1 query: asignaciones + subquery para pagos por partida
  const sql = `
    SELECT
      ca.id,
      ca.budget_item_id,
      bi.name AS budget_item_name,
      bi.unit,
      c.project_id,
      p.name AS project_name,
      ca.assigned_quantity,
      ca.agreed_price,

      COALESCE((
        SELECT SUM(pay.amount)
        FROM payments pay
        WHERE pay.contractor_id = $1
          AND pay.budget_item_id = ca.budget_item_id
          AND pay.status = 'PAID'
      ), 0) AS total_paid,

      COALESCE((
        SELECT SUM(pay.amount)
        FROM payments pay
        WHERE pay.contractor_id = $1
          AND pay.budget_item_id = ca.budget_item_id
          AND pay.status IN ('PENDING', 'OVERDUE')
      ), 0) AS total_pending

    FROM contractor_assignments ca
    INNER JOIN budget_items bi ON bi.id = ca.budget_item_id
    INNER JOIN categories c ON c.id = bi.category_id
    INNER JOIN projects p ON p.id = c.project_id
    WHERE ca.contractor_id = $1
      ${projectId ? "AND c.project_id = $2" : ""}
    ORDER BY p.name, bi.name
  `;

  const args = projectId ? [contractorId, projectId] : [contractorId];

  interface AssignmentRow {
    id: string;
    budget_item_id: string;
    budget_item_name: string;
    unit: string;
    project_id: string;
    project_name: string;
    assigned_quantity: string;
    agreed_price: string;
    total_paid: string;
    total_pending: string;
  }

  const rows = await prisma.$queryRawUnsafe<AssignmentRow[]>(sql, ...args);

  return rows.map((r) => {
    const agreedPrice = Number(r.agreed_price);
    const totalPaid = Number(r.total_paid);
    const totalPending = Number(r.total_pending);

    return {
      id: r.id,
      budgetItemId: r.budget_item_id,
      budgetItemName: r.budget_item_name,
      unit: r.unit,
      projectId: r.project_id,
      projectName: r.project_name,
      assignedQuantity: Number(r.assigned_quantity),
      agreedPrice,
      totalPaid,
      totalPending,
      remaining: agreedPrice - totalPaid - totalPending,
      paidPercent: agreedPrice > 0 ? Math.round((totalPaid / agreedPrice) * 100) : 0,
    };
  });
}

// ============================================================================
// HISTORIAL DE PAGOS AGRUPADO POR PROYECTO — 1 query Prisma optimizada
// ============================================================================

export async function getContractorPaymentsGrouped(
  contractorId: string
): Promise<PaymentsByProject[]> {
  // 1 query con include (Prisma genera un JOIN eficiente)
  const payments = await prisma.payment.findMany({
    where: { contractorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      description: true,
      invoiceNumber: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
      projectId: true,
      project: { select: { id: true, name: true } },
      budgetItem: { select: { name: true } },
    },
  });

  // Agrupar en memoria (más eficiente que N queries GROUP BY)
  const grouped = new Map<string, PaymentsByProject>();

  for (const p of payments) {
    const key = p.projectId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectId: p.project.id,
        projectName: p.project.name,
        payments: [],
        totals: { paid: 0, pending: 0, overdue: 0, count: 0 },
      });
    }

    const group = grouped.get(key)!;
    const amount = Number(p.amount);

    group.payments.push({
      id: p.id,
      amount,
      status: p.status,
      description: p.description,
      invoiceNumber: p.invoiceNumber,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      budgetItemName: p.budgetItem?.name ?? null,
    });

    group.totals.count++;
    if (p.status === "PAID") group.totals.paid += amount;
    else if (p.status === "PENDING") group.totals.pending += amount;
    else if (p.status === "OVERDUE") group.totals.overdue += amount;
  }

  return Array.from(grouped.values());
}
