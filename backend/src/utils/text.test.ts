import { describe, expect, it } from "vitest";
import { normalizeName } from "./text.js";

describe("normalizeName", () => {
  it("ignora mayúsculas, acentos y espacios de más", () => {
    expect(normalizeName("Cemento Pórtland")).toBe("cemento portland");
    expect(normalizeName("  cemento   portland ")).toBe("cemento portland");
    expect(normalizeName("ÁRIDO grueso")).toBe("arido grueso");
    expect(normalizeName("Ñandú")).toBe("nandu");
  });

  it("hace equivalentes las grafías del mismo material", () => {
    // Es la propiedad de la que depende el dedupe del catálogo
    expect(normalizeName("PRUEBA Cemento Pórtland Ñandú")).toBe(
      normalizeName("prueba   cemento portland nandu")
    );
  });

  it("no colapsa nombres realmente distintos", () => {
    expect(normalizeName("cable de 6mm")).not.toBe(normalizeName("cable de 6 mm2"));
  });
});
