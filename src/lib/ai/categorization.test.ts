import { beforeEach, describe, expect, it } from "vitest";
import { categorizeTransactions } from "./categorization";

const categories = [
  { id: "cat-super", name: "Supermercado", parent_id: null },
  { id: "cat-rappi", name: "Rappi", parent_id: null },
  { id: "cat-transfer", name: "Transferencias", parent_id: null },
  { id: "cat-ingresos", name: "Ingresos", parent_id: null },
  { id: "cat-sueldo", name: "Sueldo", parent_id: null },
];

describe("categorizeTransactions", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("prioriza merchant aliases del usuario", async () => {
    const results = await categorizeTransactions(
      [{ description: "PAGO TARJETA COTO 000123", amount: -24500 }],
      categories,
      [{ raw_pattern: "coto", merchant_name: "Coto", category_id: "cat-super" }]
    );

    expect(results[0]).toMatchObject({
      categoryId: "cat-super",
      merchantName: "Coto",
      source: "alias",
    });
  });

  it("categoriza por reglas locales cuando no hay alias", async () => {
    const results = await categorizeTransactions(
      [{ description: "COMPRA RAPPI PRO", amount: -10999 }],
      categories,
      []
    );

    expect(results[0]).toMatchObject({
      categoryId: "cat-rappi",
      source: "rule",
    });
  });

  it("asigna ingresos genéricos a movimientos positivos", async () => {
    const results = await categorizeTransactions(
      [{ description: "TRANSFERENCIA RECIBIDA CLIENTE", amount: 320000 }],
      categories,
      []
    );

    expect(results[0]).toMatchObject({
      categoryId: "cat-ingresos",
    });
    expect(results[0].merchantName).toBeTruthy();
  });
});
