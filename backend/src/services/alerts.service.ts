import prisma from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { markOverduePayments } from "./payment-state.service.js";

// ============================================================================
// TIPOS
// ============================================================================

interface AlertResult {
  overduePayments: number;
  budgetExceeded: number;
  upcomingDue: number;
  totalNotificationsCreated: number;
}

interface OverdueRow {
  id: string;
  amount: unknown;
  due_date: Date;
  contractor_name: string;
  project_id: string;
  project_name: string;
}

interface BudgetExceededRow {
  project_id: string;
  project_name: string;
  estimated: string;
  committed: string;
  exceeded_by: string;
  exceeded_percent: string;
}

interface UpcomingRow {
  id: string;
  amount: unknown;
  due_date: Date;
  contractor_name: string;
  project_id: string;
  project_name: string;
  days_until_due: string;
}

// ============================================================================
// DETECCIÓN Y CREACIÓN DE ALERTAS
// ============================================================================

/**
 * Ejecuta todas las verificaciones de alertas y crea notificaciones.
 * Diseñado para correr como cron job (cada 15 min o cada hora).
 *
 * Estrategia:
 * 1. Marcar pagos vencidos (PENDING → OVERDUE)
 * 2. Detectar pagos recién marcados como vencidos → notificar
 * 3. Detectar presupuestos excedidos → notificar
 * 4. Detectar pagos que vencen en 3 días → notificar
 *
 * Usa deduplicación: no crea la misma notificación dos veces
 * (verifica por type + metadata.entityId + últimas 24h).
 */
export async function runAlertChecks(): Promise<AlertResult> {
  const [overdueCount, budgetCount, upcomingCount] = await Promise.all([
    checkOverduePayments(),
    checkBudgetExceeded(),
    checkUpcomingDuePayments(),
  ]);

  return {
    overduePayments: overdueCount,
    budgetExceeded: budgetCount,
    upcomingDue: upcomingCount,
    totalNotificationsCreated: overdueCount + budgetCount + upcomingCount,
  };
}

// ============================================================================
// 1. PAGOS VENCIDOS
// ============================================================================

