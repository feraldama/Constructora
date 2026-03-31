import prisma from "../config/prisma.js";
import { recalcBudgetSummary } from "./payments.service.js";

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
    include: { material: { select: { unitPrice: true } } },
  });

  // Actualizar cada línea con el precio actual del catálogo
  await Promise.all(
    apuMaterials.map((line) => {
      const unitCost = Number(line.material.unitPrice);
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
