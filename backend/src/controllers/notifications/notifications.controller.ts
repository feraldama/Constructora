import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { runAlertChecks } from "../../services/alerts.service.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

// ============================================================================
// GET /api/notifications — Listar notificaciones del usuario autenticado
// ============================================================================
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const unreadOnly = queryString(req.query.unreadOnly) === "true";
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) where.isRead = false;

  const skip = (page - 1) * limit;

  // Usa índice notifications(user_id, is_read, created_at DESC)
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  res.json({
    data: notifications,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ============================================================================
// PATCH /api/notifications/:id/read — Marcar como leída
// ============================================================================
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id : String(req.params.id);
  const userId = req.user!.userId;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    res.status(404).json({ error: "Notificacion no encontrada" });
    return;
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json({ success: true });
}

// ============================================================================
// PATCH /api/notifications/read-all — Marcar todas como leídas
// ============================================================================
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  res.json({ updated: result.count });
}

// ============================================================================
// GET /api/notifications/unread-count — Contador para badge del sidebar
// ============================================================================
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  res.json({ count });
}

// ============================================================================
// POST /api/notifications/run-alerts — Ejecutar alertas manualmente (admin)
// ============================================================================
export async function triggerAlerts(_req: Request, res: Response): Promise<void> {
  const result = await runAlertChecks();
  res.json(result);
}
