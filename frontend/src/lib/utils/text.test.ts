import { describe, expect, it } from "vitest";
import { normalizeName } from "./text";

describe("normalizeName", () => {
  it("ignora mayúsculas, acentos y espacios de más", () => {
    expect(normalizeName("Cemento Pórtland")).toBe("cemento portland");
    expect(normalizeName("  cemento   portland ")).toBe("cemento portland");
    expect(normalizeName("Ñandú")).toBe("nandu");
  });

  it("coincide con la normalización del backend", () => {
    // Debe dar el mismo resultado que backend/src/utils/text.ts: si divergen,
    // el formulario muestra un material nuevo y el backend reusa otro (o al
    // revés). Los casos están duplicados a propósito en los dos lados.
    const casos: [string, string][] = [
      ["Cemento Pórtland", "cemento portland"],
      ["  cemento   portland ", "cemento portland"],
      ["ÁRIDO grueso", "arido grueso"],
      ["Ñandú", "nandu"],
    ];
    for (const [input, expected] of casos) {
      expect(normalizeName(input)).toBe(expected);
    }
  });
});
