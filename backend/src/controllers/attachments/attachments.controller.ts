import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { storage } from "../../services/storage.service.js";
import type { AttachmentEntity, Prisma } from "../../generated/prisma/client.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

// Mapeo entityType → FK column
const FK_MAP: Record<string, string> = {
  PROJECT: "projectId",
  BUDGET_ITEM: "budgetItemId",
  CONTRACTOR: "contractorId",
  PAYMENT: "paymentId",
};

// Mapeo entityType → carpeta de storage
const FOLDER_MAP: Record<string, string> = {
  PROJECT: "projects",
  BUDGET_ITEM: "budget-items",
  CONTRACTOR: "contractors",
  PAYMENT: "payments",
};

// ============================================================================
// POST /api/attachments — Subir 1 o más archivos
// ============================================================================
export async function uploadAttachments(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({ error: "No se enviaron archivos" });
    return;
  }

  const entityType = req.body.entityType as AttachmentEntity | undefined;
  const entityId = req.body.entityId as string | undefined;

  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType y entityId son requeridos" });
    return;
  }

  if (!FK_MAP[entityType]) {
    res.status(400).json({ error: `entityType inválido: ${entityType}` });
    return;
  }

  // Verificar que la entidad existe
  const exists = await verifyEntityExists(entityType, entityId);
  if (!exists) {
    res.status(404).json({ error: `${entityType} con id ${entityId} no encontrado` });
    return;
  }

  const folder = FOLDER_MAP[entityType];
  const fkField = FK_MAP[entityType];

  // Subir archivos en paralelo
  const uploadPromises = files.map((file) => storage.upload(file, folder));
  const results = await Promise.all(uploadPromises);

  // Guardar en BD
  const attachments = await Promise.all(
    results.map((result) =>
      prisma.attachment.create({
        data: {
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          entityType,
          [fkField]: entityId,
        },
      })
    )
  );

  // Log
  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      action: "UPLOAD_ATTACHMENT",
      entityType,
      entityId,
      metadata: {
        fileCount: attachments.length,
        fileNames: results.map((r) => r.fileName),
        totalSize: results.reduce((s, r) => s + r.fileSize, 0),
      } as Prisma.InputJsonValue,
    },
  });

  res.status(201).json(attachments);
}

// ============================================================================
// GET /api/attachments?entityType=PAYMENT&entityId=xxx
// ============================================================================
export async function listAttachments(req: Request, res: Response): Promise<void> {
  const entityType = queryString(req.query.entityType) as AttachmentEntity | undefined;
  const entityId = queryString(req.query.entityId);

  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType y entityId son requeridos" });
    return;
  }

  const fkField = FK_MAP[entityType];
  if (!fkField) {
    res.status(400).json({ error: `entityType inválido: ${entityType}` });
    return;
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      entityType,
      [fkField]: entityId,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(attachments);
}

// ============================================================================
// DELETE /api/attachments/:id
// ============================================================================
export async function deleteAttachment(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id : String(req.params.id);

  const attachment = await prisma.attachment.findUnique({ where: { id } });

  if (!attachment) {
    res.status(404).json({ error: "Archivo no encontrado" });
    return;
  }

  // Eliminar del storage
  try {
    // Extraer path relativo de la URL
    const filePath = attachment.fileUrl.replace(/^\/uploads\//, "");
    await storage.delete(filePath);
  } catch {
    // Si falla el delete del storage, igual eliminamos el registro
    console.warn(`No se pudo eliminar archivo del storage: ${attachment.fileUrl}`);
  }

  await prisma.attachment.delete({ where: { id } });

  res.status(204).send();
}

// ============================================================================
// Helper: verificar que la entidad destino existe
// ============================================================================
async function verifyEntityExists(
  entityType: string,
  entityId: string
): Promise<boolean> {
  switch (entityType) {
    case "PROJECT":
      return !!(await prisma.project.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "BUDGET_ITEM":
      return !!(await prisma.budgetItem.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "CONTRACTOR":
      return !!(await prisma.contractor.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "PAYMENT":
      return !!(await prisma.payment.findUnique({ where: { id: entityId }, select: { id: true } }));
    default:
      return false;
  }
}
