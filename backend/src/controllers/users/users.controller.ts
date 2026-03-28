import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { GlobalRole } from "../../generated/prisma/client.js";
import type {
  ListUsersInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "./users.schema.js";

function paramId(req: Request): string {
  const id = req.params.id;
  return typeof id === "string" ? id : String(id);
}

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  globalRole: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { projectMembers: true } },
} as const;

/** GET /api/users — list all users (admin) */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page, limit, search, role, isActive } = req.query as unknown as ListUsersInput;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.globalRole = role;
  if (isActive !== undefined) where.isActive = isActive;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/** GET /api/users/:id — single user detail */
export async function getUser(req: Request, res: Response): Promise<void> {
  const id = paramId(req);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_SELECT,
      projectMembers: {
        select: {
          id: true,
          role: true,
          joinedAt: true,
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json(user);
}

/** PATCH /api/users/:id/role — change global role */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const { globalRole } = req.body as UpdateUserRoleInput;

  // Prevent demoting the last SUPER_ADMIN
  if (globalRole !== "SUPER_ADMIN") {
    const target = await prisma.user.findUnique({ where: { id }, select: { globalRole: true } });
    if (target?.globalRole === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({ where: { globalRole: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        res.status(400).json({ error: "No se puede quitar el rol al último Super Admin" });
        return;
      }
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { globalRole },
      select: USER_SELECT,
    });

    await tx.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: "CHANGE_GLOBAL_ROLE",
        entityType: "USER",
        entityId: id,
        metadata: JSON.parse(JSON.stringify({ newRole: globalRole })),
      },
    });

    return updated;
  });

  res.json(user);
}

/** PATCH /api/users/:id/status — activate / deactivate user */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const { isActive } = req.body as UpdateUserStatusInput;

  // Prevent deactivating yourself
  if (id === req.user!.userId && !isActive) {
    res.status(400).json({ error: "No podés desactivar tu propia cuenta" });
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });

    await tx.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        entityType: "USER",
        entityId: id,
        metadata: JSON.parse(JSON.stringify({ isActive })),
      },
    });

    return updated;
  });

  res.json(user);
}
