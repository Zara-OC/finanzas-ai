"use client";

import { Select } from "@/components/ui/select";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnMappingValue } from "@/modules/transactions/lib/import-utils";

interface ColumnMappingProps {
  headers: string[];
  mapping: ColumnMappingValue;
  onChange: (value: ColumnMappingValue) => void;
}

interface MappingField {
  key: keyof ColumnMappingValue;
  label: string;
  required?: boolean;
}

const fields: MappingField[] = [
  { key: "date", label: "Fecha", required: true },
  { key: "description", label: "Descripción", required: true },
  { key: "amount", label: "Monto neto" },
  { key: "debit", label: "Débito" },
  { key: "credit", label: "Crédito" },
];

export function ColumnMapping({ headers, mapping, onChange }: ColumnMappingProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          <Select
            value={mapping[field.key] || "__none__"}
            onValueChange={(value) =>
              onChange({
                ...mapping,
                [field.key]: value === "__none__" ? "" : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná una columna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin asignar</SelectItem>
              {headers.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
