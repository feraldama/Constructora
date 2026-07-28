import { z } from "zod";
import { MeasurementUnit, MaterialCategory } from "../../generated/prisma/enums.js";
import { normalizeName } from "../../utils/text.js";

/** Aplicar una plantilla APU a un BudgetItem existente o crear uno nuevo. */
export const applyAPUTemplateSchema = z
  .object({
    // Opción A: crear un nuevo BudgetItem en una categoría dada
    categoryId: z.string().uuid().optional(),
    // Opción B: aplicar a un BudgetItem ya creado
    budgetItemId: z.string().uuid().optional(),
    // Sobrescribir el nombre (opcional)
    name: z.string().min(1).optional(),
    quantity: z.coerce.number().nonnegative().optional().default(0),
    // Si true, reemplaza líneas APU existentes en el item destino
    replaceExisting: z.boolean().optional().default(false),
  })
  .refine((d) => d.categoryId || d.budgetItemId, {
    message: "Se requiere categoryId o budgetItemId",
  });

export type ApplyAPUTemplateInput = z.infer<typeof applyAPUTemplateSchema>;

/** Material que todavía no está en el catálogo y se crea junto con la partida. */
const manualAPUNewMaterialSchema = z.object({
  name: z.string().min(1, "El nombre del material es requerido"),
  unit: z.nativeEnum(MeasurementUnit),
  unitPrice: z.coerce.number().nonnegative("El precio del material no puede ser negativo"),
  presentationQty: z.coerce
    .number()
    .positive("La cantidad por envase debe ser mayor a 0")
    .optional()
    .default(1),
  category: z.nativeEnum(MaterialCategory).optional().default("OTHER"),
});

/**
 * Línea de material de una composición APU cargada a mano: referencia a un
 * material del catálogo (`materialId`) o alta de uno nuevo (`newMaterial`),
 * que se crea en la misma transacción que la partida.
 */
const manualAPUMaterialSchema = z
  .object({
    materialId: z.string().uuid().optional(),
    newMaterial: manualAPUNewMaterialSchema.optional(),
    consumptionPerUnit: z.coerce.number().positive("El consumo debe ser mayor a 0"),
    wastePercent: z.coerce
      .number()
      .min(0, "El desperdicio no puede ser negativo")
      .max(100, "El desperdicio no puede superar el 100%")
      .optional()
      .default(0),
  })
  .refine((m) => !!m.materialId !== !!m.newMaterial, {
    message: "Cada material debe venir del catálogo o traer los datos para crearlo",
  });

/** Línea de mano de obra de una composición APU cargada a mano. */
const manualAPULaborSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  costPerUnit: z.coerce.number().nonnegative().optional().default(0),
});

/**
 * Carga manual de un subrubro (partida + APU completo) desde Cómputo Métrico,
 * sin depender de una plantilla del catálogo. Opcionalmente guarda la
 * composición como plantilla nueva para reutilizarla.
 */
export const manualAPUSchema = z
  .object({
    // Opción A: crear una partida nueva en esta categoría
    categoryId: z.string().uuid().optional(),
    // Opción B: cargar la composición sobre una partida existente
    budgetItemId: z.string().uuid().optional(),
    name: z.string().min(1, "El nombre del subrubro es requerido"),
    unit: z.nativeEnum(MeasurementUnit).optional(),
    quantity: z.coerce.number().nonnegative().optional().default(0),
    description: z.string().optional().nullable(),
    materials: z.array(manualAPUMaterialSchema).optional().default([]),
    labor: z.array(manualAPULaborSchema).optional().default([]),
    replaceExisting: z.boolean().optional().default(false),
    // Guardar la composición en el catálogo de plantillas APU
    saveAsTemplate: z.boolean().optional().default(false),
    rubro: z.string().min(1).optional(),
  })
  .refine((d) => d.categoryId || d.budgetItemId, {
    message: "Se requiere categoryId o budgetItemId",
    path: ["categoryId"],
  })
  .refine((d) => d.materials.length > 0 || d.labor.length > 0, {
    message: "Agregá al menos un material o una línea de mano de obra",
    path: ["materials"],
  })
  .refine(
    (d) => {
      // Repetidos por id del catálogo o por nombre de material nuevo. Los
      // nombres nuevos que colisionen con el catálogo los resuelve el
      // controller (reusa el material existente en lugar de duplicarlo).
      // Ojo: este refine corre incluso si una línea no trae ni materialId ni
      // newMaterial (ese caso lo reporta el refine de la línea), así que no se
      // puede asumir que newMaterial exista.
      const keys = d.materials.map((m) =>
        m.materialId ? `id:${m.materialId}` : `name:${normalizeName(m.newMaterial?.name ?? "")}`
      );
      return new Set(keys).size === keys.length;
    },
    {
      message: "Hay materiales repetidos en la composición",
      path: ["materials"],
    }
  )
  .refine((d) => !d.saveAsTemplate || !!d.rubro?.trim(), {
    message: "Indicá el rubro para guardar la composición como plantilla",
    path: ["rubro"],
  });

export type ManualAPUInput = z.infer<typeof manualAPUSchema>;

/** Línea de material de una plantilla (el material tiene que existir ya). */
const templateMaterialSchema = z.object({
  materialId: z.string().uuid(),
  consumptionPerUnit: z.coerce.number().positive("El consumo debe ser mayor a 0"),
  wastePercent: z.coerce
    .number()
    .min(0, "El desperdicio no puede ser negativo")
    .max(100, "El desperdicio no puede superar el 100%")
    .optional()
    .default(0),
});

const templateLaborSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  costPerUnit: z.coerce.number().nonnegative().optional().default(0),
});

/**
 * Edición de una plantilla APU del catálogo. Todos los campos son opcionales:
 * se puede corregir sólo el nombre, sólo desactivarla, o reemplazar la
 * composición completa (si viene `materials` o `labor`, sustituyen a las
 * líneas actuales).
 */
export const updateAPUTemplateSchema = z
  .object({
    rubro: z.string().min(1, "El rubro es requerido").optional(),
    name: z.string().min(1, "El nombre es requerido").optional(),
    unit: z.nativeEnum(MeasurementUnit).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    materials: z.array(templateMaterialSchema).optional(),
    labor: z.array(templateLaborSchema).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "No hay cambios para guardar",
  })
  .refine(
    (d) =>
      d.materials === undefined ||
      new Set(d.materials.map((m) => m.materialId)).size === d.materials.length,
    { message: "Hay materiales repetidos en la plantilla", path: ["materials"] }
  )
  .refine(
    (d) =>
      // Una plantilla sin líneas no sirve para nada: si se reemplaza la
      // composición, tiene que quedar al menos un material o una MO.
      d.materials === undefined ||
      d.labor === undefined ||
      d.materials.length > 0 ||
      d.labor.length > 0,
    { message: "La plantilla necesita al menos un material o una mano de obra", path: ["materials"] }
  );

export type UpdateAPUTemplateInput = z.infer<typeof updateAPUTemplateSchema>;
