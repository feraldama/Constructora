import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import type { UpdateProfileInput, ChangePasswordInput } from "./account.schema.js";

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  globalRole: true,
  isActive: true,
  createdAt: true,
} as const;

/** GET /api/account/profile — current user profile */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: PROFILE_SELECT,
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json(user);
}

/** PATCH /api/account/profile — update own profile */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateProfileInput;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    select: PROFILE_SELECT,
  });

  res.json(user);
}

/** POST /api/account/change-password */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, password: true },
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(400).json({ error: "La contraseña actual es incorrecta" });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  res.json({ message: "Contraseña actualizada correctamente" });
}
