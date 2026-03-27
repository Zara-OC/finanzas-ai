"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/modules/transactions/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });

      setCategories((data ?? []) as Category[]);
      setLoading(false);
    };

    void load();
  }, []);

  return { categories, loading };
}
