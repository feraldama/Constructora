/**
 * Normaliza un nombre para comparar sin distinguir mayúsculas, acentos ni
 * espacios de más. Se usa para detectar materiales ya existentes en el
 * catálogo antes de crear duplicados ("Cemento Pórtland" ≡ "cemento portland").
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
