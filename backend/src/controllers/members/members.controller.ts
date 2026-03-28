import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { AddMemberInput, UpdateMemberRoleInput } from "./members.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

async function assertAdmin(userId: string, projectId: string, res: Response): Promise<boolean> {
  const membership = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    select: { role: true },
  });
  if (!membership) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return false;
  }
  if (membership.role !== "ADMIN") {
    res.status(403).json({ error: "Solo un administrador puede gestionar miembros" });
    return false;
  }
  return true;
}

// GET /api/projects/:projectId/members
export async function listMembers(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;

  // Check membership
  const membership = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    select: { role: true },
  });
  if (!membership) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return;
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  res.json(members);
}

// POST /api/projects/:projectId/members
export async function addMember(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;
  const body = req.body as AddMemberInput;

  if (!(await assertAdmin(userId, projectId, res))) return;

  // Find user by email
  const targetUser = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!targetUser) {
    res.status(404).json({ error: `No existe un usuario con email ${body.email}` });
    return;
  }

  // Check if already member
  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: targetUser.id, projectId } },
  });
  if (existing) {
    res.status(409).json({ error: "Este usuario ya es miembro del proyecto" });
    return;
  }

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.projectMember.create({
      data: {
        userId: targetUser.id,
        projectId,
        role: body.role,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        projectId,
        action: "ADD_MEMBER",
        entityType: "ProjectMember",
        entityId: m.id,
        metadata: JSON.parse(JSON.stringify({ email: body.email, role: body.role })),
      },
    });

    return m;
  });

  res.status(201).json(member);
}

// PATCH /api/projects/:projectId/members/:memberId
export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const memberId = routeParam(req, "memberId");
  const userId = req.user!.userId;
  const body = req.body as UpdateMemberRoleInput;

  if (!(await assertAdmin(userId, projectId, res))) return;

  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
  });
  if (!member) {
    res.status(404).json({ error: "Miembro no encontrado" });
    return;
  }

  // Prevent demoting yourself if you're the last admin
  if (member.userId === userId && body.role !== "ADMIN") {
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      res.status(409).json({ error: "No podés dejar el proyecto sin administradores" });
      return;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.projectMember.update({
      where: { id: memberId },
      data: { role: body.role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    await tx.activityLog.create({
      data: {
        userId,
        projectId,
        action: "UPDATE_MEMBER_ROLE",
        entityType: "ProjectMember",
        entityId: memberId,
        metadata: JSON.parse(JSON.stringify({ role: body.role })),
      },
    });

    return m;
  });

  res.json(updated);
}

// DELETE /api/projects/:projectId/members/:memberId
export async function removeMember(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const memberId = routeParam(req, "memberId");
  const userId = req.user!.userId;

  if (!(await assertAdmin(userId, projectId, res))) return;

  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
  });
  if (!member) {
    res.status(404).json({ error: "Miembro no encontrado" });
    return;
  }

  // Prevent removing yourself if you're the last admin
  if (member.userId === userId) {
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      res.status(409).json({ error: "No podés salir del proyecto siendo el único administrador" });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { id: memberId } });
    await tx.activityLog.create({
      data: {
        userId,
        projectId,
        action: "REMOVE_MEMBER",
        entityType: "ProjectMember",
        entityId: memberId,
        metadata: JSON.parse(JSON.stringify({ removedUserId: member.userId })),
      },
    });
  });

  res.status(204).send();
}
