import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";
import type { GlobalRole } from "../generated/prisma/client.js";

/**
 * Middleware factory that restricts access to users with the required global role(s).
 * Must be placed AFTER authMiddleware.
 *
 * Usage:  router.get("/admin/users", requireRole("SUPER_ADMIN", "ADMIN"), handler)
 */
export function requireRole(...roles: GlobalRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { globalRole: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ error: "Cuenta desactivada" });
      return;
    }

    if (!roles.includes(user.globalRole)) {
      res.status(403).json({ error: "No tenés permisos para esta acción" });
      return;
    }

    next();
  };
}
