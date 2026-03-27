import prisma from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
type Decimal = Prisma.Decimal;

// ============================================================================
// TIPOS
// ============================================================================

export interface ContractorDebt {
  contractorId: string;
  contractorName: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
}

export interface DashboardSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalCancelled: number;
  overdueCount: number;
  upcomingDueCount: number;
  recentPayments: {
    id: string;
    amount: Decimal;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
    contractor: { id: string; name: string };
    project: { id: string; name: string };
  }[];
}

// ============================================================================
// VALIDACIONES DE NEGOCIO
// ============================================================================

/**
 * Valida que el monto del pago no exceda la deuda restante del contratista
 * en la partida asignada. Si no hay partida, valida contra el total del
 * contratista en el proyecto.
 */
export async function validatePaymentAmount(
  contractorId: string,
  projectId: string,
  amount: number,
  budgetItemId?: string,
  excludePaymentId?: string
): Promise<{ valid: boolean; error?: string; maxAllowed?: number }> {

  if (budgetItemId) {
    // Validar contra la asignación específica
    const assignment = await prisma.contractorAssignment.findUnique({
      where: {
        contractorId_budgetItemId: { contractorId, budgetItemId },
      },
    });

    if (!assignment) {
      return { valid: false, error: "El contratista no tiene asignada esta partida" };
    }

    const agreedTotal = Number(assignment.agreedPrice);

    // Sumar pagos existentes para esta partida + contratista
    const paidResult = await prisma.payment.aggregate({
      where: {
        contractorId,
        budgetItemId,
        status: { in: ["PENDING", "PAID"] },
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
      _sum: { amount: true },
    });

    const alreadyCommitted = Number(paidResult._sum.amount ?? 0);
    const remaining = agreedTotal - alreadyCommitted;

    if (amount > remaining) {
      return {
        valid: false,
        error: `El monto ($${amount}) excede la deuda restante ($${remaining.toFixed(2)}) para esta partida`,
        maxAllowed: remaining,
      };
    }

    return { valid: true };
  }

  // Sin partida: validar contra el total de asignaciones del contratista en el proyecto
  const assignments = await prisma.contractorAssignment.findMany({
    where: {
      contractorId,
      budgetItem: { category: { projectId } },
    },
  });

  if (assignments.length === 0) {
    // Sin asignaciones, permitir pago libre (anticipo, etc.)
    return { valid: true };
  }

  const totalAgreed = assignments.reduce((s, a) => s + Number(a.agreedPrice), 0);

  const paidResult = await prisma.payment.aggregate({
    where: {
      contractorId,
      projectId,
      status: { in: ["PENDING", "PAID"] },
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
    },
    _sum: { amount: true },
  });

  const alreadyCommitted = Number(paidResult._sum.amount ?? 0);
  const remaining = totalAgreed - alreadyCommitted;

  if (amount > remaining) {
    return {
      valid: false,
      error: `El monto ($${amount}) excede la deuda restante del contratista en este proyecto ($${remaining.toFixed(2)})`,
      maxAllowed: remaining,
    };
  }

  return { valid: true };
}

// ============================================================================
// DETECCIÓN DE PAGOS VENCIDOS
// ============================================================================

/**
 * Marca como OVERDUE todos los pagos PENDING cuya dueDate ya pasó.
 * Retorna la cantidad de pagos actualizados.
 */
export async function markOverduePayments(): Promise<number> {
  const result = await prisma.payment.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  return result.count;
}

// ============================================================================
// DEUDA POR CONTRATISTA
// ============================================================================

/**
 * Calcula la deuda restante de cada contratista en un proyecto.
 */
export async function getContractorDebts(projectId: string): Promise<ContractorDebt[]> {
  // Obtener contratistas del proyecto con sus asignaciones
  const projectContractors = await prisma.projectContractor.findMany({
    where: { projectId },
    include: {
      contractor: {
        include: {
          assignments: {
            where: { budgetItem: { category: { projectId } } },
          },
          payments: {
            where: { projectId },
          },
        },
      },
    },
  });

  return projectContractors.map((pc) => {
    const contractor = pc.contractor;
    const totalAgreed = contractor.assignments.reduce(
      (s, a) => s + Number(a.agreedPrice),
      0
    );
    const totalPaid = contractor.payments
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalPending = contractor.payments
      .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      contractorId: contractor.id,
      contractorName: contractor.name,
      totalAgreed,
      totalPaid,
      totalPending,
      remaining: totalAgreed - totalPaid - totalPending,
    };
  });
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Genera el resumen completo de pagos para el dashboard.
 */
export async function getDashboardSummary(projectId: string): Promise<DashboardSummary> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Primero marcar vencidos
  await markOverduePayments();

  const [byStatus, overdueCount, upcomingDueCount, recentPayments] =
    await Promise.all([
      // Totales por estado
      prisma.payment.groupBy({
        by: ["status"],
        where: { projectId },
        _sum: { amount: true },
      }),
      // Cantidad de vencidos
      prisma.payment.count({
        where: { projectId, status: "OVERDUE" },
      }),
      // Pagos que vencen en los próximos 7 días
      prisma.payment.count({
        where: {
          projectId,
          status: "PENDING",
          dueDate: { gte: now, lte: in7Days },
        },
      }),
      // Últimos 5 pagos
      prisma.payment.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          contractor: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

  const getTotal = (status: string) => {
    const found = byStatus.find((s) => s.status === status);
    return Number(found?._sum.amount ?? 0);
  };

  return {
    totalPaid: getTotal("PAID"),
    totalPending: getTotal("PENDING"),
    totalOverdue: getTotal("OVERDUE"),
    totalCancelled: getTotal("CANCELLED"),
    overdueCount,
    upcomingDueCount,
    recentPayments,
  };
}

// ============================================================================
// ACTUALIZAR BUDGET SUMMARY
// ============================================================================

/**
 * Recalcula el BudgetSummary de un proyecto después de un pago.
 */
export async function recalcBudgetSummary(projectId: string): Promise<void> {
  const [estimatedResult, paymentTotals] = await Promise.all([
    // Total estimado: suma de subtotales de todas las partidas
    prisma.budgetItem.aggregate({
      where: { category: { projectId } },
      _sum: { subtotal: true },
    }),
    // Totales de pagos por estado
    prisma.payment.groupBy({
      by: ["status"],
      where: { projectId },
      _sum: { amount: true },
    }),
  ]);

  const estimatedTotal = Number(estimatedResult._sum.subtotal ?? 0);
  const paidTotal = Number(
    paymentTotals.find((t) => t.status === "PAID")?._sum.amount ?? 0
  );
  const pendingTotal = Number(
    paymentTotals.find((t) => t.status === "PENDING")?._sum.amount ?? 0
  ) + Number(
    paymentTotals.find((t) => t.status === "OVERDUE")?._sum.amount ?? 0
  );

  await prisma.budgetSummary.upsert({
    where: { projectId },
    create: {
      projectId,
      estimatedTotal,
      actualTotal: paidTotal + pendingTotal,
      totalPaid: paidTotal,
      totalPending: pendingTotal,
      lastCalculatedAt: new Date(),
    },
    update: {
      estimatedTotal,
      actualTotal: paidTotal + pendingTotal,
      totalPaid: paidTotal,
      totalPending: pendingTotal,
      lastCalculatedAt: new Date(),
    },
  });
}
