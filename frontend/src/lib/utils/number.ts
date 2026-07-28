/**
 * Parsea un número tipeado por el usuario aceptando la convención local
 * (coma decimal, punto de miles) y también el punto decimal del teclado
 * numérico. Devuelve `NaN` si no hay número válido.
 *
 * Reglas:
 * - Con los dos separadores, el último es el decimal: `"39.000,50"` → 39000.5,
 *   `"1,234.56"` → 1234.56
 * - Separador repetido = miles: `"1.234.567"` → 1234567
 * - Un solo punto seguido de exactamente 3 dígitos, con parte entera distinta
 *   de 0, es miles: `"39.000"` → 39000 (precio típico en guaraníes)
 * - En cualquier otro caso el separador único es decimal: `"0.654"` → 0.654,
 *   `"12,5"` → 12.5, `"12.75"` → 12.75
 */
export function parseDecimal(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return NaN;

  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");

  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");
  const dots = (digits.match(/\./g) ?? []).length;
  const commas = (digits.match(/,/g) ?? []).length;

  let normalized: string;

  if (dots > 0 && commas > 0) {
    // Ambos separadores: el último que aparece es el decimal
    const decimalSep = lastDot > lastComma ? "." : ",";
    const groupSep = decimalSep === "." ? "," : ".";
    normalized = digits.split(groupSep).join("").replace(decimalSep, ".");
  } else if (commas > 1 || dots > 1) {
    // Separador repetido: sólo puede ser de miles
    normalized = digits.replace(/[.,]/g, "");
  } else if (commas === 1) {
    normalized = digits.replace(",", ".");
  } else if (dots === 1) {
    const [intPart = "", decPart = ""] = digits.split(".");
    const isThousands = decPart.length === 3 && intPart !== "" && Number(intPart) !== 0;
    normalized = isThousands ? intPart + decPart : `${intPart}.${decPart}`;
  } else {
    normalized = digits;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return NaN;
  return negative ? -value : value;
}

/** Formatea un número con separadores locales (es-AR: punto de miles, coma decimal). */
export function formatDecimal(value: number, maxDecimals = 4): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: maxDecimals });
}

/** Formatea un monto con símbolo y dos decimales. */
export function formatMoney(value: number): string {
  return (
    "$" +
    value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
