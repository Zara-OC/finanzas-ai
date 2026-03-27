import type { Category, Transaction } from "@/modules/transactions/types";

interface CategorizationCandidate {
  transactionId: string;
  description: string;
  amount: number;
}

interface CategorizationSuggestion {
  transactionId: string;
  categoryId: string | null;
  merchantName: string | null;
  confidence: number;
  reason: string;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCategoryByName(categories: Category[], names: string[]) {
  const normalizedNames = names.map(normalizeText);
  return (
    categories.find((category) => normalizedNames.includes(normalizeText(category.name))) ??
    null
  );
}

function inferMerchant(description: string) {
  const normalized = normalizeText(description);

  if (normalized.includes("mercadopago")) return "Mercado Pago";
  if (normalized.includes("rappi")) return "Rappi";
  if (normalized.includes("pedidos ya") || normalized.includes("pedidosya")) return "PedidosYa";
  if (normalized.includes("uber")) return "Uber";
  if (normalized.includes("cabify")) return "Cabify";
  if (normalized.includes("carrefour")) return "Carrefour";
  if (normalized.includes("coto")) return "Coto";
  if (normalized.includes("dia")) return "Día";
  if (normalized.includes("farmacity")) return "Farmacity";
  if (normalized.includes("ypf")) return "YPF";
  if (normalized.includes("shell")) return "Shell";
  if (normalized.includes("spotify")) return "Spotify";
  if (normalized.includes("netflix")) return "Netflix";
  if (normalized.includes("personal") || normalized.includes("telecom")) return "Personal";
  if (normalized.includes("edesur")) return "Edesur";
  if (normalized.includes("metrogas")) return "Metrogas";

  return null;
}

function rulesBasedCategorization(
  candidate: CategorizationCandidate,
  categories: Category[]
): CategorizationSuggestion {
  const text = normalizeText(candidate.description);
  const merchantName = inferMerchant(candidate.description);

  const ruleSet: Array<{ match: boolean; names: string[]; confidence: number; reason: string }> = [
    {
      match: /sueldo|salary|haberes|nomina|payroll|transferencia recibida/.test(text) || candidate.amount > 0,
      names: ["Sueldo", "Ingresos"],
      confidence: candidate.amount > 0 ? 0.9 : 0.84,
      reason: "Movimiento positivo o descripción de ingreso",
    },
    {
      match: /rappi|pedidos ?ya|uber ?eats/.test(text),
      names: ["Rappi", "PedidosYa", "Uber Eats", "Delivery"],
      confidence: 0.96,
      reason: "Merchant típico de delivery",
    },
    {
      match: /uber|cabify|didi|sube|peaje|autopista|nafta|ypf|shell|axion/.test(text),
      names: ["Uber/Cabify", "SUBE", "Peajes", "Nafta", "Transporte"],
      confidence: 0.93,
      reason: "Texto relacionado con transporte",
    },
    {
      match: /supermercado|coto|carrefour|dia|disco|jumbo|chango mas|verduleria|verdulería|carniceria|carnicería/.test(text),
      names: ["Supermercado", "Verdulería", "Carnicería", "Alimentación"],
      confidence: 0.92,
      reason: "Consumo de alimentos o supermercado",
    },
    {
      match: /farmacity|farmacia|obra social|medico|medico|medica|consulta|hospital/.test(text),
      names: ["Farmacia", "Obra social", "Médicos", "Salud"],
      confidence: 0.9,
      reason: "Gasto de salud",
    },
    {
      match: /spotify|netflix|disney|hbo|max|cine|teatro|bar|salidas/.test(text),
      names: ["Streaming", "Cine", "Salidas", "Entretenimiento"],
      confidence: 0.88,
      reason: "Suscripción o gasto de entretenimiento",
    },
    {
      match: /alquiler|expensas|aysa|edesur|edenor|metrogas|internet|fibertel|personal/.test(text),
      names: ["Alquiler", "Expensas", "Servicios", "Vivienda"],
      confidence: 0.89,
      reason: "Gasto del hogar o servicios",
    },
    {
      match: /abl|patente|monotributo|afip|arba|impuesto/.test(text),
      names: ["ABL", "Patente", "Monotributo", "Impuestos"],
      confidence: 0.91,
      reason: "Pago de impuesto o tasa",
    },
    {
      match: /transferencia|transfer|envio dinero|envío dinero/.test(text),
      names: ["Transferencias"],
      confidence: 0.8,
      reason: "Transferencia entre cuentas o a terceros",
    },
  ];

  for (const rule of ruleSet) {
    if (!rule.match) continue;
    const category = findCategoryByName(categories, rule.names);
    if (category) {
      return {
        transactionId: candidate.transactionId,
        categoryId: category.id,
        merchantName,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  return {
    transactionId: candidate.transactionId,
    categoryId: findCategoryByName(categories, [candidate.amount > 0 ? "Ingresos" : "Transferencias"])?.id ?? null,
    merchantName,
    confidence: candidate.amount > 0 ? 0.55 : 0.35,
    reason: "Fallback heurístico",
  };
}

export async function categorizeTransactionsHeuristic(
  transactions: Pick<Transaction, "id" | "description" | "amount">[],
  categories: Category[]
) {
  return transactions.map((transaction) =>
    rulesBasedCategorization(
      {
        transactionId: transaction.id,
        description: transaction.description ?? "",
        amount: Number(transaction.amount),
      },
      categories
    )
  );
}
