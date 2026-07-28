import { describe, expect, it } from "vitest";
import { calcMaterialSubtotal } from "./apu.service.js";

describe("calcMaterialSubtotal", () => {
  it("aplica el desperdicio sobre el consumo", () => {
    // 10 kg/m² + 5% de desperdicio, a $1.140/kg
    expect(calcMaterialSubtotal(10, 5, 1140)).toBe(11970);
  });

  it("sin desperdicio es consumo × costo unitario", () => {
    expect(calcMaterialSubtotal(2.5, 0, 1225)).toBe(3062.5);
  });

  it("redondea a dos decimales", () => {
    expect(calcMaterialSubtotal(0.333, 0, 1000)).toBe(333);
    expect(calcMaterialSubtotal(1 / 3, 0, 100)).toBe(33.33);
  });

  it("da 0 cuando el consumo es 0", () => {
    expect(calcMaterialSubtotal(0, 10, 5000)).toBe(0);
  });
});
