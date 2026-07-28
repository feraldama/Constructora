/**
 * Mantenimiento del catálogo de plantillas APU (PATCH y DELETE) contra una API
 * viva. Se saltea sola sin TEST_API_URL — ver `tests/helpers.ts` y CLAUDE.md.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { API, limpiarDatosDePrueba, makeClient, prisma, type Json } from "./helpers.js";

const PREFIX = "ZZCRUD";
const suite = API ? describe : describe.skip;

suite("mantenimiento del catálogo de plantillas", () => {
  const { req, bootstrap } = makeClient();
  let categoryId: string;
  let materialId: string;
  let templateId: string;
  const rubro = `${PREFIX} Rubro`;
  const nombreBase = `${PREFIX} plantilla`;

  beforeAll(async () => {
    ({ categoryId } = await bootstrap());
    await limpiarDatosDePrueba(PREFIX);

    const material = await req("/materials", {
      method: "POST",
      body: { name: `${PREFIX} Insumo`, unit: "KG", unitPrice: 10000, presentationQty: 10 },
    });
    expect(material.status, "material de prueba").toBe(201);
    materialId = material.json.id;

    // La plantilla base se crea con el mismo flujo que usa la UI
    const creada = await req("/apu-templates/manual", {
      method: "POST",
      body: {
        categoryId,
        name: nombreBase,
        unit: "M2",
        materials: [{ materialId, consumptionPerUnit: 2 }],
        labor: [{ description: "Oficial", costPerUnit: 5000 }],
        saveAsTemplate: true,
        rubro,
      },
    });
    expect(creada.status, "plantilla base").toBe(201);
    templateId = creada.json.templateId;
    expect(templateId).toBeTruthy();
  });

  afterAll(async () => {
    await limpiarDatosDePrueba(PREFIX);
    await prisma.$disconnect();
  });

  it("corrige sólo el nombre sin tocar la composición", async () => {
    const res = await req(`/apu-templates/${templateId}`, {
      method: "PATCH",
      body: { name: `${PREFIX} plantilla renombrada` },
    });
    expect(res.status).toBe(200);
    expect(res.json.name).toBe(`${PREFIX} plantilla renombrada`);
    expect(res.json.materials).toHaveLength(1);
    expect(res.json.labor).toHaveLength(1);
    expect(res.json.totalCost).toBeCloseTo(2 * (10000 / 10) + 5000, 2);
  });

  it("reemplaza la composición y recalcula los totales", async () => {
    const res = await req(`/apu-templates/${templateId}`, {
      method: "PATCH",
      body: {
        materials: [{ materialId, consumptionPerUnit: 5, wastePercent: 10 }],
        labor: [],
      },
    });
    expect(res.status).toBe(200);
    expect(res.json.materials).toHaveLength(1);
    expect(res.json.materials[0].consumptionPerUnit).toBe(5);
    expect(res.json.labor).toHaveLength(0);
    expect(res.json.totalCost).toBeCloseTo(5 * 1.1 * (10000 / 10), 2);
  });

  it("desactiva la plantilla y deja de ofrecerla en el catálogo", async () => {
    const off = await req(`/apu-templates/${templateId}`, {
      method: "PATCH",
      body: { isActive: false },
    });
    expect(off.status).toBe(200);
    expect(off.json.isActive).toBe(false);

    const activas = await req(`/apu-templates?isActive=true&rubro=${encodeURIComponent(rubro)}`);
    expect(activas.json.some((t: Json) => t.id === templateId)).toBe(false);

    const on = await req(`/apu-templates/${templateId}`, {
      method: "PATCH",
      body: { isActive: true },
    });
    expect(on.json.isActive).toBe(true);
  });

  it("rechaza el nombre repetido dentro del rubro", async () => {
    const vecina = await req("/apu-templates/manual", {
      method: "POST",
      body: {
        categoryId,
        name: `${PREFIX} plantilla vecina`,
        unit: "M2",
        materials: [{ materialId, consumptionPerUnit: 1 }],
        labor: [],
        saveAsTemplate: true,
        rubro,
      },
    });
    expect(vecina.status).toBe(201);

    const choque = await req(`/apu-templates/${vecina.json.templateId}`, {
      method: "PATCH",
      body: { name: `${PREFIX} plantilla renombrada` },
    });
    expect(choque.status).toBe(409);
    expect(choque.json.error).toMatch(/Ya existe otra plantilla/);
  });

  it("rechaza materiales inexistentes y cuerpos vacíos sin cambiar nada", async () => {
    const fantasma = await req(`/apu-templates/${templateId}`, {
      method: "PATCH",
      body: {
        materials: [
          { materialId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", consumptionPerUnit: 1 },
        ],
      },
    });
    expect(fantasma.status).toBe(400);

    const vacio = await req(`/apu-templates/${templateId}`, { method: "PATCH", body: {} });
    expect(vacio.status).toBe(400);

    const detalle = await req(`/apu-templates/${templateId}`);
    expect(detalle.json.materials).toHaveLength(1);
  });

  it("borra la plantilla sin tocar las partidas creadas con ella", async () => {
    const aplicada = await req(`/apu-templates/${templateId}/apply`, {
      method: "POST",
      body: { categoryId, quantity: 2 },
    });
    expect(aplicada.status).toBe(201);
    const budgetItemId = aplicada.json.budgetItemId;
    const apuAntes = await req(`/budget-items/${budgetItemId}/apu`);
    expect(apuAntes.json.materials.length).toBeGreaterThan(0);

    const del = await req(`/apu-templates/${templateId}`, { method: "DELETE" });
    expect(del.status).toBe(204);
    expect((await req(`/apu-templates/${templateId}`)).status).toBe(404);

    // La partida conserva su APU: la plantilla es un molde, no una referencia
    const apuDespues = await req(`/budget-items/${budgetItemId}/apu`);
    expect(apuDespues.json.materials).toHaveLength(apuAntes.json.materials.length);
    expect(apuDespues.json.totalCost).toBe(apuAntes.json.totalCost);
  });

  it("404 al editar o borrar una plantilla inexistente", async () => {
    const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    expect(
      (await req(`/apu-templates/${id}`, { method: "PATCH", body: { name: "x" } })).status
    ).toBe(404);
    expect((await req(`/apu-templates/${id}`, { method: "DELETE" })).status).toBe(404);
  });
});
