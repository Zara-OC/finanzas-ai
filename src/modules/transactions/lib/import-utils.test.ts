import { describe, expect, it } from "vitest";
import {
  analyzeImportRows,
  autoDetectColumnMapping,
  buildImportedTransactions,
  parseAmount,
  parseDate,
} from "./import-ingestion";

describe("import-ingestion", () => {
  it("parsea montos con formato argentino y negativos contables", () => {
    expect(parseAmount("$ 12.345,67")).toBe(12345.67);
    expect(parseAmount("-4.500,00")).toBe(-4500);
    expect(parseAmount("(2.150,00)")).toBe(-2150);
  });

  it("parsea fechas en texto y serial Excel", () => {
    expect(parseDate("26/03/2026")).toBe("2026-03-26");
    expect(parseDate(46008)).toBe("2025-12-17");
  });

  it("autodetecta columnas y construye transacciones importables", () => {
    const rows = [
      {
        Fecha: "26/03/2026",
        Descripcion: "PAGO COTO 000123",
        Importe: "-12500,00",
      },
    ];

    const mapping = autoDetectColumnMapping(Object.keys(rows[0]), rows);
    const transactions = buildImportedTransactions(rows, mapping);

    expect(mapping.date).toBe("Fecha");
    expect(mapping.description).toBe("Descripcion");
    expect(mapping.amount).toBe("Importe");
    expect(transactions).toEqual([
      expect.objectContaining({
        date: "2026-03-26",
        description: "Pago Coto",
        amount: -12500,
        merchantName: "Coto",
      }),
    ]);
  });

  it("clasifica filas válidas, dudosas e inválidas para centrar la revisión", () => {
    const rows = [
      {
        Fecha: "26/03/2026",
        Descripcion: "Supermercado DIA",
        Importe: "-12500,00",
      },
      {
        Fecha: "27/03/2026",
        Descripcion: "Transferencia",
        Importe: "0,00",
      },
      {
        Fecha: "",
        Descripcion: "",
        Importe: "texto",
      },
    ];

    const analysis = analyzeImportRows(rows);

    expect(analysis.summary.valid).toBe(1);
    expect(analysis.summary.review).toBe(1);
    expect(analysis.summary.invalid).toBe(1);
    expect(analysis.rows[1]?.reasons).toContain("Monto cero, revisar");
  });
});
