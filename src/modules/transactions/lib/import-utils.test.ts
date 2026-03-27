import { describe, expect, it } from "vitest";
import {
  autoDetectColumnMapping,
  buildImportedTransactions,
  parseAmount,
  parseDate,
} from "./import-utils";

describe("import-utils", () => {
  it("parsea montos con formato argentino", () => {
    expect(parseAmount("$ 12.345,67")).toBe(12345.67);
    expect(parseAmount("-4.500,00")).toBe(-4500);
  });

  it("parsea fechas dd/mm/yyyy a ISO", () => {
    expect(parseDate("26/03/2026")).toBe("2026-03-26");
  });

  it("autodetecta columnas y construye transacciones importables", () => {
    const rows = [
      {
        Fecha: "26/03/2026",
        Descripcion: "Pago Coto",
        Importe: "-12500,00",
      },
    ];

    const mapping = autoDetectColumnMapping(Object.keys(rows[0]));
    const transactions = buildImportedTransactions(rows, mapping);

    expect(mapping.date).toBe("Fecha");
    expect(mapping.description).toBe("Descripcion");
    expect(transactions).toEqual([
      expect.objectContaining({
        date: "2026-03-26",
        description: "Pago Coto",
        amount: -12500,
      }),
    ]);
  });
});
