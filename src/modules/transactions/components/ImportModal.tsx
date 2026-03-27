"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import type { DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnMapping } from "./ColumnMapping";
import { ImportPreview } from "./ImportPreview";
import { importTransactionsAction } from "@/modules/transactions/lib/import-actions";
import {
  analyzeImportRows,
  isMappingValid,
  type ColumnMappingValue,
  type ImportAnalysis,
  type ImportedTransactionInput,
  type ParsedImportRow,
} from "@/modules/transactions/lib/import-ingestion";

interface ImportModalProps {
  triggerLabel?: string;
  onImported?: () => void;
}

type Step = "upload" | "review" | "mapping" | "confirm" | "done";

const stepLabels: Record<Step, string> = {
  upload: "Subir archivo",
  review: "Revisión inteligente",
  mapping: "Ajustes",
  confirm: "Confirmar",
  done: "Listo",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

function isSupportedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
}

async function parseCsvFile(file: File): Promise<ParsedImportRow[]> {
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse<ParsedImportRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: ({ data, errors }) => {
        if (errors.length) {
          reject(new Error("No pude parsear el CSV."));
          return;
        }

        resolve(data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim())));
      },
      error: () => reject(new Error("Falló la lectura del CSV.")),
    });
  });
}

async function parseSpreadsheetFile(file: File): Promise<ParsedImportRow[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    return parseCsvFile(file);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("El archivo no tiene hojas disponibles.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ParsedImportRow>(sheet, {
    defval: "",
    raw: false,
  });

  return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
}

function buildReviewRows(analysis: ImportAnalysis) {
  return analysis.rows.filter((row) => row.status !== "valid").slice(0, 8);
}

function ConfidenceBadge({ confidence }: { confidence: ImportAnalysis["confidence"] }) {
  if (confidence === "high") {
    return <Badge className="bg-emerald-500/10 text-emerald-700">Confianza alta</Badge>;
  }

  if (confidence === "medium") {
    return <Badge className="bg-amber-500/10 text-amber-700">Confianza media</Badge>;
  }

  return <Badge variant="destructive">Confianza baja</Badge>;
}

