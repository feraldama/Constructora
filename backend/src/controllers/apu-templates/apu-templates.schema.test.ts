import { describe, expect, it } from "vitest";
import { manualAPUSchema, updateAPUTemplateSchema } from "./apu-templates.schema.js";

const CATEGORY = "31bbed40-a68b-4cb6-ad8e-6f0646eaced4";
const MAT_A = "43b85590-9ffc-4989-b4c1-2f6eb730cff4";
const MAT_B = "36068787-36ef-40eb-a089-5523f14d5ef0";

const base = {
  categoryId: CATEGORY,
  name: "Subrubro de prueba",
  unit: "M2" as const,
};

/** Devuelve los mensajes de error por campo de un parseo fallido. */
function errors(input: unknown): Record<string, string[] | undefined> {
  const result = manualAPUSchema.safeParse(input);
  if (result.success) throw new Error("se esperaba un error de validación");
  return result.error.flatten().fieldErrors;
}

describe("manualAPUSchema", () => {
  it("acepta una composición con material del catálogo y mano de obra", () => {
    const parsed = manualAPUSchema.parse({
      ...base,
      quantity: 10,
      materials: [{ materialId: MAT_A, consumptionPerUnit: 2.5, wastePercent: 5 }],
      labor: [{ description: "Oficial", costPerUnit: 15000 }],
    });
    expect(parsed.materials[0]).toMatchObject({ materialId: MAT_A, wastePercent: 5 });
    expect(parsed.replaceExisting).toBe(false);
    expect(parsed.saveAsTemplate).toBe(false);
  });

  it("acepta un material nuevo inline y le pone los defaults", () => {
    const parsed = manualAPUSchema.parse({
      ...base,
      materials: [
        {
          newMaterial: { name: "Insumo nuevo", unit: "KG", unitPrice: 57000 },
          consumptionPerUnit: 1,
        },
      ],
      labor: [],
    });
    expect(parsed.materials[0].newMaterial).toMatchObject({
      presentationQty: 1,
      category: "OTHER",
    });
    expect(parsed.materials[0].wastePercent).toBe(0);
  });

  it("exige materialId o newMaterial, pero no ambos", () => {
    // Sin ninguno de los dos: este caso hacía crashear el refine de duplicados
    expect(errors({ ...base, materials: [{ consumptionPerUnit: 1 }], labor: [] }).materials)
      .toBeDefined();

    expect(
      errors({
        ...base,
        materials: [
          {
            materialId: MAT_A,
            newMaterial: { name: "x", unit: "KG", unitPrice: 1 },
            consumptionPerUnit: 1,
          },
        ],
        labor: [],
      }).materials
    ).toBeDefined();
  });

  it("rechaza una composición vacía", () => {
    expect(errors({ ...base, materials: [], labor: [] }).materials).toContain(
      "Agregá al menos un material o una línea de mano de obra"
    );
  });

  it("rechaza materiales repetidos por id", () => {
    expect(
      errors({
        ...base,
        materials: [
          { materialId: MAT_A, consumptionPerUnit: 1 },
          { materialId: MAT_A, consumptionPerUnit: 2 },
        ],
        labor: [],
      }).materials
    ).toContain("Hay materiales repetidos en la composición");
  });

  it("rechaza materiales nuevos con nombres equivalentes", () => {
    expect(
      errors({
        ...base,
        materials: [
          { newMaterial: { name: "Cemento Pórtland", unit: "KG", unitPrice: 1 }, consumptionPerUnit: 1 },
          { newMaterial: { name: "cemento  portland", unit: "KG", unitPrice: 2 }, consumptionPerUnit: 2 },
        ],
        labor: [],
      }).materials
    ).toContain("Hay materiales repetidos en la composición");
  });

  it("valida consumo y desperdicio con mensajes en español", () => {
    expect(
      errors({ ...base, materials: [{ materialId: MAT_A, consumptionPerUnit: 0 }], labor: [] })
        .materials
    ).toContain("El consumo debe ser mayor a 0");

    expect(
      errors({
        ...base,
        materials: [{ materialId: MAT_A, consumptionPerUnit: 1, wastePercent: 150 }],
        labor: [],
      }).materials
    ).toContain("El desperdicio no puede superar el 100%");
  });

  it("exige rubro cuando se guarda como plantilla", () => {
    expect(
      errors({
        ...base,
        materials: [{ materialId: MAT_B, consumptionPerUnit: 1 }],
        labor: [],
        saveAsTemplate: true,
      }).rubro
    ).toContain("Indicá el rubro para guardar la composición como plantilla");
  });

  it("exige categoryId o budgetItemId", () => {
    expect(
      errors({
        name: "Sin destino",
        materials: [{ materialId: MAT_B, consumptionPerUnit: 1 }],
        labor: [],
      }).categoryId
    ).toContain("Se requiere categoryId o budgetItemId");
  });
});

describe("updateAPUTemplateSchema", () => {
  const errores = (input: unknown): Record<string, string[] | undefined> => {
    const r = updateAPUTemplateSchema.safeParse(input);
    if (r.success) throw new Error("se esperaba un error de validación");
    return r.error.flatten().fieldErrors;
  };

  it("permite corregir sólo un campo", () => {
    const parsed = updateAPUTemplateSchema.parse({ name: "Nombre corregido" });
    expect(parsed).toEqual({ name: "Nombre corregido" });
    expect("materials" in parsed).toBe(false);
  });

  it("permite desactivar la plantilla", () => {
    expect(updateAPUTemplateSchema.parse({ isActive: false }).isActive).toBe(false);
  });

  it("acepta reemplazar la composición y completa el desperdicio", () => {
    const parsed = updateAPUTemplateSchema.parse({
      materials: [{ materialId: MAT_A, consumptionPerUnit: 3 }],
      labor: [{ description: "Oficial" }],
    });
    expect(parsed.materials?.[0]).toMatchObject({ materialId: MAT_A, wastePercent: 0 });
    expect(parsed.labor?.[0]).toMatchObject({ description: "Oficial", costPerUnit: 0 });
  });

  it("rechaza un cuerpo vacío", () => {
    expect(updateAPUTemplateSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza materiales repetidos", () => {
    expect(
      errores({
        materials: [
          { materialId: MAT_A, consumptionPerUnit: 1 },
          { materialId: MAT_A, consumptionPerUnit: 2 },
        ],
      }).materials
    ).toContain("Hay materiales repetidos en la plantilla");
  });

  it("no deja vaciar la composición completa", () => {
    expect(errores({ materials: [], labor: [] }).materials).toContain(
      "La plantilla necesita al menos un material o una mano de obra"
    );
    // Vaciar sólo una de las dos sí se permite (la otra queda como estaba)
    expect(updateAPUTemplateSchema.safeParse({ labor: [] }).success).toBe(true);
  });

  it("valida consumo y desperdicio de las líneas nuevas", () => {
    expect(errores({ materials: [{ materialId: MAT_A, consumptionPerUnit: 0 }] }).materials).toContain(
      "El consumo debe ser mayor a 0"
    );
    expect(
      errores({ materials: [{ materialId: MAT_A, consumptionPerUnit: 1, wastePercent: 120 }] }).materials
    ).toContain("El desperdicio no puede superar el 100%");
  });
});
