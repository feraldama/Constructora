import prisma from "../config/prisma.js";
import { recalcBudgetSummary } from "./payments.service.js";
import type { MeasurementUnit } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

/**
 * Recalcula el APU de un BudgetItem:
 * 1. Suma subtotales de materiales + costos de MO
 * 2. Actualiza costUnitPrice y costSubtotal del BudgetItem
 * 3. Recalcula el BudgetSummary del proyecto
 */
export async function recalcAPU(budgetItemId: string): Promise<void> {
  const [materials, labor] = await Promise.all([
    prisma.budgetItemMaterial.aggregate({
      where: { budgetItemId },
      _sum: { subtotal: true },
    }),
    prisma.budgetItemLabor.aggregate({
      where: { budgetItemId },
      _sum: { costPerUnit: true },
    }),
  ]);

  const totalMaterials = Number(materials._sum.subtotal ?? 0);
  const totalLabor = Number(labor._sum.costPerUnit ?? 0);
  const costUnitPrice = totalMaterials + totalLabor;

  // Actualizar BudgetItem
  const item = await prisma.budgetItem.findUniqueOrThrow({
    where: { id: budgetItemId },
    include: { category: { select: { projectId: true } } },
  });

  const quantity = Number(item.quantity);
  const costSubtotal = Math.round(costUnitPrice * quantity * 100) / 100;

  await prisma.budgetItem.update({
    where: { id: budgetItemId },
    data: {
      costUnitPrice,
      costSubtotal,
    },
  });

  // Recalcular resumen del proyecto
  await recalcBudgetSummary(item.category.projectId);
}

/**
 * Actualiza los precios de materiales del APU desde el catálogo global
 * y recalcula los subtotales.
 */
export async function refreshMaterialPrices(budgetItemId: string): Promise<void> {
  const apuMaterials = await prisma.budgetItemMaterial.findMany({
    where: { budgetItemId },
    include: { material: { select: { unitPrice: true, presentationQty: true } } },
  });

  // Actualizar cada línea con el precio actual del catálogo
  await Promise.all(
    apuMaterials.map((line) => {
      const unitCost = Number(line.material.unitPrice) / (Number(line.material.presentationQty) || 1);
      const consumption = Number(line.consumptionPerUnit);
      const waste = Number(line.wastePercent);
      const subtotal = Math.round(consumption * (1 + waste / 100) * unitCost * 100) / 100;

      return prisma.budgetItemMaterial.update({
        where: { id: line.id },
        data: { unitCost, subtotal },
      });
    })
  );

  await recalcAPU(budgetItemId);
}

/**
 * Calcula el subtotal de una línea de material APU.
 */
export function calcMaterialSubtotal(
  consumptionPerUnit: number,
  wastePercent: number,
  unitCost: number
): number {
  return Math.round(consumptionPerUnit * (1 + wastePercent / 100) * unitCost * 100) / 100;
}

// ─── Composición de APU (plantilla o carga manual) ────────────────────────

export interface APUCompositionMaterial {
  materialId: string;
  consumptionPerUnit: number;
  wastePercent?: number;
}

export interface APUCompositionLabor {
  description: string;
  costPerUnit?: number;
}

export interface ApplyAPUCompositionOptions {
  /** Aplicar la composición sobre una partida existente… */
  budgetItemId?: string;
  /** …o crear una partida nueva en esta categoría */
  categoryId?: string;
  /** Nombre de la partida nueva (ignorado si se pasa budgetItemId) */
  name?: string;
  /** Unidad de la partida nueva (ignorado si se pasa budgetItemId) */
  unit?: MeasurementUnit;
  quantity?: number;
  description?: string | null;
  materials?: APUCompositionMaterial[];
  labor?: APUCompositionLabor[];
  /** Borra las líneas APU actuales de la partida destino antes de insertar */
  replaceExisting?: boolean;
  /** Qué hacer si el material ya tiene línea en la partida destino */
  onDuplicateMaterial?: "skip" | "update";
  /** Factor para autocompletar P.U. Venta cuando está en 0 (1.3 = costo + 30%) */
  defaultMarginFactor?: number;
}

export interface APUCompositionTarget {
  budgetItemId: string;
  projectId: string;
  created: boolean;
}