export function ImportModal({ triggerLabel = "Importar archivo", onImported }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [filename, setFilename] = useState("");
  const [mapping, setMapping] = useState<ColumnMappingValue>({
    date: "",
    description: "",
    amount: "",
    debit: "",
    credit: "",
  });
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number; categorized: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);
  const importableTransactions = useMemo<ImportedTransactionInput[]>(
    () =>
      (analysis?.rows ?? [])
        .filter(
          (row): row is ImportAnalysis["rows"][number] & { transaction: ImportedTransactionInput } =>
            row.status === "valid" && row.transaction !== null
        )
        .map((row) => row.transaction),
    [analysis]
  );
  const previewTransactions = useMemo(() => importableTransactions.slice(0, 5), [importableTransactions]);
  const reviewRows = useMemo(() => (analysis ? buildReviewRows(analysis) : []), [analysis]);

  const resetState = () => {
    setStep("upload");
    setRows([]);
    setFilename("");
    setMapping({ date: "", description: "", amount: "", debit: "", credit: "" });
    setAnalysis(null);
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const refreshAnalysis = (nextRows: ParsedImportRow[], nextMapping?: ColumnMappingValue) => {
    const computed = analyzeImportRows(nextRows, nextMapping);
    setMapping(computed.mapping);
    setAnalysis(computed);
    return computed;
  };

  const handleParse = async (file: File) => {
    if (!isSupportedFile(file)) {
      setError("Soportamos CSV y XLSX por ahora.");
      return;
    }

    setError(null);
    setFilename(file.name);

    try {
      const nextRows = await parseSpreadsheetFile(file);
      if (!nextRows.length) {
        setError("No encontré filas con datos en el archivo.");
        return;
      }

      setRows(nextRows);
      const computed = refreshAnalysis(nextRows);
      setStep(computed.shouldSkipMapping ? "review" : "mapping");
    } catch {
      setError("No pude leer el archivo. Probá con otro CSV/XLSX o revisá que tenga encabezados.");
    }
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleParse(file);
    }
  };

  const handleSubmit = () => {
    if (!analysis) {
      setError("Todavía no hay nada listo para importar.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await importTransactionsAction({
        filename,
        transactions: importableTransactions,
      });

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

  const canContinueFromReview = Boolean(analysis && importableTransactions.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar movimientos</DialogTitle>
          <DialogDescription>
            Subí tu archivo y nosotros intentamos entenderlo. Solo te pedimos ayuda si encontramos ambigüedades.
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
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  void handleDrop(event);
                }}
                className={`flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center transition ${
                  isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <FileSpreadsheet className="size-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    {isDragActive ? "Soltá el archivo acá" : "Arrastrá un CSV/XLSX o elegilo desde tu computadora"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Detectamos columnas, formatos de fecha y montos automáticamente.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">CSV robusto</Badge>
                  <Badge variant="outline">XLSX básico</Badge>
                  <Badge variant="outline">Review solo de excepciones</Badge>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleParse(file);
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {analysis && step === "mapping" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Ajustes de lectura</CardTitle>
                    <CardDescription>
                      No quedamos suficientemente seguros con el archivo. Ajustá solo lo necesario.
                    </CardDescription>
                  </div>
                  <ConfidenceBadge confidence={analysis.confidence} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  Archivo: <span className="font-medium">{filename}</span> · {rows.length} filas detectadas
                </div>
                <ColumnMapping
                  headers={headers}
                  mapping={mapping}
                  onChange={(nextMapping) => {
                    setMapping(nextMapping);
                    setAnalysis(analyzeImportRows(rows, nextMapping));
                  }}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="gap-0 border bg-muted/20 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Válidas</p>
                      <p className="text-2xl font-semibold">{analysis.summary.valid}</p>
                    </CardContent>
                  </Card>
                  <Card className="gap-0 border bg-amber-500/5 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Dudosas</p>
                      <p className="text-2xl font-semibold">{analysis.summary.review}</p>
                    </CardContent>
                  </Card>
                  <Card className="gap-0 border bg-destructive/5 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Inválidas</p>
                      <p className="text-2xl font-semibold">{analysis.summary.invalid}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview del archivo original</CardTitle>
              </CardHeader>
              <CardContent>
                <ImportPreview rows={rows} />
              </CardContent>
            </Card>
          </div>
        )}

        {analysis && step === "review" && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      Lectura automática lista
                    </CardTitle>
                    <CardDescription>
                      Archivo <span className="font-medium text-foreground">{filename}</span> con {analysis.summary.total} filas detectadas.
                    </CardDescription>
                  </div>
                  <ConfidenceBadge confidence={analysis.confidence} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-3 md:grid-cols-4">
                  <Card className="gap-0 bg-muted/20 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Listas para importar</p>
                      <p className="text-2xl font-semibold">{analysis.summary.valid}</p>
                    </CardContent>
                  </Card>
                  <Card className="gap-0 bg-amber-500/5 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Dudosas</p>
                      <p className="text-2xl font-semibold">{analysis.summary.review}</p>
                    </CardContent>
                  </Card>
                  <Card className="gap-0 bg-destructive/5 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Inválidas</p>
                      <p className="text-2xl font-semibold">{analysis.summary.invalid}</p>
                    </CardContent>
                  </Card>
                  <Card className="gap-0 bg-primary/5 py-4">
                    <CardContent className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Confianza</p>
                      <p className="text-2xl font-semibold">{Math.round(analysis.confidenceScore * 100)}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                  <p className="font-medium">Qué detectamos</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                    <Badge variant="outline">Fecha: {mapping.date || "sin detectar"}</Badge>
                    <Badge variant="outline">Descripción: {mapping.description || "sin detectar"}</Badge>
                    <Badge variant="outline">
                      Monto: {mapping.amount || [mapping.debit, mapping.credit].filter(Boolean).join(" / ") || "sin detectar"}
                    </Badge>
                  </div>
                  {analysis.ambiguousFields.length > 0 && (
                    <p className="mt-3 text-amber-700">
                      Hay ambigüedad en: {analysis.ambiguousFields.join(", ")}. Si querés, podés ajustar las columnas antes de importar.
                    </p>
                  )}
                  {(analysis.summary.review > 0 || analysis.summary.invalid > 0) && (
                    <p className="mt-3 text-muted-foreground">
                      Vamos a importar solo las filas válidas. Las dudosas o inválidas necesitan revisión para no meter ruido.
                    </p>
                  )}
                </div>

                <Card className="gap-0 border bg-background py-0">
                  <CardHeader className="border-b py-4">
                    <CardTitle className="text-base">Preview normalizado</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {previewTransactions.length ? (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {previewTransactions.map((transaction, index) => (
                          <div
                            key={`${transaction.date}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                          >
                            <span>{transaction.date}</span>
                            <span className="font-medium text-foreground">{transaction.description}</span>
                            <span>{formatMoney(transaction.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Todavía no hay filas listas para importar.</p>
                    )}
                  </CardContent>
                </Card>

                {reviewRows.length > 0 && (
                  <Card className="gap-0 border bg-background py-0">
                    <CardHeader className="border-b py-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="size-4 text-amber-600" />
                        Excepciones detectadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="overflow-hidden rounded-lg border">
                        <div className="max-h-72 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fila</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Descripción original</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reviewRows.map((row) => (
                                <TableRow key={row.index}>
                                  <TableCell>{row.index + 2}</TableCell>
                                  <TableCell>
                                    <Badge variant={row.status === "invalid" ? "destructive" : "outline"}>
                                      {row.status === "invalid" ? "Inválida" : "Dudosa"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{row.reasons.join(", ")}</TableCell>
                                  <TableCell>{String(row.raw[mapping.description] ?? "—")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {analysis && step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm">
              <p>
                Se van a importar <span className="font-semibold">{importableTransactions.length}</span> transacciones válidas desde{" "}
                <span className="font-semibold">{filename}</span>.
              </p>
              <p className="mt-2 text-muted-foreground">
                Duplicados exactos se saltean antes de insertar. Las filas dudosas o inválidas no se importan en esta pasada.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Última revisión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {previewTransactions.map((transaction, index) => (
                  <div key={`${transaction.date}-${index}`}>
                    {transaction.date} · {transaction.description} · {formatMoney(transaction.amount)}
                  </div>
                ))}
              </CardContent>
            </Card>
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
                  review: "upload",
                  mapping: "upload",
                  confirm: "review",
                  done: "confirm",
                };
                setStep(previous[step]);
              }}
            >
              Atrás
            </Button>
          )}

          {step === "mapping" && (
            <Button
              disabled={!isMappingValid(mapping)}
              onClick={() => {
                refreshAnalysis(rows, mapping);
                setStep("review");
              }}
            >
              Aplicar detección
            </Button>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Ajustar columnas
              </Button>
              <Button disabled={!canContinueFromReview} onClick={() => setStep("confirm")}>
                Continuar con {importableTransactions.length} válidas
              </Button>
            </>
          )}

          {step === "confirm" && (
            <Button disabled={isPending || !importableTransactions.length} onClick={handleSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar importación
            </Button>
          )}

          {step === "done" && <Button onClick={() => setOpen(false)}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
