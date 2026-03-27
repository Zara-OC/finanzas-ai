import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ParsedImportRow } from "@/modules/transactions/lib/import-ingestion";

interface ImportPreviewProps {
  rows: ParsedImportRow[];
}

export function ImportPreview({ rows }: ImportPreviewProps) {
  const previewRows = rows.slice(0, 10);
  const headers = Object.keys(previewRows[0] ?? {});

  if (!previewRows.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No hay filas para previsualizar todavía.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header) => (
                  <TableCell key={header} className="max-w-48 truncate">
                    {row[header] === null || row[header] === undefined || row[header] === ""
                      ? "—"
                      : String(row[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
