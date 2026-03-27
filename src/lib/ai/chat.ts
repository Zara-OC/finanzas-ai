import type { Category, TransactionWithDetails } from "@/modules/transactions/types";

export interface FinanceContext {
  transactions: TransactionWithDetails[];
  categories: Category[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function buildFinanceSystemPrompt(context: FinanceContext) {
  const categoryNames = context.categories.map((category) => category.name).join(", ");

  const transactionSample = context.transactions.slice(0, 50).map((transaction) => ({
    date: transaction.date,
    amount: Number(transaction.amount),
    description: transaction.description,
    merchant_name: transaction.merchant_name,
    category: transaction.category?.name ?? null,
  }));

  return `Sos el asistente financiero de Finanzas AI.

Reglas:
- Respondé SIEMPRE en español rioplatense claro.
- Basate solo en los datos provistos.
- Si faltan datos para responder con certeza, decilo explícitamente.
- No inventes transacciones, categorías ni montos.
- Cuando hables de dinero, usá formato argentino.
- Sé útil, breve y accionable.

Esquema lógico disponible:
- transactions(date, amount, description, merchant_name, category)
- categories(name)

Categorías conocidas del usuario:
${categoryNames || "Sin categorías cargadas"}

Muestra de transacciones recientes:
${JSON.stringify(transactionSample, null, 2)}`;
}

export function buildFinanceUserPrompt(message: string) {
  return `Pregunta del usuario: ${message}`;
}

export function buildLocalFinanceFallback(message: string, context: FinanceContext) {
  const normalized = message.toLowerCase();
  const transactions = context.transactions.map((item) => ({
    ...item,
    amount: Number(item.amount),
  }));

  const expenses = transactions.filter((item) => item.amount < 0);
  const incomes = transactions.filter((item) => item.amount > 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const totalIncomes = incomes.reduce((sum, item) => sum + item.amount, 0);

  const byCategory = new Map<string, number>();
  for (const transaction of expenses) {
    const key = transaction.category?.name ?? "Sin categoría";
    byCategory.set(key, (byCategory.get(key) ?? 0) + Math.abs(transaction.amount));
  }

  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggestExpense = [...expenses].sort((a, b) => a.amount - b.amount)[0];

  if (!transactions.length) {
    return "Todavía no tengo transacciones para analizar. Importá un CSV y ahí sí te puedo responder con datos reales.";
  }

  if (normalized.includes("cuánto gast") || normalized.includes("cuanto gast")) {
    return `Hasta ahora veo gastos por ${formatCurrency(totalExpenses)} e ingresos por ${formatCurrency(totalIncomes)} en las transacciones cargadas.`;
  }

  if (normalized.includes("categor") || normalized.includes("gasto más") || normalized.includes("gasto mas")) {
    if (!topCategory) {
      return "Todavía no tengo suficientes categorías asignadas como para decirte dónde gastás más.";
    }

    return `Tu categoría con más gasto en lo cargado hasta ahora es **${topCategory[0]}** con ${formatCurrency(topCategory[1])}.`;
  }

  if (normalized.includes("gasto más grande") || normalized.includes("gasto mas grande") || normalized.includes("mayor gasto")) {
    if (!biggestExpense) {
      return "No encontré gastos todavía en tus datos cargados.";
    }

    return `Tu gasto individual más grande en lo cargado fue **${biggestExpense.description ?? biggestExpense.merchant_name ?? "Sin descripción"}** por ${formatCurrency(Math.abs(biggestExpense.amount))} el ${biggestExpense.date}.`;
  }

  return [
    `Resumen rápido de tus datos cargados:`,
    `- Ingresos: ${formatCurrency(totalIncomes)}`,
    `- Gastos: ${formatCurrency(totalExpenses)}`,
    topCategory ? `- Categoría con más gasto: ${topCategory[0]} (${formatCurrency(topCategory[1])})` : null,
    biggestExpense
      ? `- Gasto más grande: ${biggestExpense.description ?? biggestExpense.merchant_name ?? "Sin descripción"} (${formatCurrency(Math.abs(biggestExpense.amount))})`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
