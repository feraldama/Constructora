/**
 * Integración de la carga manual de subrubros contra una API viva.
 *
 * Se saltea sola salvo que se le pase a qué instancia apuntar:
 *
 *   TEST_API_URL=http://localhost:4000/api \
 *   TEST_EMAIL=admin@buildcontrol.com TEST_PASSWORD=123456 \
 *   npm test
 *
 * Requiere que el usuario sea miembro de al menos un proyecto con un rubro
 * creado. Todo lo que crea (partidas, materiales, plantillas) lo borra al final.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../src/config/prisma.js";

const API = process.env.TEST_API_URL;
const EMAIL = process.env.TEST_EMAIL ?? "admin@buildcontrol.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "123456";
const PREFIX = "ZZTEST";

const suite = API ? describe : describe.skip;

type Json = Record<string, any>;

/**
 * Borra todo lo que crea la suite. Va por Prisma y no por la API porque no hay
 * endpoints para eliminar plantillas ni usuarios, y el DELETE de un material en
 * uso es baja lógica. Corre antes y después: así una corrida interrumpida no
 * deja datos que hagan fallar la siguiente.
 */
async function limpiarDatosDePrueba(): Promise<void> {
  await prisma.budgetItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.aPUTemplate.deleteMany({ where: { rubro: { startsWith: PREFIX } } });

  const mats = await prisma.material.findMany({
    where: { name: { startsWith: PREFIX, mode: "insensitive" } },
    select: { id: true },
  });
  const ids = mats.map((m) => m.id);
  if (ids.length > 0) {
    await prisma.budgetItemMaterial.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.aPUTemplateMaterial.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.purchase.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.material.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX.toLowerCase() } } });
}

