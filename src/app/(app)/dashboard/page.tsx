import { LayoutDashboard } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { DashboardCharts } from "@/modules/dashboard/components/DashboardCharts";
import { ImportModal } from "@/modules/transactions/components/ImportModal";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function pickCategory(
  category: { name: string | null; color: string | null } | { name: string | null; color: string | null }[] | null
) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { count }, { data: importBatches }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, date, description, merchant_name, category:categories(name, color)")
      .order("date", { ascending: false })
      .limit(300),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase
      .from("import_batches")
      .select("categorized_count, row_count, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalCount = count ?? 0;

  if (totalCount === 0) {
    return (
      <>
        <Header title="Dashboard" actions={<ImportModal triggerLabel="Importar CSV" />} />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <EmptyState
            icon={LayoutDashboard}
            title="Tu dashboard está vacío"
            description="Importá tus transacciones para ver métricas, gráficos y un resumen claro de tus finanzas."
            action={<ImportModal triggerLabel="Importar transacciones" />}
          />
        </div>
      </>
    );
  }

  const typedTransactions = (transactions ?? []).map((transaction) => ({
    ...transaction,
    amount: Number(transaction.amount),
    category: pickCategory(transaction.category),
  }));

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const monthTransactions = typedTransactions.filter((transaction) => transaction.date.startsWith(currentMonth));
  const previousMonthTransactions = typedTransactions.filter((transaction) =>
    transaction.date.startsWith(previousMonth)
  );

  const currentExpenses = monthTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const currentIncome = monthTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousExpenses = previousMonthTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const totalBalance = typedTransactions.reduce((sum, item) => sum + item.amount, 0);

  const categorizedCoverageBase = importBatches?.reduce((sum, batch) => sum + batch.row_count, 0) ?? 0;
  const categorizedCoverageCount =
    importBatches?.reduce((sum, batch) => sum + batch.categorized_count, 0) ?? 0;
  const categorizedCoverage =
    categorizedCoverageBase > 0 ? Math.round((categorizedCoverageCount / categorizedCoverageBase) * 100) : 0;

  const categorySpend = new Map<string, { amount: number; color: string }>();
  for (const transaction of monthTransactions.filter((item) => item.amount < 0)) {
    const categoryName = transaction.category?.name ?? "Sin categoría";
    const current = categorySpend.get(categoryName) ?? {
      amount: 0,
      color: transaction.category?.color ?? "#94a3b8",
    };

    current.amount += Math.abs(transaction.amount);
    categorySpend.set(categoryName, current);
  }

  const totalExpenseBase = [...categorySpend.values()].reduce((sum, item) => sum + item.amount, 0);
  const categoryBreakdown = [...categorySpend.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 6)
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      formattedAmount: formatCurrency(value.amount),
      share: totalExpenseBase ? Math.round((value.amount / totalExpenseBase) * 100) : 0,
      color: value.color,
    }));

  const cashflowByDate = new Map<string, { income: number; expense: number }>();
  for (const transaction of typedTransactions.slice().reverse()) {
    const current = cashflowByDate.get(transaction.date) ?? { income: 0, expense: 0 };

    if (transaction.amount > 0) {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }

    cashflowByDate.set(transaction.date, current);
  }

  const cashflow = [...cashflowByDate.entries()].slice(-14).map(([date, value]) => ({
    label: formatCompactDate(date),
    income: value.income,
    expense: value.expense,
    net: value.income + value.expense,
  }));

  const recentTransactions = typedTransactions.slice(0, 6).map((transaction) => ({
    id: transaction.id,
    date: formatCompactDate(transaction.date),
    description: transaction.merchant_name ?? transaction.description ?? "Movimiento",
    category: transaction.category?.name ?? "Sin categoría",
    amount: formatCurrency(transaction.amount),
    tone: transaction.amount < 0 ? ("negative" as const) : ("positive" as const),
  }));

  const expenseDelta =
    previousExpenses > 0 ? Math.round(((currentExpenses - previousExpenses) / previousExpenses) * 100) : null;

  return (
    <>
      <Header title="Dashboard" actions={<ImportModal triggerLabel="Importar CSV" />} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <DashboardCharts
          metrics={[
            {
              label: "Balance total",
              value: formatCurrency(totalBalance),
              helper: `${totalCount} transacciones cargadas`,
            },
            {
              label: "Ingresos del mes",
              value: formatCurrency(currentIncome),
              tone: "positive",
              helper: "Entradas detectadas en el mes actual",
            },
            {
              label: "Gastos del mes",
              value: formatCurrency(currentExpenses),
              tone: "negative",
              helper:
                expenseDelta === null
                  ? "Todavía no hay comparación con el mes anterior"
                  : `${expenseDelta > 0 ? "+" : ""}${expenseDelta}% vs. mes anterior`,
            },
            {
              label: "Cobertura automática",
              value: `${categorizedCoverage}%`,
              helper: "Movimientos categorizados sin intervención manual",
            },
          ]}
          categoryBreakdown={categoryBreakdown}
          cashflow={cashflow}
          recentTransactions={recentTransactions}
        />
      </div>
    </>
  );
}
