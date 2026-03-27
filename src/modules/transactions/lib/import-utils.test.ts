import { describe, expect, it } from "vitest";
import {
  analyzeImportFile,
  analyzeRows,
  autoDetectColumnMapping,
  buildImportedTransactions,
  getMappingSuggestion,
  parseAmount,
  parseDate,
} from "./import-utils";
} from "./import-ingestion";

describe("import-utils", () => {
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
        description: "PAGO COTO 000123",
        amount: -12500,
      }),
    ]);
  });

  it("detecta mapeo con alta confianza y permite saltear mapping manual", () => {
    const rows = [
      {
        Fecha: "26/03/2026",
        Descripcion: "Supermercado",
        Importe: "-12500,00",
      },
      {
        Fecha: "27/03/2026",
        Descripcion: "Sueldo",
        Importe: "850000,00",
      },
    ];

    const analysis = analyzeImportFile(rows);

    expect(analysis.confidence).toBeGreaterThanOrEqual(0.8);
    expect(analysis.shouldSkipManualMapping).toBe(true);
    expect(analysis.validRows).toHaveLength(2);
  });

  it("clasifica filas válidas, dudosas e inválidas para centrar la revisión", () => {
    const rows = [
      {
        Fecha: "26/03/2026",
        Descripcion: "Transferencia",
        Debito: "",
        Credito: "1500,50",
      },
      {
        Fecha: "27/03/2026",
        Descripcion: "Movimiento raro",
        Debito: "",
        Credito: "",
      },
      {
        Fecha: "",
        Descripcion: "",
        Debito: "900,00",
        Credito: "",
      },
    ];

    const mapping = {
      date: "Fecha",
      description: "Descripcion",
      debit: "Debito",
      credit: "Credito",
      amount: "",
    };

    const rowsAnalyzed = analyzeRows(rows, mapping);

    expect(rowsAnalyzed[0]?.status).toBe("valid");
    expect(rowsAnalyzed[1]?.status).toBe("invalid");
    expect(rowsAnalyzed[2]?.status).toBe("invalid");
  });

  it("baja la confianza cuando faltan columnas requeridas", () => {
    const rows = [
      {
        Dia: "26/03/2026",
        Texto: "Pago",
      },
    ];

    const suggestion = getMappingSuggestion(Object.keys(rows[0]), rows);

    expect(suggestion.missingRequiredFields).toContain("amount");
    expect(suggestion.confidence).toBeLessThan(0.8);
  });
});