async function checkOverduePayments(): Promise<number> {
  // Paso 1: Marcar PENDING → OVERDUE (fuente de verdad en payment-state.service)
  await markOverduePayments();

  // Paso 2: Buscar pagos OVERDUE sin notificación reciente
  // 1 query SQL con LEFT JOIN para deduplicar
  const sql = `
    SELECT
      p.id,
      p.amount,
      p.due_date,
      co.name AS contractor_name,
      pr.id AS project_id,
      pr.name AS project_name
    FROM payments p
    INNER JOIN contractors co ON co.id = p.contractor_id
    INNER JOIN projects pr ON pr.id = p.project_id
    WHERE p.status = 'OVERDUE'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.type = 'PAYMENT_OVERDUE'
          AND n.metadata->>'paymentId' = p.id
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
    ORDER BY p.due_date ASC
    LIMIT 50
  `;

  const overduePayments = await prisma.$queryRawUnsafe<OverdueRow[]>(sql);

  if (overduePayments.length === 0) return 0;

  // Obtener admins de cada proyecto para notificar
  const projectIds = [...new Set(overduePayments.map((p) => p.project_id))];
  const admins = await getProjectAdmins(projectIds);

  const notifications: {
    userId: string;
    type: "PAYMENT_OVERDUE";
    title: string;
    message: string;
    metadata: Prisma.InputJsonValue;
  }[] = [];

  for (const payment of overduePayments) {
    const userIds = admins.get(payment.project_id) ?? [];
    const amount = Number(payment.amount);
    const daysOverdue = Math.floor(
      (Date.now() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const userId of userIds) {
      notifications.push({
        userId,
        type: "PAYMENT_OVERDUE",
        title: `Pago vencido hace ${daysOverdue} dia${daysOverdue !== 1 ? "s" : ""}`,
        message: `Pago de $${amount.toLocaleString("es-AR")} a ${payment.contractor_name} en ${payment.project_name} esta vencido desde el ${new Date(payment.due_date).toLocaleDateString("es-AR")}.`,
        metadata: {
          paymentId: payment.id,
          projectId: payment.project_id,
          contractorName: payment.contractor_name,
          amount,
          daysOverdue,
        },
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return overduePayments.length;
}

// ============================================================================
// 2. PRESUPUESTO EXCEDIDO
// ============================================================================

async function checkBudgetExceeded(): Promise<number> {
  // Proyectos activos donde lo comprometido (pagado + pendiente + vencido) > estimado
  const sql = `
    SELECT
      pr.id AS project_id,
      pr.name AS project_name,

      COALESCE((
        SELECT SUM(bi.subtotal)
        FROM budget_items bi
        INNER JOIN categories c ON c.id = bi.category_id
        WHERE c.project_id = pr.id
      ), 0) AS estimated,

      COALESCE(SUM(CASE WHEN p.status IN ('PAID','PENDING','OVERDUE') THEN p.amount END), 0) AS committed,

      COALESCE(SUM(CASE WHEN p.status IN ('PAID','PENDING','OVERDUE') THEN p.amount END), 0)
        - COALESCE((
            SELECT SUM(bi.subtotal)
            FROM budget_items bi
            INNER JOIN categories c ON c.id = bi.category_id
            WHERE c.project_id = pr.id
          ), 0) AS exceeded_by,

      CASE
        WHEN COALESCE((SELECT SUM(bi.subtotal) FROM budget_items bi INNER JOIN categories c ON c.id = bi.category_id WHERE c.project_id = pr.id), 0) > 0
        THEN ROUND(
          (COALESCE(SUM(CASE WHEN p.status IN ('PAID','PENDING','OVERDUE') THEN p.amount END), 0)
           / COALESCE((SELECT SUM(bi.subtotal) FROM budget_items bi INNER JOIN categories c ON c.id = bi.category_id WHERE c.project_id = pr.id), 1) - 1) * 100
        )
        ELSE 0
      END AS exceeded_percent

    FROM projects pr
    LEFT JOIN payments p ON p.project_id = pr.id
    WHERE pr.status IN ('PLANNING', 'IN_PROGRESS')
    GROUP BY pr.id, pr.name
    HAVING COALESCE(SUM(CASE WHEN p.status IN ('PAID','PENDING','OVERDUE') THEN p.amount END), 0)
           > COALESCE((SELECT SUM(bi.subtotal) FROM budget_items bi INNER JOIN categories c ON c.id = bi.category_id WHERE c.project_id = pr.id), 0)
       AND COALESCE((SELECT SUM(bi.subtotal) FROM budget_items bi INNER JOIN categories c ON c.id = bi.category_id WHERE c.project_id = pr.id), 0) > 0
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.type = 'PROJECT_UPDATE'
           AND n.metadata->>'alertType' = 'BUDGET_EXCEEDED'
           AND n.metadata->>'projectId' = pr.id::text
           AND n.created_at > NOW() - INTERVAL '24 hours'
       )
  `;

  const exceededProjects = await prisma.$queryRawUnsafe<BudgetExceededRow[]>(sql);

  if (exceededProjects.length === 0) return 0;

  const projectIds = exceededProjects.map((p) => p.project_id);
  const admins = await getProjectAdmins(projectIds);

  const notifications: {
    userId: string;
    type: "PROJECT_UPDATE";
    title: string;
    message: string;
    metadata: Prisma.InputJsonValue;
  }[] = [];

  for (const project of exceededProjects) {
    const userIds = admins.get(project.project_id) ?? [];
    const exceededBy = Number(project.exceeded_by);
    const pct = Number(project.exceeded_percent);

    for (const userId of userIds) {
      notifications.push({
        userId,
        type: "PROJECT_UPDATE",
        title: `Presupuesto excedido en ${project.project_name}`,
        message: `El proyecto ${project.project_name} supero el presupuesto estimado en $${exceededBy.toLocaleString("es-AR")} (${pct}% por encima).`,
        metadata: {
          alertType: "BUDGET_EXCEEDED",
          projectId: project.project_id,
          estimated: Number(project.estimated),
          committed: Number(project.committed),
          exceededBy,
          exceededPercent: pct,
        },
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return exceededProjects.length;
}

// ============================================================================
// 3. PAGOS POR VENCER (próximos 3 días)
// ============================================================================

async function checkUpcomingDuePayments(): Promise<number> {
  const sql = `
    SELECT
      p.id,
      p.amount,
      p.due_date,
      co.name AS contractor_name,
      pr.id AS project_id,
      pr.name AS project_name,
      EXTRACT(DAY FROM p.due_date - NOW())::int AS days_until_due
    FROM payments p
    INNER JOIN contractors co ON co.id = p.contractor_id
    INNER JOIN projects pr ON pr.id = p.project_id
    WHERE p.status = 'PENDING'
      AND p.due_date > NOW()
      AND p.due_date <= NOW() + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.type = 'PAYMENT_DUE'
          AND n.metadata->>'paymentId' = p.id
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
    ORDER BY p.due_date ASC
    LIMIT 50
  `;

  const upcomingPayments = await prisma.$queryRawUnsafe<UpcomingRow[]>(sql);

  if (upcomingPayments.length === 0) return 0;

  const projectIds = [...new Set(upcomingPayments.map((p) => p.project_id))];
  const admins = await getProjectAdmins(projectIds);

  const notifications: {
    userId: string;
    type: "PAYMENT_DUE";
    title: string;
    message: string;
    metadata: Prisma.InputJsonValue;
  }[] = [];

  for (const payment of upcomingPayments) {
    const userIds = admins.get(payment.project_id) ?? [];
    const amount = Number(payment.amount);
    const days = Number(payment.days_until_due);
    const label = days <= 0 ? "hoy" : days === 1 ? "manana" : `en ${days} dias`;

    for (const userId of userIds) {
      notifications.push({
        userId,
        type: "PAYMENT_DUE",
        title: `Pago vence ${label}`,
        message: `Pago de $${amount.toLocaleString("es-AR")} a ${payment.contractor_name} en ${payment.project_name} vence ${label} (${new Date(payment.due_date).toLocaleDateString("es-AR")}).`,
        metadata: {
          paymentId: payment.id,
          projectId: payment.project_id,
          contractorName: payment.contractor_name,
          amount,
          daysUntilDue: days,
        },
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return upcomingPayments.length;
}

// ============================================================================
// 4. LIMPIEZA DE NOTIFICACIONES ANTIGUAS
// ============================================================================

/**
 * Elimina notificaciones leídas con más de 30 días de antigüedad
 * y no leídas con más de 90 días.
 */
export async function purgeOldNotifications(): Promise<{ deleted: number }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.notification.deleteMany({
    where: {
      OR: [
        { isRead: true, createdAt: { lt: thirtyDaysAgo } },
        { isRead: false, createdAt: { lt: ninetyDaysAgo } },
      ],
    },
  });

  return { deleted: result.count };
}

// ============================================================================
// HELPER: Obtener admins/editors de proyectos
// ============================================================================

async function getProjectAdmins(
  projectIds: string[]
): Promise<Map<string, string[]>> {
  const members = await prisma.projectMember.findMany({
    where: {
      projectId: { in: projectIds },
      role: { in: ["ADMIN", "EDITOR"] },
    },
    select: { projectId: true, userId: true },
  });

  const map = new Map<string, string[]>();
  for (const m of members) {
    const list = map.get(m.projectId) ?? [];
    list.push(m.userId);
    map.set(m.projectId, list);
  }
  return map;
}
