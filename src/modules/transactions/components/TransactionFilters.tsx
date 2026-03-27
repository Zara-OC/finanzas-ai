"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/modules/transactions/types";

interface TransactionFiltersProps {
  categories: Category[];
}

export function TransactionFilters({ categories }: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const currentCategory = searchParams.get("category") ?? "all";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const uniqueCategories = useMemo(
    () => categories.filter((category) => !category.parent_id),
    [categories]
  );

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") next.delete(key);
    else next.set(key, value);

    router.push(`/transactions?${next.toString()}`);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam("q", search);
  };

  const clearAll = () => {
    setSearch("");
    router.push("/transactions");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end">
      <form onSubmit={handleSearchSubmit} className="flex-1 space-y-2">
        <label className="text-sm font-medium">Buscar</label>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: mercado pago, supermercado, alquiler"
            className="pl-9"
          />
        </div>
      </form>

      <div className="space-y-2 md:w-52">
        <label className="text-sm font-medium">Categoría</label>
        <Select value={currentCategory} onValueChange={(value) => updateParam("category", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:w-44">
        <label className="text-sm font-medium">Desde</label>
        <Input type="date" value={currentFrom} onChange={(event) => updateParam("from", event.target.value)} />
      </div>

      <div className="space-y-2 md:w-44">
        <label className="text-sm font-medium">Hasta</label>
        <Input type="date" value={currentTo} onChange={(event) => updateParam("to", event.target.value)} />
      </div>

      <div className="flex gap-2 md:pb-0.5">
        <Button type="submit" onClick={() => updateParam("q", search)}>
          Aplicar
        </Button>
        <Button variant="outline" onClick={clearAll}>
          <X className="size-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
