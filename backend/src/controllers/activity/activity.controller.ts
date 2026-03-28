import { Request, Response } from "express";
import prisma from "../../config/prisma.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

// GET /api/activity?projectId=xxx&page=1&limit=50
export async function listActivityLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const projectId = queryString(req.query.projectId);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  // Only show logs from projects the user is a member of
  const memberProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const allowedProjectIds = memberProjects.map((m) => m.projectId);

  if (allowedProjectIds.length === 0) {
    res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    return;
  }

  const where = {
    projectId: projectId
      ? { in: allowedProjectIds.includes(projectId) ? [projectId] : [] }
      : { in: allowedProjectIds },
  };

  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