/**
 * Error de negocio de una composición APU. Se lanza dentro de la transacción
 * para que ésta haga rollback, y el controller lo traduce a status + mensaje.
 */
export class APUCompositionError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "APUCompositionError";
  }
}

/**
 * Escribe una composición de APU (materiales + mano de obra) sobre una
 * partida, dentro de la transacción `tx`: crea la partida en `categoryId` o
 * usa la de `budgetItemId` e inserta las líneas con los precios vigentes del
 * catálogo de materiales.
 *
 * No recalcula costos — eso lo hace `finalizeAPUCost` después del commit.
 * Lanza `APUCompositionError` ante datos inválidos.
 */
export async function writeAPUComposition(
  tx: Prisma.TransactionClient,
  opts: ApplyAPUCompositionOptions
): Promise<APUCompositionTarget> {
  const materialLines = opts.materials ?? [];
  const laborLines = opts.labor ?? [];
  const onDuplicate = opts.onDuplicateMaterial ?? "skip";

  // 1. Validar los materiales contra el catálogo ANTES de crear nada
  const materialIds = [...new Set(materialLines.map((m) => m.materialId))];
  const catalog = materialIds.length
    ? await tx.material.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, unitPrice: true, presentationQty: true },
      })
    : [];
  if (catalog.length !== materialIds.length) {
    const found = new Set(catalog.map((m) => m.id));
    const missing = materialIds.filter((id) => !found.has(id));
    throw new APUCompositionError(
      400,
      `Materiales inexistentes en el catálogo: ${missing.join(", ")}`
    );
  }
  const priceMap = new Map(catalog.map((m) => [m.id, m]));

  // 2. Resolver la partida destino
  let budgetItemId: string;
  let projectId: string;
  let created = false;

  if (opts.budgetItemId) {
    const target = await tx.budgetItem.findUnique({
      where: { id: opts.budgetItemId },
      include: { category: { select: { projectId: true } } },
    });
    if (!target) throw new APUCompositionError(404, "Partida destino no encontrada");
    budgetItemId = target.id;
    projectId = target.category.projectId;
  } else if (opts.categoryId) {
    const category = await tx.category.findUnique({
      where: { id: opts.categoryId },
      select: { id: true, projectId: true },
    });
    if (!category) throw new APUCompositionError(404, "Categoría no encontrada");
    projectId = category.projectId;

    const maxSort = await tx.budgetItem.aggregate({
      where: { categoryId: category.id },
      _max: { sortOrder: true },
    });
    const item = await tx.budgetItem.create({
      data: {
        categoryId: category.id,
        name: opts.name ?? "",
        description: opts.description ?? null,
        unit: opts.unit ?? "M2",
        quantity: opts.quantity ?? 0,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    budgetItemId = item.id;
    created = true;
  } else {
    throw new APUCompositionError(400, "Se requiere categoryId o budgetItemId");
  }

  if (opts.replaceExisting) {
    await tx.budgetItemMaterial.deleteMany({ where: { budgetItemId } });
    await tx.budgetItemLabor.deleteMany({ where: { budgetItemId } });
  }

  // 3. Líneas de material — unitCost = precio del catálogo / cantidad de presentación.
  //    Las líneas ya existentes se resuelven en una sola consulta (@@unique):
  //    "skip" preserva lo cargado, "update" sobrescribe con la composición.
  const existingLines =
    created || materialLines.length === 0
      ? []
      : await tx.budgetItemMaterial.findMany({
          where: { budgetItemId, materialId: { in: materialIds } },
          select: { id: true, materialId: true },
        });
  const existingByMaterial = new Map(existingLines.map((l) => [l.materialId, l.id]));

  const toCreate: {
    budgetItemId: string;
    materialId: string;
    consumptionPerUnit: number;
    wastePercent: number;
    unitCost: number;
    subtotal: number;
  }[] = [];

  for (const line of materialLines) {
    const material = priceMap.get(line.materialId)!;
    const unitCost = Number(material.unitPrice) / (Number(material.presentationQty) || 1);
    const consumptionPerUnit = line.consumptionPerUnit;
    const wastePercent = line.wastePercent ?? 0;
    const data = {
      consumptionPerUnit,
      wastePercent,
      unitCost,
      subtotal: calcMaterialSubtotal(consumptionPerUnit, wastePercent, unitCost),
    };

    const existingId = existingByMaterial.get(line.materialId);
    if (existingId) {
      if (onDuplicate === "skip") continue;
      await tx.budgetItemMaterial.update({ where: { id: existingId }, data });
      continue;
    }
    toCreate.push({ budgetItemId, materialId: line.materialId, ...data });
  }

  if (toCreate.length > 0) {
    await tx.budgetItemMaterial.createMany({ data: toCreate });
  }

  // 4. Líneas de mano de obra
  if (laborLines.length > 0) {
    await tx.budgetItemLabor.createMany({
      data: laborLines.map((l) => ({
        budgetItemId,
        description: l.description,
        costPerUnit: l.costPerUnit ?? 0,
      })),
    });
  }

  return { budgetItemId, projectId, created };
}

/**
 * Cierra el ciclo después de escribir una composición: recalcula el costo
 * unitario desde las líneas APU y autocompleta el P.U. Venta si quedó en 0.
 *
 * Corre fuera de la transacción (es idempotente) porque `recalcAPU` arrastra
 * el recálculo del BudgetSummary del proyecto.
 */
export async function finalizeAPUCost(
  budgetItemId: string,
  defaultMarginFactor = 1.3
): Promise<void> {
  await recalcAPU(budgetItemId);

  const afterRecalc = await prisma.budgetItem.findUniqueOrThrow({
    where: { id: budgetItemId },
    select: { costUnitPrice: true, saleUnitPrice: true, quantity: true },
  });
  if (Number(afterRecalc.saleUnitPrice) === 0 && Number(afterRecalc.costUnitPrice) > 0) {
    const saleUnitPrice =
      Math.round(Number(afterRecalc.costUnitPrice) * defaultMarginFactor * 100) / 100;
    const saleSubtotal =
      Math.round(saleUnitPrice * Number(afterRecalc.quantity) * 100) / 100;
    await prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: { saleUnitPrice, saleSubtotal },
    });
  }
}

