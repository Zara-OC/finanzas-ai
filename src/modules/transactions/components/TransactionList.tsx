import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Category, TransactionWithDetails } from "@/modules/transactions/types";
import { CategoryEditor } from "./CategoryEditor";

interface TransactionListProps {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function TransactionList({ transactions, categories }: TransactionListProps) {
  if (!transactions.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const label = transaction.category?.name ?? "Sin categoría";

        return (
          <Card key={transaction.id} className="gap-0 py-0">
            <CardHeader className="grid gap-4 px-4 py-4 md:grid-cols-[140px_1fr_180px_160px] md:items-center">
              <div>
                <CardDescription>Fecha</CardDescription>
                <CardTitle className="text-sm font-medium">{formatDate(transaction.date)}</CardTitle>
              </div>
              <div>
                <CardDescription>Movimiento</CardDescription>
                <CardTitle className="text-base">{transaction.merchant_name ?? transaction.description ?? "Movimiento"}</CardTitle>
              </div>
              <div>
                <CardDescription>Categoría</CardDescription>
                <CategoryEditor
                  transactionId={transaction.id}
                  value={transaction.category_id}
                  label={label}
                  categories={categories}
                  color={transaction.category?.color}
                />
              </div>
              <div className="md:text-right">
                <CardDescription>Monto</CardDescription>
                <CardTitle
                  className={transaction.amount < 0 ? "text-rose-600" : "text-emerald-600"}
                >
                  {formatCurrency(transaction.amount)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="border-t px-4 py-4 text-sm text-muted-foreground">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p>
                    <span className="font-medium text-foreground">Descripción:</span>{" "}
                    {transaction.description ?? "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Cuenta:</span>{" "}
                    {transaction.account?.name ?? "Sin cuenta asociada"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {transaction.ai_confidence
                      ? `Confianza AI ${Math.round(transaction.ai_confidence * 100)}%`
                      : "Sin clasificar"}
                  </Badge>
                  {transaction.user_verified && <Badge variant="secondary">Corregida por vos</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
