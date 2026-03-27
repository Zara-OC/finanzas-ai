"use client";

import { Donut, LineChart, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryMetric {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  helper?: string;
}

interface CategoryBreakdownItem {
  name: string;
  amount: number;
  formattedAmount: string;
  share: number;
  color: string;
}

interface CashflowPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: string;
  tone: "positive" | "negative";
}

interface DashboardChartsProps {
  metrics: SummaryMetric[];
  categoryBreakdown: CategoryBreakdownItem[];
  cashflow: CashflowPoint[];
  recentTransactions: RecentTransaction[];
}

function toneClassName(tone: SummaryMetric["tone"]) {
  if (tone === "positive") return "text-emerald-600";
  if (tone === "negative") return "text-rose-600";
  return "text-foreground";
}

function buildLinePoints(values: number[], width: number, height: number) {
  if (!values.length) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatChartAmount(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardCharts({
  metrics,
  categoryBreakdown,
  cashflow,
  recentTransactions,
}: DashboardChartsProps) {
  const expenseTotals = cashflow.map((item) => Math.abs(item.expense));
  const linePoints = buildLinePoints(expenseTotals, 320, 120);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="space-y-1 pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className={`text-2xl ${toneClassName(metric.tone)}`}>{metric.value}</CardTitle>
            </CardHeader>
            {metric.helper ? (
              <CardContent className="pt-0 text-sm text-muted-foreground">{metric.helper}</CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-4" />
              Flujo de gastos del último mes
            </CardTitle>
            <CardDescription>Seguimiento diario para detectar picos de consumo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <svg viewBox="0 0 320 120" className="h-32 w-full">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  points={linePoints}
                  className="text-primary"
                />
              </svg>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {cashflow.slice(-6).map((point) => (
                <div key={point.label} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-medium">{point.label}</p>
                  <p className="text-muted-foreground">Gastos: {formatChartAmount(Math.abs(point.expense))}</p>
                  <p className="text-muted-foreground">Ingresos: {formatChartAmount(point.income)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Donut className="size-4" />
              Gastos por categoría
            </CardTitle>
            <CardDescription>Distribución de egresos de este mes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryBreakdown.length ? (
              categoryBreakdown.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {item.formattedAmount} · {item.share}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${item.share}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Todavía no hay gastos categorizados para este período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" />
              Últimos movimientos
            </CardTitle>
            <CardDescription>Lo más reciente que entró al sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.date} · {transaction.category}
                  </p>
                </div>
                <p className={transaction.tone === "negative" ? "text-rose-600" : "text-emerald-600"}>
                  {transaction.amount}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lectura rápida</CardTitle>
            <CardDescription>Resumen listo para demo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              La curva del último mes te muestra cuándo se concentran los gastos y ayuda a identificar semanas
              pesadas sin abrir la lista completa.
            </p>
            <p>
              El ranking por categoría sirve para validar rápido si la categorización automática está capturando bien
              el patrón de consumo del usuario.
            </p>
            <p>
              Si una transacción quedó mal, se corrige desde la lista y ese ajuste puede alimentar aliases para las
              próximas importaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
