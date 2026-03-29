import { Request, Response } from "express";
import {
  getProjectFinancialSummary,
  getItemsFinancial,
} from "../../services/finance.service.js";
import { getVarianceAnalysis } from "../../services/variance.service.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

// GET /api/projects/:projectId/finance/summary
export async function financialSummary(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const summary = await getProjectFinancialSummary(projectId);
  res.json(summary);
}

// GET /api/projects/:projectId/finance/items
export async function financialItems(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const items = await getItemsFinancial(projectId);
  res.json(items);
}

// GET /api/projects/:projectId/finance/variance
export async function varianceAnalysis(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const result = await getVarianceAnalysis(projectId);
  res.json(result);
}
