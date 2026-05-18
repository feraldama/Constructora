/**
 * Importa el Excel maestro `frontend/public/Cantidad Materiales.xlsx` al modelo:
 *   - Material            (catálogo global con precio modal)
 *   - APUTemplate         (un registro por (rubro, subrubro))
 *   - APUTemplateMaterial (líneas tipo Material del subrubro)
 *   - APUTemplateLabor    (líneas tipo Mano de Obra del subrubro)
 *
 * Idempotente: usa upsert por (name, unit) en Material y por (rubro, name) en
 * APUTemplate. Reemplaza las líneas hijas en cada corrida.
 *
 * Ejecutar:  npm run import:apu  (desde backend/)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { MeasurementUnit, MaterialCategory } from "../../src/generated/prisma/enums";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:12345@localhost:5432/constructora?schema=public",
});
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const norm = (s: unknown) => (s ?? "").toString().toLowerCase().trim().replace(/\s+/g, " ");

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").replace(/\s/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function mapUnit(raw: unknown): MeasurementUnit {
  const u = norm(raw);
  switch (u) {
    case "m2":
      return "M2";
    case "m3":
      return "M3";
    case "ml":
    case "m":
      return "ML";
    case "kg":
      return "KG";
    case "tn":
      return "TON";
    case "lt":
      return "LITER";
    case "pul":
    case "pulg/m":
      return "INCH";
    // varios mapeos a UNIT
    case "un":
    case "par":
    case "cada hoja":
    case "c/es":
    case "boca":
    case "":
      return "UNIT";
    default:
      return "UNIT";
  }
}

function isMaterialRow(rawType: unknown): boolean {
  const t = norm(rawType);
  return t === "material" || t === "materal" || t === "material + mo" || t === "varios";
}

function isLaborRow(rawType: unknown): boolean {
  const t = norm(rawType);
  return t.startsWith("mano");
}

function guessCategory(name: string): MaterialCategory {
  const n = name.toLowerCase();
  if (/cemento|cal|hormig|portland/.test(n)) return "CEMENT";
  if (/varilla|alambre|hierro|electrodo|acero|malla/.test(n)) return "STEEL";
  if (/ladrillo|teja|cer[aá]mico|cascotillo|porcelan|baldosa|piedra/.test(n))
    return "CERAMICS";
  if (/madera|tirante|liston|viga|machimbre|tabla|cedro|ybyrap/.test(n))
    return "WOOD";
  if (/arena|ripio|piedra triturada|gaveta/.test(n)) return "AGGREGATES";
  if (/ca[ñn]o.*(agua|cloac|desag|pvc)|sif[oó]n|codo|inodoro|lavatorio|griferia|bomba/.test(n))
    return "PLUMBING";
  if (/cable|tomacorriente|interruptor|electroducto|disyuntor|tablero|enchufe|tomacorriente|llave/.test(n))
    return "ELECTRICAL";
  if (/pintura|esmalte|latex|barniz/.test(n)) return "PAINT";
  if (/asfalt|membrana|negrolin|bitum|hidrof|impermeab/.test(n)) return "WATERPROOFING";
  if (/clavo|tornillo|gancho|alambre/.test(n)) return "HARDWARE";
  return "OTHER";
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

interface RawRow {
  rubro: string;
  subrubro: string;
  item: string;
  tipo: string;
  um: string;
  cantidad: number | null;
  precioUnitario: number | null;
}

function readRows(filePath: string): RawRow[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: false,
  });
  const rows: RawRow[] = [];
  // header is at index 1 in this sheet
  for (let i = 2; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || r.every((c) => c === null)) continue;
    rows.push({
      rubro: (r[0] ?? "").toString().trim(),
      subrubro: (r[1] ?? "").toString().trim(),
      item: (r[2] ?? "").toString().trim(),
      tipo: (r[3] ?? "").toString().trim(),
      um: (r[4] ?? "").toString().trim(),
      cantidad: parseNum(r[5]),
      precioUnitario: parseNum(r[6]),
    });
  }
  return rows;
}

interface MaterialAgg {
  displayName: string;
  unit: MeasurementUnit;
  prices: Map<number, number>; // price -> count
}

/** Precio modal: el que más se repite, desempate por mayor precio. */
function modePrice(prices: Map<number, number>): number {
  let best = 0;
  let bestCount = -1;
  for (const [p, c] of prices) {
    if (c > bestCount || (c === bestCount && p > best)) {
      best = p;
      bestCount = c;
    }
  }
  return best;
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const xlsxPath = path.resolve(here, "../../../frontend/public/Cantidad Materiales.xlsx");
  console.log(`📖 Leyendo ${xlsxPath}`);
  const rows = readRows(xlsxPath);
  console.log(`   ${rows.length} filas`);

  // ── Paso 1: Catálogo de materiales ──
  // Clave: (nombre normalizado, unidad) — porque algunos materiales tienen
  // distintas unidades (ej. tirantes en pul vs pulg/m).
  const matMap = new Map<string, MaterialAgg>();
  for (const r of rows) {
    if (!isMaterialRow(r.tipo) || !r.item) continue;
    const unit = mapUnit(r.um);
    const key = `${norm(r.item)}__${unit}`;
    let m = matMap.get(key);
    if (!m) {
      m = { displayName: r.item, unit, prices: new Map() };
      matMap.set(key, m);
    }
    if (r.precioUnitario != null && r.precioUnitario > 0) {
      m.prices.set(r.precioUnitario, (m.prices.get(r.precioUnitario) ?? 0) + 1);
    }
  }
  console.log(`📦 ${matMap.size} materiales únicos`);

  // Upsert materiales — Material no tiene unique en (name, unit) (no podemos
  // agregarlo retroactivamente sin verificar duplicados existentes), así que
  // buscamos por findFirst y create/update manualmente.
  const materialIdByKey = new Map<string, string>();
  let createdMat = 0;
  let updatedMat = 0;
  for (const [key, m] of matMap) {
    const price = modePrice(m.prices);
    const category = guessCategory(m.displayName);
    const existing = await prisma.material.findFirst({
      where: { name: m.displayName, unit: m.unit },
    });
    if (existing) {
      const dbId = existing.id;
      // Sólo actualizamos precio si no había uno previo significativo. Cargas
      // posteriores de compras moverán este valor.
      if (Number(existing.unitPrice) === 0 && price > 0) {
        await prisma.material.update({ where: { id: dbId }, data: { unitPrice: price, category } });
        updatedMat++;
      }
      materialIdByKey.set(key, dbId);
    } else {
      const created = await prisma.material.create({
        data: {
          name: m.displayName,
          unit: m.unit,
          unitPrice: price,
          presentationQty: 1,
          category,
        },
      });
      materialIdByKey.set(key, created.id);
      createdMat++;
    }
  }
  console.log(`   ✅ ${createdMat} creados, ${updatedMat} actualizados`);

  // ── Paso 2: APU templates por (rubro, subrubro) ──
  // Agrupamos las filas por (rubro, subrubro) y derivamos:
  //   - unit del template: la UM más frecuente entre filas de mano de obra,
  //     o la más frecuente entre materiales si no hay MO.
  //   - lista de materiales (consumo)
  //   - lista de mano de obra
  const subMap = new Map<
    string,
    {
      rubro: string;
      subrubro: string;
      unitCounts: Map<MeasurementUnit, number>;
      labourUnitCounts: Map<MeasurementUnit, number>;
      materials: { matKey: string; consumption: number }[];
      labor: { description: string; cost: number }[];
    }
  >();

  for (const r of rows) {
    if (!r.rubro || !r.subrubro) continue;
    const key = `${r.rubro}||${r.subrubro}`;
    let s = subMap.get(key);
    if (!s) {
      s = {
        rubro: r.rubro,
        subrubro: r.subrubro,
        unitCounts: new Map(),
        labourUnitCounts: new Map(),
        materials: [],
        labor: [],
      };
      subMap.set(key, s);
    }
    const unit = mapUnit(r.um);
    s.unitCounts.set(unit, (s.unitCounts.get(unit) ?? 0) + 1);
    if (isMaterialRow(r.tipo) && r.item && r.cantidad != null) {
      const matKey = `${norm(r.item)}__${unit}`;
      // Algunos materiales del consumo pueden tener una UM distinta a la del
      // template — su clave en materialIdByKey usa la UM del catálogo.
      if (materialIdByKey.has(matKey)) {
        s.materials.push({ matKey, consumption: r.cantidad });
      }
    } else if (isLaborRow(r.tipo)) {
      s.labourUnitCounts.set(unit, (s.labourUnitCounts.get(unit) ?? 0) + 1);
      const desc = (r.item && r.item.trim().length > 0)
        ? r.item.charAt(0).toUpperCase() + r.item.slice(1)
        : "Mano de obra";
      s.labor.push({ description: desc, cost: r.precioUnitario ?? 0 });
    }
  }
  console.log(`📋 ${subMap.size} plantillas APU`);

  function mostFrequent<T>(map: Map<T, number>, fallback: T): T {
    let best = fallback;
    let bestCount = -1;
    for (const [k, c] of map) {
      if (c > bestCount) {
        best = k;
        bestCount = c;
      }
    }
    return best;
  }

  let createdTpl = 0;
  let updatedTpl = 0;
  let sortOrderByRubro = new Map<string, number>();

  for (const s of subMap.values()) {
    const tplUnit = mostFrequent(s.labourUnitCounts, mostFrequent(s.unitCounts, "UNIT" as MeasurementUnit));
    const order = (sortOrderByRubro.get(s.rubro) ?? 0) + 1;
    sortOrderByRubro.set(s.rubro, order);

    const existing = await prisma.aPUTemplate.findUnique({
      where: { rubro_name: { rubro: s.rubro, name: s.subrubro } },
    });

    const tpl = existing
      ? await prisma.aPUTemplate.update({
          where: { id: existing.id },
          data: { unit: tplUnit, sortOrder: order, isActive: true },
        })
      : await prisma.aPUTemplate.create({
          data: { rubro: s.rubro, name: s.subrubro, unit: tplUnit, sortOrder: order },
        });
    if (existing) updatedTpl++;
    else createdTpl++;

    // Reemplazar líneas hijas
    await prisma.aPUTemplateMaterial.deleteMany({ where: { templateId: tpl.id } });
    await prisma.aPUTemplateLabor.deleteMany({ where: { templateId: tpl.id } });

    // Materiales (agrupar duplicados sumando consumo)
    const matAcc = new Map<string, number>();
    for (const m of s.materials) {
      matAcc.set(m.matKey, (matAcc.get(m.matKey) ?? 0) + m.consumption);
    }
    if (matAcc.size > 0) {
      await prisma.aPUTemplateMaterial.createMany({
        data: [...matAcc.entries()].map(([matKey, cons]) => ({
          templateId: tpl.id,
          materialId: materialIdByKey.get(matKey)!,
          consumptionPerUnit: cons,
          wastePercent: 0,
        })),
      });
    }
    if (s.labor.length > 0) {
      await prisma.aPUTemplateLabor.createMany({
        data: s.labor.map((l) => ({
          templateId: tpl.id,
          description: l.description,
          costPerUnit: l.cost,
        })),
      });
    }
  }
  console.log(`   ✅ ${createdTpl} creadas, ${updatedTpl} actualizadas`);

  console.log("✨ Import completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
