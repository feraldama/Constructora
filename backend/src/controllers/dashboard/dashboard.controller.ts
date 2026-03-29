import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { getProjectDashboard } from "../../services/dashboard.service.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

// GET /api/dashboard?projectId=xxx
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);

  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const dashboard = await getProjectDashboard(projectId);
  res.json(dashboard);
}

// GET /api/dashboard/overview — resumen multi-proyecto
export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  // Obtener proyectos donde el usuario es miembro
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json({ projects: [], totals: { totalPaid: 0, totalPending: 0, totalOverdue: 0, totalEstimated: 0 } });
    return;
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      estimatedEnd: true,
      budgetSummary: {
        select: { estimatedTotal: true, totalPaid: true, totalPending: true, totalRevenue: true, grossProfit: true, profitMargin: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Obtener conteos de pagos por proyecto
  const paymentStats = await prisma.payment.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _sum: { amount: true },
    _count: true,
  });

  // Obtener progreso físico por proyecto (usando Prisma queries)
  const allItems = await prisma.budgetItem.findMany({
    where: { category: { projectId: { in: projectIds } } },
    select: {
      id: true,
      quantity: true,
      saleSubtotal: true,
      category: { select: { projectId: true } },
      progressEntries: { select: { quantity: true } },
    },
  });

  const progressMap = new Map<string, number>();
  const byProject = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const pid = item.category.projectId;
    if (!byProject.has(pid)) byProject.set(pid, []);
    byProject.get(pid)!.push(item);
  }
  for (const [pid, items] of byProject) {
    const totalWeight = items.reduce((s, i) => s + Number(i.saleSubtotal), 0);
    if (totalWeight <= 0) { progressMap.set(pid, 0); continue; }
    const weighted = items.reduce((s, i) => {
      const budgeted = Number(i.quantity);
      const measured = i.progressEntries.reduce((sum, e) => sum + Number(e.quantity), 0);
      const progress = budgeted > 0 ? Math.min(measured / budgeted, 1) : 0;
      return s + progress * Number(i.saleSubtotal);
    }, 0);
    progressMap.set(pid, Math.round((weighted / totalWeight) * 100));
  }

  const result = projects.map((p) => {
    const stats = paymentStats.filter((s) => s.projectId === p.id);
    const paid = Number(stats.find((s) => s.status === "PAID")?._sum.amount ?? 0);
    const pending = Number(stats.find((s) => s.status === "PENDING")?._sum.amount ?? 0);
    const overdue = Number(stats.find((s) => s.status === "OVERDUE")?._sum.amount ?? 0);
    const estimated = Number(p.budgetSummary?.estimatedTotal ?? 0);
    const revenue = Number(p.budgetSummary?.totalRevenue ?? 0);

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.startDate,
      estimatedEnd: p.estimatedEnd,
      estimated,
      revenue,
      paid,
      pending,
      overdue,
      committed: paid + pending + overdue,
      executionPercent: estimated > 0 ? Math.round((paid / estimated) * 100) : 0,
      progressPercent: progressMap.get(p.id) ?? 0,
      profitMargin: Number(p.budgetSummary?.profitMargin ?? 0),
    };
  });

  const totals = result.reduce(
    (acc, p) => ({
      totalPaid: acc.totalPaid + p.paid,
      totalPending: acc.totalPending + p.pending,
      totalOverdue: acc.totalOverdue + p.overdue,
      totalEstimated: acc.totalEstimated + p.estimated,
    }),
    { totalPaid: 0, totalPending: 0, totalOverdue: 0, totalEstimated: 0 }
  );

  res.json({ projects: result, totals });
}
