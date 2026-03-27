import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryBreakdownItem {
  name: string;
  amount: number;
  color?: string | null;
}

interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por categoría</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length ? (
          items.map((item) => {
            const width = total > 0 ? (item.amount / total) * 100 : 0;
            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      style={item.color ? { backgroundColor: `${item.color}22`, color: item.color } : undefined}
                    >
                      {item.name}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max(width, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay gastos categorizados para mostrar.</p>
        )}
      </CardContent>
    </Card>
  );
}