suite("carga manual de subrubro (integración)", () => {
  let token: string;
  let categoryId: string;
  let projectId: string;
  const createdItems: string[] = [];
  const createdMaterials: string[] = [];

  const req = async (
    path: string,
    init: RequestInit & { body?: unknown } = {}
  ): Promise<{ status: number; json: Json }> => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    let json: Json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    return { status: res.status, json };
  };

  const manual = (body: Json) =>
    req("/apu-templates/manual", { method: "POST", body: { categoryId, ...body } });

  beforeAll(async () => {
    const login = await req("/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: PASSWORD },
    });
    expect(login.status, "login").toBe(200);
    token = login.json.token;

    const projects = await req("/projects?page=1&limit=1");
    projectId = projects.json.data[0].id;
    const budget = await req(`/projects/${projectId}/budget`);
    const withItems = budget.json.categories[0];
    expect(withItems, "el proyecto necesita al menos un rubro").toBeTruthy();
    categoryId = withItems.id;

    await limpiarDatosDePrueba();
  });

  afterAll(async () => {
    await limpiarDatosDePrueba();
    await prisma.$disconnect();
  });

  it("crea la partida con material del catálogo y mano de obra", async () => {
    const materials = await req("/materials?isActive=true");
    const mat = materials.json[0];
    const unitCost = mat.unitPrice / (mat.presentationQty || 1);

    const res = await manual({
      name: `${PREFIX} desde catálogo`,
      unit: "M2",
      quantity: 4,
      materials: [{ materialId: mat.id, consumptionPerUnit: 2, wastePercent: 10 }],
      labor: [{ description: "Oficial", costPerUnit: 1000 }],
    });
    expect(res.status).toBe(201);
    createdItems.push(res.json.budgetItemId);

    const esperado = Math.round(2 * 1.1 * unitCost * 100) / 100 + 1000;
    expect(res.json.item.costUnitPrice).toBeCloseTo(esperado, 2);
    // P.U. Venta se autocompleta con el margen default (costo + 30%)
    expect(res.json.item.saleUnitPrice).toBeCloseTo(
      Math.round(esperado * 1.3 * 100) / 100,
      2
    );
  });

  it("da de alta el material nuevo inline y lo reusa por nombre normalizado", async () => {
    const alta = await manual({
      name: `${PREFIX} con material nuevo`,
      unit: "M2",
      quantity: 1,
      materials: [
        {
          newMaterial: {
            name: `${PREFIX} Cemento Pórtland Ñandú`,
            unit: "KG",
            unitPrice: 57000,
            presentationQty: 50,
            category: "CEMENT",
          },
          consumptionPerUnit: 10,
        },
      ],
      labor: [],
    });
    expect(alta.status).toBe(201);
    expect(alta.json.createdMaterialIds).toHaveLength(1);
    createdItems.push(alta.json.budgetItemId);
    createdMaterials.push(alta.json.createdMaterialIds[0]);
    expect(alta.json.item.costUnitPrice).toBeCloseTo(10 * (57000 / 50), 2);

    // Mismo insumo tipeado sin acentos, en minúsculas y con espacios de más
    const reuso = await manual({
      name: `${PREFIX} reuso por nombre`,
      unit: "M2",
      materials: [
        {
          newMaterial: {
            name: `${PREFIX.toLowerCase()}   cemento portland nandu`,
            unit: "KG",
            unitPrice: 999999,
          },
          consumptionPerUnit: 1,
        },
      ],
      labor: [],
    });
    expect(reuso.status).toBe(201);
    createdItems.push(reuso.json.budgetItemId);
    expect(reuso.json.createdMaterialIds, "no debe duplicar el material").toHaveLength(0);
    expect(reuso.json.item.costUnitPrice).toBeCloseTo(57000 / 50, 2);
  });

  it("reutiliza y reactiva un material desactivado en lugar de duplicarlo", async () => {
    const materialId = createdMaterials[0];
    const baja = await req(`/materials/${materialId}`, { method: "DELETE" });
    expect(baja.status, "el material está en uso: baja lógica").toBe(200);
    expect((await req(`/materials/${materialId}`)).json.isActive).toBe(false);

    const res = await manual({
      name: `${PREFIX} reactivación`,
      unit: "M2",
      materials: [{ materialId, consumptionPerUnit: 1 }],
      labor: [],
    });
    expect(res.status).toBe(201);
    createdItems.push(res.json.budgetItemId);
    expect(res.json.reactivatedMaterialIds).toContain(materialId);
    expect((await req(`/materials/${materialId}`)).json.isActive).toBe(true);
    // Y conserva precio y presentación (no se rearma el material)
    expect(res.json.item.costUnitPrice).toBeCloseTo(57000 / 50, 2);
  });

  it("guarda la composición como plantilla y rechaza el nombre duplicado", async () => {
    const materialId = createdMaterials[0];
    const rubro = `${PREFIX} Rubro`;
    const primera = await manual({
      name: `${PREFIX} plantilla`,
      unit: "M2",
      materials: [{ materialId, consumptionPerUnit: 1 }],
      labor: [],
      saveAsTemplate: true,
      rubro,
    });
    expect(primera.status).toBe(201);
    expect(primera.json.templateId).toBeTruthy();
    createdItems.push(primera.json.budgetItemId);

    const detalle = await req(`/apu-templates/${primera.json.templateId}`);
    expect(detalle.json.rubro).toBe(rubro);
    expect(detalle.json.materials).toHaveLength(1);

    // Segundo intento con el mismo rubro+nombre: 409 y rollback completo
    const repetida = await manual({
      name: `${PREFIX} plantilla`,
      unit: "M2",
      materials: [
        { materialId, consumptionPerUnit: 1 },
        {
          newMaterial: { name: `${PREFIX} material que no debe crearse`, unit: "UNIT", unitPrice: 1 },
          consumptionPerUnit: 1,
        },
      ],
      labor: [],
      saveAsTemplate: true,
      rubro,
    });
    expect(repetida.status).toBe(409);

    const huerfano = await req(`/materials?search=${encodeURIComponent(`${PREFIX} material que no debe crearse`)}`);
    expect(huerfano.json, "rollback: no quedó el material de la request fallida").toHaveLength(0);

    const budget = await req(`/projects/${projectId}/budget`);
    const items = budget.json.categories
      .find((c: Json) => c.id === categoryId)
      .items.filter((i: Json) => i.name === `${PREFIX} plantilla`);
    expect(items, "rollback: no quedó una segunda partida").toHaveLength(1);
  });

  it("rechaza composiciones inválidas sin crear nada", async () => {
    const sinLineas = await manual({ name: `${PREFIX} vacío`, materials: [], labor: [] });
    expect(sinLineas.status).toBe(400);

    const sinReferencia = await manual({
      name: `${PREFIX} sin referencia`,
      materials: [{ consumptionPerUnit: 1 }],
      labor: [],
    });
    expect(sinReferencia.status).toBe(400);

    const inexistente = await manual({
      name: `${PREFIX} material fantasma`,
      materials: [{ materialId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", consumptionPerUnit: 1 }],
      labor: [],
    });
    expect(inexistente.status).toBe(400);

    const budget = await req(`/projects/${projectId}/budget`);
    const items = budget.json.categories
      .find((c: Json) => c.id === categoryId)
      .items.filter((i: Json) => /vacío|sin referencia|fantasma/.test(i.name));
    expect(items).toHaveLength(0);
  });

  it("exige membresía en el proyecto, igual que aplicar una plantilla", async () => {
    const registro = await req("/auth/register", {
      method: "POST",
      body: {
        email: `zztest-${Date.now()}@test.local`,
        password: "123456",
        firstName: "ZZ",
        lastName: "Test",
      },
    });
    expect(registro.status).toBe(201);
    const ajeno = registro.json.token;

    const conAjeno = (path: string, body: Json) =>
      fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ajeno}` },
        body: JSON.stringify(body),
      });

    const manualRes = await conAjeno("/apu-templates/manual", {
      categoryId,
      name: `${PREFIX} no miembro`,
      materials: [],
      labor: [{ description: "x", costPerUnit: 1 }],
    });
    expect(manualRes.status).toBe(403);

    const plantillas = await req("/apu-templates?isActive=true");
    const applyRes = await conAjeno(`/apu-templates/${plantillas.json[0].id}/apply`, {
      categoryId,
      quantity: 1,
    });
    expect(applyRes.status).toBe(403);
  });

  it("un PATCH parcial de material no pisa la presentación ni la categoría", async () => {
    const creado = await req("/materials", {
      method: "POST",
      body: {
        name: `${PREFIX} Cemento 50kg`,
        unit: "KG",
        unitPrice: 57000,
        presentationQty: 50,
        category: "CEMENT",
      },
    });
    expect(creado.status).toBe(201);
    createdMaterials.push(creado.json.id);

    const patch = await req(`/materials/${creado.json.id}`, {
      method: "PATCH",
      body: { unitPrice: 60000 },
    });
    expect(patch.status).toBe(200);
    expect(patch.json.presentationQty).toBe(50);
    expect(patch.json.category).toBe("CEMENT");
    expect(patch.json.unitPrice).toBe(60000);
  });

  it("avisa cuando el nombre del material ya existe en el catálogo", async () => {
    const nombre = `${PREFIX} Cemento 50kg`;
    const duplicado = await req("/materials", {
      method: "POST",
      body: { name: nombre.toLowerCase(), unit: "KG", unitPrice: 1 },
    });
    expect(duplicado.status).toBe(409);
    expect(duplicado.json.duplicateMaterialName).toBe(nombre);

    // Con confirmación explícita sí se crea (mismo insumo de otro proveedor)
    const forzado = await req("/materials", {
      method: "POST",
      body: { name: nombre.toLowerCase(), unit: "KG", unitPrice: 1, allowDuplicateName: true },
    });
    expect(forzado.status).toBe(201);
    createdMaterials.push(forzado.json.id);
  });
});
