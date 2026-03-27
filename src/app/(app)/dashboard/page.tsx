import { LayoutDashboard, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { ImportModal } from "@/modules/transactions/components/ImportModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { count }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, date")
      .order("date", { ascending: false })
      .limit(100),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const totalCount = count ?? 0;
  const totalBalance = (transactions ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = (transactions ?? [])
    .filter((item) => Number(item.amount) < 0)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const incomes = (transactions ?? [])
    .filter((item) => Number(item.amount) > 0)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <>
      <Header title="Dashboard" actions={<ImportModal triggerLabel="Importar CSV" />} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {totalCount === 0 ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Tu dashboard está vacío"
            description="Importá tus transacciones para ver métricas, gráficos y un resumen claro de tus finanzas."
            action={<ImportModal triggerLabel="Importar transacciones" />}
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Balance neto</CardTitle>
                  <Wallet className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{formatCurrency(totalBalance)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                  <TrendingUp className="size-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(incomes)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                  <TrendingDown className="size-4 text-rose-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-rose-600">{formatCurrency(expenses)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Estado del MVP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Ya podés importar movimientos y ver un resumen financiero inicial.</p>
                <p>Lo próximo es completar categorización AI, gráficos avanzados y chat financiero.</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
