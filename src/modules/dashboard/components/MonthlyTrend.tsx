import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyTrendProps {
  items: MonthlyTrendItem[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MonthlyTrend({ items }: MonthlyTrendProps) {
  const maxValue = Math.max(
    1,
    ...items.flatMap((item) => [item.income, item.expense])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia mensual</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-5">
            {items.map((item) => (
              <div key={item.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-muted-foreground">
                    +{formatCurrency(item.income)} / -{formatCurrency(item.expense)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(item.income / maxValue) * 100}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-rose-500"
                      style={{ width: `${(item.expense / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay suficientes meses cargados para ver una tendencia.</p>
        )}
      </CardContent>
    </Card>
  );
}
