import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface CategorizationCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface CategorizationAlias {
  raw_pattern: string;
  merchant_name: string;
  category_id: string | null;
}

export interface CategorizationInputTransaction {
  description: string;
  amount: number;
}

export interface CategorizedTransaction {
  categoryId: string | null;
  merchantName: string | null;
  confidence: number | null;
  source: "alias" | "rule" | "llm" | "uncategorized";
}

interface LlmPrediction {
  index: number;
  category: string;
  merchantName?: string;
  confidence?: number;
}

const COMMON_NOISE = [
  "compra",
  "debito",
  "deb",
  "credito",
  "cred",
  "pago",
  "trx",
  "visa",
  "master",
  "maestro",
  "ar",
  "arg",
  "argentina",
  "pos",
  "mp",
];

const RULES: Array<{ matchers: string[]; categories: string[]; merchant?: string }> = [
  {
    matchers: ["rappi", "pedidos ya", "pedidosya", "uber eats"],
    categories: ["Rappi", "PedidosYa", "Uber Eats", "Delivery"],
  },
  {
    matchers: ["coto", "carrefour", "jumbo", "disco", "dia", "dia%", "vea", "changomas", "chango mas"],
    categories: ["Supermercado", "Alimentación"],
  },
  {
    matchers: ["farmacity", "farmacia", "osde", "swiss medical", "galeno", "medicus", "hospital", "clinica"],
    categories: ["Farmacia", "Obra social", "Médicos", "Salud"],
  },
  {
    matchers: ["sube", "metropol", "dota", "tren", "colectivo"],
    categories: ["SUBE", "Transporte"],
  },
  {
    matchers: ["ypf", "shell", "axion", "puma energy"],
    categories: ["Nafta", "Transporte"],
  },
  {
    matchers: ["uber", "cabify", "didi"],
    categories: ["Uber/Cabify", "Transporte"],
  },
  {
    matchers: ["peaje", "ausa", "telepase"],
    categories: ["Peajes", "Transporte"],
  },
  {
    matchers: ["edesur", "edenor", "metrogas", "aysa", "expensa", "expensas", "alquiler"],
    categories: ["Servicios", "Expensas", "Alquiler", "Vivienda"],
  },
  {
    matchers: ["netflix", "spotify", "disney", "max", "prime video", "youtube premium"],
    categories: ["Streaming", "Entretenimiento"],
  },
  {
    matchers: ["cinemark", "hoyts", "cinema"],
    categories: ["Cine", "Entretenimiento"],
  },
  {
    matchers: ["bar", "cerveceria", "boliche", "teatro", "show"],
    categories: ["Salidas", "Entretenimiento"],
  },
  {
    matchers: ["mercado libre", "mercadolibre", "meli", "falabella", "fravega", "garbarino"],
    categories: ["Compras", "Electrónica", "Hogar"],
  },
  {
    matchers: ["nike", "adidas", "zara", "dexter", "sportline"],
    categories: ["Ropa", "Compras"],
  },
  {
    matchers: ["udemy", "coursera", "domestika", "libreria", "libro", "libros"],
    categories: ["Cursos", "Libros", "Educación"],
  },
  {
    matchers: ["afip", "agip", "arba", "monotributo", "abl", "patente"],
    categories: ["Monotributo", "ABL", "Patente", "Impuestos"],
  },
  {
    matchers: ["transferencia", "transfer", "transf", "cvu", "cbu", "mercado pago", "uala", "naranja x"],
    categories: ["Transferencias"],
  },
];

