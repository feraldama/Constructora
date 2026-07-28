import { parseDecimal } from "@/lib/utils/number";
import { normalizeName } from "@/lib/utils/text";

/** Una fila de material reconocida en el texto pegado. */
export interface ParsedMaterialLine {
  name: string;
  consumption: number | null;
  wastePercent: number | null;
  /** Precio del envase — sólo se usa si el material no está en el catálogo */
  unitPrice: number | null;
  /** id del material del catálogo cuyo nombre coincide (normalizado) */
  materialId: string | null;
  /** Destino sugerido: material del APU o línea de mano de obra */
  destination: PasteDestination;
}

export interface ParsePastedMaterialsResult {
  lines: ParsedMaterialLine[];
  /** Líneas descartadas por no tener nombre */
  skipped: number;
  /** true si la primera línea se interpretó como encabezado */
  headerSkipped: boolean;
}

/** Destino de una fila pegada dentro del APU. */
export type PasteDestination = "material" | "labor" | "skip";

/**
 * Nombres que en las planillas de obra son mano de obra, no insumos. Sin esto,
 * pegar un subrubro completo del Excel maestro daría de alta "Oficial albañil"
 * como material en el catálogo global.
 */
// "instalación" quedó afuera a propósito: es ambiguo ("Instalación eléctrica:
// caño corrugado" es un material). Ante la duda gana material — el destino se
// muestra en la vista previa y se puede cambiar por fila.
const LABOR_HINT =
  /^(mano de obra|m\.?\s?o\.?\b|jornal|oficial\b|medio oficial|ayudante|maestro|capataz|contratista|sub ?contrat|colocaci[oó]n|armado y colocaci[oó]n)/i;

/**
 * Sugiere el destino de una fila según su nombre. Un nombre que ya existe en el
 * catálogo se toma como material salvo que arranque con un término de mano de
 * obra (el catálogo tiene entradas heredadas como "Mano de obra").
 */
export function guessDestination(name: string): PasteDestination {
  return LABOR_HINT.test(name.trim()) ? "labor" : "material";
}

/** Quita comillas de envoltura que agregan algunas planillas al copiar. */
function unquote(cell: string): string {
  const trimmed = cell.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Excel copia con tabulaciones; los CSV en locale es suelen usar punto y coma. */
function splitCells(line: string): string[] {
  const raw = line.includes("\t") ? line.split("\t") : line.split(";");
  return raw.map(unquote);
}

const HEADER_HINT = /insumo|material|descripc|consumo|cantidad|cant\.|desperdicio|precio/i;

/**
 * Convierte filas pegadas desde una planilla en líneas de material.
 *
 * Formato esperado por línea (separadas por tab o `;`):
 *   Insumo ⇥ Consumo ⇥ Desperdicio % (opcional) ⇥ Precio del envase (opcional)
 *
 * Los números aceptan la notación local (coma decimal, punto de miles). Si el
 * nombre coincide con un material del catálogo — ignorando mayúsculas, acentos
 * y espacios de más — la línea queda enlazada a ese material.
 */
export function parsePastedMaterials(
  text: string,
  resolveByName: (normalized: string) => { id: string } | undefined
): ParsePastedMaterialsResult {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let headerSkipped = false;

  if (rawLines.length > 1) {
    const cells = splitCells(rawLines[0]!);
    const segundaColumnaNoEsNumero =
      cells.length < 2 || Number.isNaN(parseDecimal(cells[1] ?? ""));
    if (segundaColumnaNoEsNumero && cells.some((c) => HEADER_HINT.test(c))) {
      rawLines.shift();
      headerSkipped = true;
    }
  }

  const lines: ParsedMaterialLine[] = [];
  let skipped = 0;

  for (const rawLine of rawLines) {
    const cells = splitCells(rawLine);
    const name = (cells[0] ?? "").replace(/\s+/g, " ").trim();
    if (!name) {
      skipped++;
      continue;
    }

    const num = (idx: number): number | null => {
      const cell = cells[idx];
      if (cell === undefined || cell === "") return null;
      const value = parseDecimal(cell);
      return Number.isNaN(value) ? null : value;
    };

    const waste = num(2);
    lines.push({
      name,
      consumption: num(1),
      wastePercent: waste !== null && waste >= 0 && waste <= 100 ? waste : null,
      unitPrice: num(3),
      materialId: resolveByName(normalizeName(name))?.id ?? null,
      destination: guessDestination(name),
    });
  }

  return { lines, skipped, headerSkipped };
}
