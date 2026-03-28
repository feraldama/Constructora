import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { CreateProjectInput } from "./projects.schema.js";
import { ProjectStatus } from "../../generated/prisma/enums.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

type DeletableResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      details: {
        payments: number;
        contractors: number;
        budgetItems: number;
        attachments: number;
      };
    };

async function evaluateProjectDeletable(projectId: string): Promise<DeletableResult> {
  const [payments, contractors, budgetItems, attachments] = await Promise.all([
    prisma.payment.count({ where: { projectId } }),
    prisma.projectContractor.count({ where: { projectId } }),
    prisma.budgetItem.count({ where: { category: { projectId } } }),
    prisma.attachment.count({ where: { projectId } }),
  ]);

  if (payments === 0 && contractors === 0 && budgetItems === 0 && attachments === 0) {
    return { ok: true };
  }

  const parts: string[] = [];
  if (payments > 0) parts.push(`${payments} pago(s)`);
  if (contractors > 0) parts.push(`${contractors} contratista(s) vinculado(s)`);
  if (budgetItems > 0) parts.push(`${budgetItems} partida(s)`);
  if (attachments > 0) parts.push(`${attachments} adjunto(s)`);

  return {
    ok: false,
    reason: `No se puede eliminar el proyecto: hay datos cargados (${parts.join(", ")}).`,
    details: { payments, contractors, budgetItems, attachments },
  };
}

function serializeProject<T extends { initialBudget: unknown }>(p: T) {
  return {
    ...p,
    initialBudget: Number(p.initialBudget),
  };
}

/** Rubros iniciales del cómputo métrico para cada proyecto nuevo */
const DEFAULT_BUDGET_CATEGORIES = [
  "Mampostería",
  "Movimiento de Suelo",
  "Replanteo",
  "Marcación",
] as const;

// ============================================================================
// GET /api/projects — Proyectos donde el usuario es miembro
// ============================================================================
export async function listProjects(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const search = queryString(req.query.search);
  const statusParam = queryString(req.query.status) as ProjectStatus | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = {
    members: { some: { userId } },
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(statusParam && Object.values(ProjectStatus).includes(statusParam)
      ? { status: statusParam }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: { select: { contractors: true, payments: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  const projectIds = rows.map((p) => p.id);
  const itemsByProject = new Map<string, number>();
  const attachmentsByProject = new Map<string, number>();

  if (projectIds.length > 0) {
    const [catRows, attGroups] = await Promise.all([
      prisma.category.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, _count: { select: { budgetItems: true } } },
      }),
      prisma.attachment.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
    ]);

    for (const c of catRows) {
      itemsByProject.set(
        c.projectId,
        (itemsByProject.get(c.projectId) ?? 0) + c._count.budgetItems
      );
    }
    for (const g of attGroups) {
      if (g.projectId) attachmentsByProject.set(g.projectId, g._count._all);
    }
  }

  const data = rows.map((p) => {
    const role = p.members[0]?.role ?? null;
    const { members, ...rest } = p;
    const itemCount = itemsByProject.get(p.id) ?? 0;
    const attCount = attachmentsByProject.get(p.id) ?? 0;
    const canDelete =
      role === "ADMIN" &&
      rest._count.payments === 0 &&
      rest._count.contractors === 0 &&
      itemCount === 0 &&
      attCount === 0;

    return {
      ...serializeProject(rest),
      role,
      canDelete,
    };
  });

  res.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ============================================================================
// POST /api/projects — Crear (el usuario queda como ADMIN del proyecto)
// ============================================================================
export async function createProject(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateProjectInput;

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: body.name,
        description: body.description,
        address: body.address,
        initialBudget: body.initialBudget ?? 0,
        status: body.status ?? "PLANNING",
      },
    });

    await tx.projectMember.create({
      data: {
        userId: req.user!.userId,
        projectId: p.id,
        role: "ADMIN",
      },
    });

    await tx.category.createMany({
      data: DEFAULT_BUDGET_CATEGORIES.map((name, sortOrder) => ({
        projectId: p.id,
        name,
        sortOrder,
      })),
    });

    await tx.activityLog.create({
      data: {
        userId: req.user!.userId,
        projectId: p.id,
        action: "CREATE_PROJECT",
        entityType: "Project",
        entityId: p.id,
        metadata: { name: body.name },
      },
    });

    return p;
  });

  res.status(201).json({
    ...serializeProject(project),
    role: "ADMIN" as const,
    canDelete: true,
  });
}

// ============================================================================
// DELETE /api/projects/:projectId — Solo ADMIN; proyecto sin datos operativos
// ============================================================================
export async function deleteProject(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;

  const membership = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return;
  }
  if (membership.role !== "ADMIN") {
    res.status(403).json({
      error: "Solo un administrador del proyecto puede eliminarlo",
    });
    return;
  }

  const deletable = await evaluateProjectDeletable(projectId);
  if (!deletable.ok) {
    res.status(409).json({
      error: deletable.reason,
      details: deletable.details,
    });
    return;
  }

  await prisma.project.delete({ where: { id: projectId } });
  res.status(204).send();
}
