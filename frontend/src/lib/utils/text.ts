/**
 * Normaliza un nombre para comparar sin distinguir mayúsculas, acentos ni
 * espacios de más ("Cemento Pórtland" ≡ "cemento portland").
 *
 * Réplica de `backend/src/utils/text.ts`: el backend resuelve igual los
 * nombres de material al guardar, así el front anticipa el mismo resultado.
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
