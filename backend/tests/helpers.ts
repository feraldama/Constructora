/**
 * Utilidades compartidas por las suites de integración.
 *
 * Cada suite usa su propio prefijo y su propio archivo: la limpieza borra por
 * prefijo, así que dos suites que compartan prefijo se pisan entre sí.
 */
import prisma from "../src/config/prisma.js";

export const API = process.env.TEST_API_URL;
export const EMAIL = process.env.TEST_EMAIL ?? "admin@buildcontrol.com";
export const PASSWORD = process.env.TEST_PASSWORD ?? "123456";

export type Json = Record<string, any>;

/** Cliente HTTP mínimo con token opcional. */
export function makeClient() {
  let token = "";
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

  return {
    req,
    setToken: (t: string) => {
      token = t;
    },
    /** Login + primer proyecto con rubro: el contexto que toda suite necesita. */
    async bootstrap() {
      const login = await req("/auth/login", {
        method: "POST",
        body: { email: EMAIL, password: PASSWORD },
      });
      if (login.status !== 200) throw new Error(`login falló: ${login.status}`);
      token = login.json.token;

      const projects = await req("/projects?page=1&limit=1");
      const projectId = projects.json.data[0].id;
      const budget = await req(`/projects/${projectId}/budget`);
      const categoryId = budget.json.categories[0]?.id;
      if (!categoryId) throw new Error("el proyecto necesita al menos un rubro");
      return { projectId, categoryId };
    },
  };
}

/**
 * Borra todo lo creado con `prefix`. Va por Prisma y no por la API porque el
 * DELETE de un material en uso es baja lógica y los usuarios de prueba no
 * tienen endpoint. Se corre antes y después de cada suite: así una corrida
 * interrumpida no deja datos que hagan fallar la siguiente.
 */
export async function limpiarDatosDePrueba(prefix: string): Promise<void> {
  await prisma.budgetItem.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.aPUTemplate.deleteMany({ where: { rubro: { startsWith: prefix } } });

  const mats = await prisma.material.findMany({
    where: { name: { startsWith: prefix, mode: "insensitive" } },
    select: { id: true },
  });
  const ids = mats.map((m) => m.id);
  if (ids.length > 0) {
    await prisma.budgetItemMaterial.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.aPUTemplateMaterial.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.purchase.deleteMany({ where: { materialId: { in: ids } } });
    await prisma.material.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.user.deleteMany({ where: { email: { startsWith: prefix.toLowerCase() } } });
}

export { prisma };
