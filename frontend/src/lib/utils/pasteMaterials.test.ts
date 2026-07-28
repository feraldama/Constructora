import { describe, expect, it } from "vitest";
import { guessDestination, parsePastedMaterials } from "./pasteMaterials";
import { normalizeName } from "./text";

const catalogo = [
  { id: "mat-cemento", name: "Cemento Pórtland" },
  { id: "mat-arena", name: "Arena lavada" },
];
const resolve = (normalized: string) =>
  catalogo.find((m) => normalizeName(m.name) === normalized);

describe("parsePastedMaterials", () => {
  it("lee filas de Excel separadas por tabulaciones", () => {
    const { lines, headerSkipped, skipped } = parsePastedMaterials(
      "Cemento Pórtland\t10\t5\nArena lavada\t0,25",
      resolve
    );
    expect(headerSkipped).toBe(false);
    expect(skipped).toBe(0);
    expect(lines).toEqual([
      {
        name: "Cemento Pórtland",
        consumption: 10,
        wastePercent: 5,
        unitPrice: null,
        materialId: "mat-cemento",
        destination: "material",
      },
      {
        name: "Arena lavada",
        consumption: 0.25,
        wastePercent: null,
        unitPrice: null,
        materialId: "mat-arena",
        destination: "material",
      },
    ]);
  });

  it("enlaza con el catálogo ignorando mayúsculas, acentos y espacios", () => {
    const { lines } = parsePastedMaterials("cemento   portland\t3", resolve);
    expect(lines[0]).toMatchObject({ materialId: "mat-cemento", consumption: 3 });
    // El nombre pegado se guarda con espacios colapsados
    expect(lines[0]!.name).toBe("cemento portland");
  });

  it("marca como nuevos los materiales que no están en el catálogo y toma el precio", () => {
    const { lines } = parsePastedMaterials("Membrana asfáltica\t1,2\t10\t39.000", resolve);
    expect(lines[0]).toEqual({
      name: "Membrana asfáltica",
      consumption: 1.2,
      wastePercent: 10,
      unitPrice: 39000,
      materialId: null,
      destination: "material",
    });
  });

  it("descarta el encabezado de la planilla", () => {
    const { lines, headerSkipped } = parsePastedMaterials(
      "Insumo\tConsumo\tDesperdicio\nCemento Pórtland\t10",
      resolve
    );
    expect(headerSkipped).toBe(true);
    expect(lines).toHaveLength(1);
  });

  it("no confunde una fila de datos con un encabezado", () => {
    const { lines, headerSkipped } = parsePastedMaterials(
      "Cemento Pórtland\t10\nArena lavada\t2",
      resolve
    );
    expect(headerSkipped).toBe(false);
    expect(lines).toHaveLength(2);
  });

  it("acepta punto y coma como separador", () => {
    const { lines } = parsePastedMaterials("Arena lavada;0,25;5", resolve);
    expect(lines[0]).toMatchObject({ materialId: "mat-arena", consumption: 0.25, wastePercent: 5 });
  });

  it("tolera comillas, líneas vacías y filas sin nombre", () => {
    const { lines, skipped } = parsePastedMaterials(
      '"Arena lavada"\t"2"\n\n\t5\nCemento Pórtland\t1',
      resolve
    );
    expect(lines.map((l) => l.name)).toEqual(["Arena lavada", "Cemento Pórtland"]);
    expect(skipped).toBe(1);
  });

  it("deja el consumo en null cuando la columna falta o no es número", () => {
    const { lines } = parsePastedMaterials("Cemento Pórtland\nArena lavada\tvarios", resolve);
    expect(lines[0]!.consumption).toBeNull();
    expect(lines[1]!.consumption).toBeNull();
  });

  it("ignora desperdicios fuera de 0–100", () => {
    const { lines } = parsePastedMaterials("Cemento Pórtland\t1\t150", resolve);
    expect(lines[0]!.wastePercent).toBeNull();
  });

  it("devuelve vacío con texto sin filas", () => {
    expect(parsePastedMaterials("", resolve).lines).toHaveLength(0);
    expect(parsePastedMaterials("\n\n", resolve).lines).toHaveLength(0);
  });

  it("manda a mano de obra las filas que no son insumos", () => {
    const { lines } = parsePastedMaterials(
      "Cemento Pórtland\t10\nMano de obra\t\t\t15.000\nOficial albañil\t\t\t20.000",
      resolve
    );
    expect(lines.map((l) => l.destination)).toEqual(["material", "labor", "labor"]);
  });
});

describe("guessDestination", () => {
  it("reconoce la mano de obra típica de las planillas de obra", () => {
    for (const nombre of [
      "Mano de obra",
      "MO colocación",
      "Oficial albañil",
      "medio oficial",
      "Ayudante",
      "Jornal",
      "Capataz",
      "Contratista de pintura",
      "Colocación de cerámico",
    ]) {
      expect(guessDestination(nombre), nombre).toBe("labor");
    }
  });

  it("no confunde materiales con mano de obra", () => {
    for (const nombre of [
      "Cemento Pórtland",
      "Arena lavada",
      "Membrana asfáltica",
      "Manguera de 1/2",
      "Mampostería de ladrillo",
      "Instalación eléctrica: caño corrugado",
    ]) {
      expect(guessDestination(nombre), nombre).toBe("material");
    }
  });
});
