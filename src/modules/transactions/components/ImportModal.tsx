"use client";

import Papa from "papaparse";
import { useMemo, useRef, useState, useTransition } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ImportPreview } from "./ImportPreview";
import { ColumnMapping } from "./ColumnMapping";
import {
  autoDetectColumnMapping,
  buildImportedTransactions,
  isMappingValid,
  type ColumnMappingValue,
  type ParsedCsvRow,
} from "@/modules/transactions/lib/import-utils";
import { importTransactionsAction } from "@/modules/transactions/lib/import-actions";

interface ImportModalProps {
  triggerLabel?: string;
  onImported?: () => void;
}

type Step = "upload" | "preview" | "mapping" | "confirm" | "done";

const stepLabels: Record<Step, string> = {
  upload: "Subir archivo",
  preview: "Preview",
  mapping: "Mapeo",
  confirm: "Confirmar",
  done: "Listo",
};

export function ImportModal({ triggerLabel = "Importar CSV", onImported }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedCsvRow[]>([]);
  const [filename, setFilename] = useState("");
  const [mapping, setMapping] = useState<ColumnMappingValue>({
    date: "",
    description: "",
    amount: "",
    debit: "",
    credit: "",
  });
  const [result, setResult] = useState<{ imported: number; duplicates: number; categorized: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);
  const mappedTransactions = useMemo(
    () => buildImportedTransactions(rows, mapping).slice(0, 5),
    [mapping, rows]
  );

  const resetState = () => {
    setStep("upload");
    setRows([]);
    setFilename("");
    setMapping({ date: "", description: "", amount: "", debit: "", credit: "" });
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleParse = (file: File) => {
    setError(null);
    setFilename(file.name);

    Papa.parse<ParsedCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) {
          setError("No pude parsear el archivo. Revisá el formato CSV.");
          return;
        }

        setRows(data.filter((row) => Object.values(row).some(Boolean)));
        const detected = autoDetectColumnMapping(Object.keys(data[0] ?? {}));
        setMapping(detected);
        setStep("preview");
      },
      error: () => {
        setError("Falló la lectura del archivo.");
      },
    });
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const response = await importTransactionsAction({ filename, rows, mapping });

      if (!response.ok) {
        setError(response.error ?? "La importación falló.");
        return;
      }

      setResult({
        imported: response.imported,
        duplicates: response.duplicates,
        categorized: response.categorized,
      });
      setStep("done");
      onImported?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar movimientos</DialogTitle>
          <DialogDescription>
            Cargá un CSV de tu banco, revisá el preview y confirmá el mapeo de columnas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {Object.entries(stepLabels).map(([key, label]) => (
            <span
              key={key}
              className={`rounded-full px-2.5 py-1 ${step === key ? "bg-primary/10 text-primary" : "bg-muted"}`}
            >
              {label}
            </span>
          ))}
        </div>

        {step === "upload" && (
          <Card>
            <CardContent className="pt-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center transition hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div>
                  <p className="font-medium">Arrastrá un CSV o elegí un archivo</p>
                  <p className="text-sm text-muted-foreground">
                    MVP: CSV soportado. XLSX queda para la próxima iteración.
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleParse(file);
                }}
              />
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              Archivo: <span className="font-medium">{filename}</span> · {rows.length} filas detectadas
            </div>
            <ImportPreview rows={rows} />
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <ColumnMapping headers={headers} mapping={mapping} onChange={setMapping} />
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <p className="mb-2 font-medium">Preview normalizado</p>
              <div className="space-y-2 text-muted-foreground">
                {mappedTransactions.length ? (
                  mappedTransactions.map((transaction, index) => (
                    <div key={`${transaction.date}-${index}`}>
                      {transaction.date} · {transaction.description} · {new Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      }).format(transaction.amount)}
                    </div>
                  ))
                ) : (
                  <p>No pude construir una preview con el mapeo actual.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p>
              Se van a importar <span className="font-semibold">{buildImportedTransactions(rows, mapping).length}</span>{" "}
              transacciones desde <span className="font-semibold">{filename}</span>.
            </p>
            <p className="mt-2 text-muted-foreground">
              Los duplicados exactos se saltean automáticamente antes de insertar.
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/20 p-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <p className="font-semibold">Importación completada</p>
              <p className="text-sm text-muted-foreground">
                Importadas {result.imported} transacciones · Duplicados salteados: {result.duplicates} · Categorizadas automáticamente: {result.categorized}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {step !== "upload" && step !== "done" && (
            <Button
              variant="outline"
              onClick={() => {
                const previous: Record<Exclude<Step, "upload">, Step> = {
                  preview: "upload",
                  mapping: "preview",
                  confirm: "mapping",
                  done: "confirm",
                };
                setStep(previous[step]);
              }}
            >
              Atrás
            </Button>
          )}

          {step === "preview" && <Button onClick={() => setStep("mapping")}>Continuar</Button>}

          {step === "mapping" && (
            <Button disabled={!isMappingValid(mapping)} onClick={() => setStep("confirm")}>
              Revisar importación
            </Button>
          )}

          {step === "confirm" && (
            <Button disabled={isPending} onClick={handleSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar importación
            </Button>
          )}

          {step === "done" && (
            <Button onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