const INCOME_RULES: Array<{ matchers: string[]; categories: string[] }> = [
  {
    matchers: ["sueldo", "haberes", "nomina", "payroll", "salario"],
    categories: ["Sueldo", "Ingresos"],
  },
  {
    matchers: ["honorario", "freelance", "factura", "cliente", "cobro servicio"],
    categories: ["Freelance", "Ingresos"],
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCategoryNameMap(categories: CategorizationCategory[]) {
  return new Map(categories.map((category) => [normalizeText(category.name), category.id]));
}

function findCategoryId(
  categoryMap: Map<string, string>,
  candidates: string[],
  fallbackCategories?: CategorizationCategory[]
) {
  for (const candidate of candidates) {
    const direct = categoryMap.get(normalizeText(candidate));
    if (direct) {
      return direct;
    }
  }

  if (!fallbackCategories) {
    return null;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    const partial = fallbackCategories.find((category) => normalizeText(category.name).includes(normalizedCandidate));
    if (partial) {
      return partial.id;
    }
  }

  return null;
}

function extractMerchantName(description: string) {
  const cleaned = description
    .replace(/[0-9]{2,}/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !COMMON_NOISE.includes(normalizeText(token)))
    .slice(0, 3)
    .join(" ")
    .trim();

  return cleaned ? toTitleCase(cleaned) : null;
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function findAliasMatch(description: string, aliases: CategorizationAlias[]) {
  const normalizedDescription = normalizeText(description);

  return aliases.find((alias) => {
    const normalizedAlias = normalizeText(alias.raw_pattern);
    if (!normalizedAlias) {
      return false;
    }

    return (
      normalizedDescription === normalizedAlias ||
      normalizedDescription.includes(normalizedAlias) ||
      normalizedAlias.includes(normalizedDescription)
    );
  });
}

function applyRuleBasedCategorization(
  transaction: CategorizationInputTransaction,
  categories: CategorizationCategory[],
  categoryMap: Map<string, string>
): CategorizedTransaction {
  const normalizedDescription = normalizeText(transaction.description);
  const merchantName = extractMerchantName(transaction.description);

  const selectedRules = transaction.amount > 0 ? INCOME_RULES : RULES;

  for (const rule of selectedRules) {
    if (rule.matchers.some((matcher) => normalizedDescription.includes(normalizeText(matcher)))) {
      const categoryId = findCategoryId(categoryMap, rule.categories, categories);

      return {
        categoryId,
        merchantName,
        confidence: categoryId ? 0.78 : null,
        source: categoryId ? "rule" : "uncategorized",
      };
    }
  }

  if (transaction.amount > 0) {
    const genericIncomeId = findCategoryId(categoryMap, ["Otros", "Ingresos"], categories);
    return {
      categoryId: genericIncomeId,
      merchantName,
      confidence: genericIncomeId ? 0.55 : null,
      source: genericIncomeId ? "rule" : "uncategorized",
    };
  }

  return {
    categoryId: null,
    merchantName,
    confidence: null,
    source: "uncategorized",
  };
}

function cleanJsonPayload(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

async function classifyWithLlm(
  uncategorized: Array<{ index: number; description: string; amount: number }>,
  categories: CategorizationCategory[]
) {
  if (!process.env.OPENAI_API_KEY || !uncategorized.length) {
    return new Map<number, LlmPrediction>();
  }

  const categoryNames = categories.map((category) => category.name);

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0.1,
      prompt: `Clasificá transacciones financieras argentinas.

Reglas:
- Respondé SOLO JSON válido.
- Elegí la categoría más específica posible de esta lista: ${categoryNames.join(", ")}.
- Si no estás seguro, devolvé categoría vacía.
- merchantName debe ser breve.
- confidence debe ir de 0 a 1.

Formato:
[
  {"index": 0, "category": "Supermercado", "merchantName": "Coto", "confidence": 0.92}
]

Transacciones:
${JSON.stringify(uncategorized, null, 2)}`,
    });

    const parsed = JSON.parse(cleanJsonPayload(result.text)) as LlmPrediction[];

    return new Map(parsed.map((item) => [item.index, item]));
  } catch (error) {
    console.error("categorization llm failed", error);
    return new Map<number, LlmPrediction>();
  }
}

export async function categorizeTransactions(
  transactions: CategorizationInputTransaction[],
  categories: CategorizationCategory[],
  aliases: CategorizationAlias[]
) {
  const categoryMap = buildCategoryNameMap(categories);

  const initialResults = transactions.map((transaction) => {
    const alias = findAliasMatch(transaction.description, aliases);

    if (alias?.category_id) {
      return {
        categoryId: alias.category_id,
        merchantName: alias.merchant_name || extractMerchantName(transaction.description),
        confidence: 0.98,
        source: "alias" as const,
      };
    }

    return applyRuleBasedCategorization(transaction, categories, categoryMap);
  });

  const uncategorized = initialResults
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => !result.categoryId)
    .map(({ index }) => ({
      index,
      description: transactions[index]?.description ?? "",
      amount: transactions[index]?.amount ?? 0,
    }));

  const llmPredictions = await classifyWithLlm(uncategorized, categories);

  return initialResults.map((result, index) => {
    if (result.categoryId) {
      return result;
    }

    const prediction = llmPredictions.get(index);
    if (!prediction?.category) {
      return result;
    }

    const categoryId = findCategoryId(categoryMap, [prediction.category], categories);
    if (!categoryId) {
      return result;
    }

    return {
      categoryId,
      merchantName: prediction.merchantName?.trim() || result.merchantName,
      confidence:
        typeof prediction.confidence === "number" && prediction.confidence >= 0 && prediction.confidence <= 1
          ? prediction.confidence
          : 0.66,
      source: "llm" as const,
    };
  });
}
