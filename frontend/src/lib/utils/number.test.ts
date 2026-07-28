import { describe, expect, it } from "vitest";
import { parseDecimal, formatMoney } from "./number";

describe("parseDecimal", () => {
  it("lee el punto como separador de miles", () => {
    // El caso que rompía: un precio de $39.000 se leía como 39
    expect(parseDecimal("39.000")).toBe(39000);
    expect(parseDecimal("57.000")).toBe(57000);
    expect(parseDecimal("1.234.567")).toBe(1234567);
  });

  it("lee la coma como separador decimal", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("0,654")).toBe(0.654);
  });

  it("con los dos separadores, el último es el decimal", () => {
    expect(parseDecimal("39.000,50")).toBe(39000.5);
    expect(parseDecimal("1,234.56")).toBe(1234.56);
  });

  it("mantiene los decimales tipeados con punto", () => {
    expect(parseDecimal("0.654")).toBe(0.654);
    expect(parseDecimal("0.500")).toBe(0.5);
    expect(parseDecimal("12.75")).toBe(12.75);
    expect(parseDecimal("1.5")).toBe(1.5);
  });

  it("ignora símbolos y espacios", () => {
    expect(parseDecimal("$ 39.000")).toBe(39000);
    expect(parseDecimal(" 100 ")).toBe(100);
  });

  it("soporta negativos", () => {
    expect(parseDecimal("-1.500")).toBe(-1500);
    expect(parseDecimal("-12,5")).toBe(-12.5);
  });

  it("devuelve NaN si no hay número", () => {
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("   ")).toBeNaN();
  });
});

describe("formatMoney", () => {
  it("usa dos decimales y separador de miles", () => {
    expect(formatMoney(39000)).toBe("$39.000,00");
    expect(formatMoney(780)).toBe("$780,00");
    expect(formatMoney(3062.5)).toBe("$3.062,50");
  });
});
