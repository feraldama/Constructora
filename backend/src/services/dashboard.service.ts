import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS
// ============================================================================

export interface ProjectDashboard {
  // Presupuesto
  budget: {
    estimated: number;       // Suma de subtotales de todas las partidas
    executed: number;        // Total pagado (status=PAID)
    committed: number;       // Pagado + Pendiente + Vencido (excluye cancelado)
    remaining: number;       // estimated - committed
    executionPercent: number; // (executed / estimated) * 100
  };
  // Pagos
  payments: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    countPaid: number;
    countPending: number;
    countOverdue: number;
    countUpcoming7d: number; // Vencen en los próximos 7 días
  };
  // Avance de obra (físico ponderado por saleSubtotal)
  progress: {
    totalItems: number;
    itemsWithProgress: number; // Partidas con mediciones de avance
    percent: number;           // Progreso ponderado por valor de partida
  };
  // Últimos movimientos
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: unknown;
    createdAt: Date;
    userName: string | null;
  }[];
  // Últimos pagos
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    contractorName: string;
    description: string | null;
  }[];
}

// ============================================================================
// QUERY PRINCIPAL — 1 solo roundtrip para todo lo numérico
// ============================================================================

interface DashboardRawRow {
  estimated: string | null;
  total_paid: string | null;
  total_pending: string | null;
  total_overdue: string | null;
  total_committed: string | null;
  count_paid: string | null;
  count_pending: string | null;
  count_overdue: string | null;
  count_upcoming_7d: string | null;
  total_items: string | null;
  items_with_progress: string | null;
  progress_percent: string | null;
}

/**
 * Dashboard completo de un proyecto.
 *
 * Estrategia de optimización:
 * 1. Un solo $queryRawUnsafe con subqueries para todo lo numérico (presupuesto + pagos + avance)
 * 2. Una query Prisma para últimos movimientos (activity_logs)
 * 3. Una query Prisma para últimos pagos con join a contractor
 *
 * Total: 3 queries en paralelo (vs 8+ antes). El SQL usa los índices compuestos
 * que ya existen: payments(project_id, status), categories(project_id, sort_order),
 * activity_logs(project_id, created_at DESC).
 */
export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
  // Paso 0: marcar vencidos (1 UPDATE atómico)
  await prisma.payment.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  // Paso 1: todo lo numérico en 1 query SQL
  // Usamos subqueries correlacionadas — PostgreSQL las ejecuta en un solo scan
  const sql = `
    SELECT
      -- Presupuesto estimado: suma de subtotales de partidas del proyecto
      (
        SELECT COALESCE(SUM(bi.cost_subtotal), 0)
        FROM budget_items bi
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE c.project_id = $1
      ) AS estimated,

      -- Pagos por estado (un solo scan de la tabla payments filtrado por project_id)
      COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount END), 0) AS total_pending,
      COALESCE(SUM(CASE WHEN p.status = 'OVERDUE' THEN p.amount END), 0) AS total_overdue,
      COALESCE(SUM(CASE WHEN p.status IN ('PAID','PENDING','OVERDUE') THEN p.amount END), 0) AS total_committed,

      COUNT(CASE WHEN p.status = 'PAID' THEN 1 END) AS count_paid,
      COUNT(CASE WHEN p.status = 'PENDING' THEN 1 END) AS count_pending,
      COUNT(CASE WHEN p.status = 'OVERDUE' THEN 1 END) AS count_overdue,

      -- Pagos que vencen en los próximos 7 días
      COUNT(CASE
        WHEN p.status = 'PENDING'
         AND p.due_date >= NOW()
         AND p.due_date <= NOW() + INTERVAL '7 days'
        THEN 1
      END) AS count_upcoming_7d,

      -- Avance de obra físico (ponderado por sale_subtotal)
      (
        SELECT COUNT(*)
        FROM budget_items bi
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE c.project_id = $1
      ) AS total_items,

      (
        SELECT COUNT(DISTINCT pe.budget_item_id)
        FROM progress_entries pe
        INNER JOIN budget_items bi ON bi.id = pe.budget_item_id
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE c.project_id = $1
      ) AS items_with_progress,

      (
        SELECT COALESCE(
          SUM(
            LEAST(COALESCE(item_prog.measured, 0) / NULLIF(bi.quantity, 0), 1.0) * bi.sale_subtotal
          ) / NULLIF(SUM(bi.sale_subtotal), 0) * 100,
          0
        )
        FROM budget_items bi
        INNER JOIN categories c ON c.id = bi.category_id
        LEFT JOIN (
          SELECT budget_item_id, SUM(quantity) AS measured
          FROM progress_entries
          GROUP BY budget_item_id
        ) item_prog ON item_prog.budget_item_id = bi.id
        WHERE c.project_id = $1
      ) AS progress_percent

    FROM payments p
    WHERE p.project_id = $1
  `;

  // Paso 2 y 3 en paralelo con el SQL
  const [rawRows, recentActivity, recentPayments] = await Promise.all([
    // 1 query: todos los números
    prisma.$queryRawUnsafe<DashboardRawRow[]>(sql, projectId),

    // 1 query: últimos 10 movimientos (usa índice activity_logs(project_id, created_at DESC))
    prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),

    // 1 query: últimos 5 pagos (usa índice payments(project_id, created_at DESC))
    prisma.payment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        description: true,
        contractor: { select: { name: true } },
      },
    }),
  ]);

  // Parsear resultado del SQL (siempre 1 fila)
  const row = rawRows[0] ?? {
    estimated: "0",
    total_paid: "0",
    total_pending: "0",
    total_overdue: "0",
    total_committed: "0",
    count_paid: "0",
    count_pending: "0",
    count_overdue: "0",
    count_upcoming_7d: "0",
    total_items: "0",
    items_with_progress: "0",
    progress_percent: "0",
  };

  const n = (val: string | null) => Number(val ?? 0);

  const estimated = n(row.estimated);
  const executed = n(row.total_paid);
  const committed = n(row.total_committed);
  const totalItems = n(row.total_items);
  const itemsWithProgress = n(row.items_with_progress);
  const progressPercent = n(row.progress_percent);

  return {
    budget: {
      estimated,
      executed,
      committed,
      remaining: estimated - committed,
      executionPercent: estimated > 0 ? Math.round((executed / estimated) * 100) : 0,
    },
    payments: {
      totalPaid: executed,
      totalPending: n(row.total_pending),
      totalOverdue: n(row.total_overdue),
      countPaid: n(row.count_paid),
      countPending: n(row.count_pending),
      countOverdue: n(row.count_overdue),
      countUpcoming7d: n(row.count_upcoming_7d),
    },
    progress: {
      totalItems,
      itemsWithProgress,
      percent: Math.round(progressPercent),
    },
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt,
      userName: a.user ? `${a.user.firstName} ${a.user.lastName}` : null,
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      contractorName: p.contractor.name,
      description: p.description,
    })),
  };
}
