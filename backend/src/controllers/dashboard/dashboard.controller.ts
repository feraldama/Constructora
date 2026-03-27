import { Request, Response } from "express";
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
