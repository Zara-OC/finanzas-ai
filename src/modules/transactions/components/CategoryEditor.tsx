"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/modules/transactions/types";
import { updateTransactionCategoryAction } from "@/modules/transactions/lib/import-actions";

interface CategoryEditorProps {
  transactionId: string;
  value: string | null;
  label: string;
  categories: Category[];
  color?: string | null;
}

export function CategoryEditor({
  transactionId,
  value,
  label,
  categories,
  color,
}: CategoryEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Select
        value={value ?? "uncategorized"}
        onValueChange={(nextValue) => {
          setError(null);
          startTransition(async () => {
            const result = await updateTransactionCategoryAction({
              transactionId,
              categoryId: nextValue === "uncategorized" ? null : nextValue,
            });

            if (!result.ok) {
              setError(result.error ?? "No pude actualizar la categoría.");
              return;
            }

            router.refresh();
          });
        }}
      >
        <SelectTrigger className="h-auto min-w-40 border-0 p-0 shadow-none hover:bg-transparent focus:ring-0">
          <SelectValue>
            <Badge
              variant="secondary"
              className="cursor-pointer"
              style={color ? { backgroundColor: `${color}22`, color } : undefined}
            >
              {isPending ? "Guardando..." : label}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uncategorized">Sin categoría</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
