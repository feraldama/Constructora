import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import { generateToken } from "../../middlewares/auth.js";
import { RegisterInput, LoginInput } from "./auth.schema.js";

export async function register(req: Request, res: Response): Promise<void> {
  const data: RegisterInput = req.body;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    res.status(409).json({ error: "El email ya está registrado" });
    return;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: { id: true, email: true, firstName: true, lastName: true, globalRole: true },
  });

  const token = generateToken({ userId: user.id, email: user.email });

  res.status(201).json({ user, token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const data: LoginInput = req.body;

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const valid = await bcrypt.compare(data.password, user.password);

  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.globalRole,
    },
    token,
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      globalRole: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json(user);
}
