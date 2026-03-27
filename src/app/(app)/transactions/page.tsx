import { Receipt } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { ImportModal } from "@/modules/transactions/components/ImportModal";
import { TransactionFilters } from "@/modules/transactions/components/TransactionFilters";
import { TransactionList } from "@/modules/transactions/components/TransactionList";
import { createClient } from "@/lib/supabase/server";
import type { Category, TransactionWithDetails } from "@/modules/transactions/types";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionsPageProps {
  searchParams: Promise<{
    category?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  let query = supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)")
    .order("date", { ascending: false })
    .limit(100);

  if (params.category) query = query.eq("category_id", params.category);
  if (params.from) query = query.gte("date", params.from);
  if (params.to) query = query.lte("date", params.to);
  if (params.q) query = query.or(`description.ilike.%${params.q}%,merchant_name.ilike.%${params.q}%`);

  const { data: transactions } = await query;

  const typedCategories = (categories ?? []) as Category[];
  const typedTransactions = (transactions ?? []) as TransactionWithDetails[];
  const totalAmount = typedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return (
    <>
      <Header title="Transacciones" actions={<ImportModal triggerLabel="Importar CSV" />} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TransactionFilters categories={typedCategories} />

        {typedTransactions.length ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm md:flex-row md:items-center md:justify-between">
                <p>
                  Mostrando <span className="font-semibold">{typedTransactions.length}</span> transacciones
                </p>
                <p>
                  Total visible: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                </p>
              </CardContent>
            </Card>

            <TransactionList transactions={typedTransactions} categories={typedCategories} />
          </>
        ) : (
          <EmptyState
            icon={Receipt}
            title="Sin transacciones"
            description="Importá un archivo CSV de tu banco para empezar a organizar tus finanzas y ver resultados acá."
            action={<ImportModal triggerLabel="Importar CSV" />}
          />
        )}
      </div>
    </>
  );
}
