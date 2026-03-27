import type { TransactionWithDetails } from "@/modules/transactions/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateDashboardInsights(transactions: TransactionWithDetails[]) {
  const expenses = transactions.filter((item) => Number(item.amount) < 0);
  const incomes = transactions.filter((item) => Number(item.amount) > 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const totalIncomes = incomes.reduce((sum, item) => sum + Number(item.amount), 0);

  const categorySpend = new Map<string, number>();
  for (const transaction of expenses) {
    const key = transaction.category?.name ?? "Sin categoría";
    categorySpend.set(key, (categorySpend.get(key) ?? 0) + Math.abs(Number(transaction.amount)));
  }

  const topCategory = [...categorySpend.entries()].sort((a, b) => b[1] - a[1])[0];
  const uncategorizedCount = transactions.filter((item) => !item.category_id).length;
  const lastExpense = expenses[0];

  const insights: string[] = [];

  if (totalExpenses > 0 || totalIncomes > 0) {
    insights.push(`Tu balance actual en los movimientos cargados es ${formatCurrency(totalIncomes - totalExpenses)}.`);
  }

  if (topCategory) {
    insights.push(`Tu categoría con más gasto es ${topCategory[0]} con ${formatCurrency(topCategory[1])}.`);
  }

  if (uncategorizedCount > 0) {
    insights.push(`Todavía tenés ${uncategorizedCount} movimientos sin categoría confirmada. Conviene revisarlos para mejorar los reportes.`);
  }

  if (lastExpense) {
    insights.push(
      `Tu último gasto cargado fue ${lastExpense.description ?? lastExpense.merchant_name ?? "sin descripción"} por ${formatCurrency(Math.abs(Number(lastExpense.amount)))}.`
    );
  }

  return insights.slice(0, 4);
}
