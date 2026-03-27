"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TransactionWithDetails } from "@/modules/transactions/types";

interface UseTransactionsParams {
  categoryId?: string;
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useTransactions(params: UseTransactionsParams = {}) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      let query = supabase
        .from("transactions")
        .select("*, category:categories(*), account:accounts(*)")
        .order("date", { ascending: false })
        .limit(params.limit ?? 50);

      if (params.categoryId) query = query.eq("category_id", params.categoryId);
      if (params.from) query = query.gte("date", params.from);
      if (params.to) query = query.lte("date", params.to);
      if (params.query) query = query.or(`description.ilike.%${params.query}%,merchant_name.ilike.%${params.query}%`);

      const { data } = await query;
      setTransactions((data ?? []) as TransactionWithDetails[]);
      setLoading(false);
    };

    void load();
  }, [params.categoryId, params.from, params.limit, params.query, params.to]);

  return { transactions, loading };
}