/**
 * Aplica una composición de APU en una transacción y recalcula los costos.
 * Es la base compartida entre aplicar una plantilla APU y la carga manual
 * de un subrubro desde Cómputo Métrico.
 *
 * Lanza `APUCompositionError` ante datos inválidos (con rollback).
 */
export async function applyAPUComposition(
  opts: ApplyAPUCompositionOptions
): Promise<APUCompositionTarget> {
  const target = await prisma.$transaction((tx) => writeAPUComposition(tx, opts));
  await finalizeAPUCost(target.budgetItemId, opts.defaultMarginFactor);
  return target;
}

/**
 * Propaga un cambio de precio de un material a todos los APUs que lo usan.
 * Actualiza BudgetItemMaterial.unitCost/subtotal y recalcula el costUnitPrice
 * de cada BudgetItem afectado (y el BudgetSummary de cada proyecto).
 *
 * Se invoca tras:
 *   - PATCH /api/materials/:id (cuando se cambia unitPrice o presentationQty)
 *   - POST /api/purchases (precio de Material se setea al de la nueva compra)
 *
 * @returns número de BudgetItem distintos recalculados
 */
export async function propagateMaterialPriceChange(materialId: string): Promise<number> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { unitPrice: true, presentationQty: true },
  });
  if (!material) return 0;

  const unitCost = Number(material.unitPrice) / (Number(material.presentationQty) || 1);

  const apuLines = await prisma.budgetItemMaterial.findMany({
    where: { materialId },
    select: { id: true, budgetItemId: true, consumptionPerUnit: true, wastePercent: true },
  });
  if (apuLines.length === 0) return 0;

  // Actualizar cada línea con el nuevo unitCost y subtotal
  await Promise.all(
    apuLines.map((line) => {
      const subtotal = calcMaterialSubtotal(
        Number(line.consumptionPerUnit),
        Number(line.wastePercent),
        unitCost
      );
      return prisma.budgetItemMaterial.update({
        where: { id: line.id },
        data: { unitCost, subtotal },
      });
    })
  );

  // Recalcular cada BudgetItem afectado una sola vez
  const itemIds = [...new Set(apuLines.map((l) => l.budgetItemId))];
  for (const itemId of itemIds) {
    await recalcAPU(itemId);
  }
  return itemIds.length;
}
