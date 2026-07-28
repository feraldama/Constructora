import { describe, expect, it } from "vitest";
import { createMaterialSchema, updateMaterialSchema } from "./materials.schema.js";

describe("createMaterialSchema", () => {
  it("aplica los defaults de presentación y categoría", () => {
    const parsed = createMaterialSchema.parse({
      name: "Cemento",
      unit: "KG",
      unitPrice: 57000,
    });
    expect(parsed).toMatchObject({ presentationQty: 1, category: "OTHER" });
    expect(parsed.allowDuplicateName).toBe(false);
  });
});

describe("updateMaterialSchema", () => {
  it("NO inventa valores para los campos ausentes", () => {
    // Regresión: con `createMaterialSchema.partial()` los defaults de Zod se
    // seguían aplicando, así que un PATCH de sólo el precio reescribía
    // presentationQty a 1 y category a OTHER — y presentationQty divide el
    // precio para el costo unitario de todos los APU que usan el material.
    const parsed = updateMaterialSchema.parse({ unitPrice: 60000 });
    expect(parsed).toEqual({ unitPrice: 60000, allowDuplicateName: false });
    expect("presentationQty" in parsed).toBe(false);
    expect("category" in parsed).toBe(false);
    expect("name" in parsed).toBe(false);
  });

  it("permite activar/desactivar el material", () => {
    expect(updateMaterialSchema.parse({ isActive: false }).isActive).toBe(false);
  });

  it("valida los campos que sí vienen", () => {
    expect(updateMaterialSchema.safeParse({ presentationQty: 0 }).success).toBe(false);
    expect(updateMaterialSchema.safeParse({ unitPrice: -1 }).success).toBe(false);
    expect(updateMaterialSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
