export type ParsedImportRow = Record<string, string>;

export interface ColumnMappingValue {
  date: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
}

export interface ImportedTransactionInput {
  date: string;
  description: string;
  amount: number;
  metadata: Record<string, unknown>;
}

export type ImportRowStatus = "valid" | "review" | "invalid";

export interface ImportRowAnalysis {
  index: number;
  source: ParsedImportRow;
  status: ImportRowStatus;
  issues: string[];
  transaction: ImportedTransactionInput | null;
}

export interface MappingSuggestion {
  mapping: ColumnMappingValue;
  confidence: number;
  missingRequiredFields: Array<"date" | "description" | "amount">;
}

export interface ImportAnalysisResult {
  headers: string[];
  mapping: ColumnMappingValue;
  confidence: number;
  shouldSkipManualMapping: boolean;
  missingRequiredFields: Array<"date" | "description" | "amount">;
  rowAnalyses: ImportRowAnalysis[];
  validRows: ImportRowAnalysis[];
  reviewRows: ImportRowAnalysis[];
  invalidRows: ImportRowAnalysis[];
}

const DATE_KEYS = ["fecha", "date", "fecha_operacion", "posted_at", "fecha_valor", "operation_date"];
const DESCRIPTION_KEYS = [
  "descripcion",
  "description",
  "detalle",
  "concepto",
  "merchant",
  "movimiento",
  "leyenda",
  "glosa",
];
const AMOUNT_KEYS = ["monto", "amount", "importe", "total", "neto", "saldo"];
const DEBIT_KEYS = ["debito", "debit", "cargo", "egreso", "gasto", "debe", "retiro"];
const CREDIT_KEYS = ["credito", "credit", "abono", "ingreso", "haber", "deposito", "cobro"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function scoreHeader(header: string, candidates: string[]) {
  const normalized = normalizeHeader(header);

  if (!normalized) return 0;
  if (candidates.includes(normalized)) return 1;
  if (candidates.some((candidate) => normalized.startsWith(candidate))) return 0.9;
  if (candidates.some((candidate) => normalized.includes(candidate))) return 0.75;

  return 0;
}

function sampleRows(rows: ParsedImportRow[], limit = 25) {
  return rows.slice(0, limit);
}

function getNonEmptyValues(rows: ParsedImportRow[], header: string) {
  return sampleRows(rows)
    .map((row) => row[header])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function scoreDateValues(values: string[]) {
  if (!values.length) return 0;

  let matches = 0;
  for (const value of values) {
    if (parseDate(value)) {
      matches += 1;
    }
  }

  return matches / values.length;
}

function scoreDescriptionValues(values: string[]) {
  if (!values.length) return 0;

  let matches = 0;
  for (const value of values) {
    if (value.length >= 3 && /[a-zA-Z]/.test(value)) {
      matches += 1;
    }
  }

  return matches / values.length;
}

function scoreAmountValues(values: string[]) {
  if (!values.length) return 0;

  let matches = 0;
  for (const value of values) {
    if (value && isPotentialAmount(value)) {
      matches += 1;
    }
  }

  return matches / values.length;
}

function selectBestHeader(
  headers: string[],
  rows: ParsedImportRow[],
  candidates: string[],
  sampleScorer: (values: string[]) => number
) {
  let bestHeader = "";
  let bestScore = 0;

  for (const header of headers) {
    const headerScore = scoreHeader(header, candidates);
    const sampleScore = sampleScorer(getNonEmptyValues(rows, header));
    const score = clamp(headerScore * 0.65 + sampleScore * 0.35);

    if (score > bestScore) {
      bestHeader = header;
      bestScore = score;
    }
  }

  return { header: bestHeader, score: bestScore };
}

function getRequiredMissing(mapping: ColumnMappingValue) {
  const missing: Array<"date" | "description" | "amount"> = [];

  if (!mapping.date) missing.push("date");
  if (!mapping.description) missing.push("description");
  if (!mapping.amount && !mapping.debit && !mapping.credit) missing.push("amount");

  return missing;
}

function isPotentialAmount(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  return /[\d]/.test(normalized) && /^[\s$€£USDARS\-+().,\d]+$/.test(normalized);
}

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) return 0;

  let normalized = String(value).trim();
  if (!normalized) return 0;

  const isNegativeByParens = /^\(.*\)$/.test(normalized);
  const isNegativeByTrailingMinus = /-$/.test(normalized);

  normalized = normalized
    .replace(/[()]/g, "")
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/ARS|USD/gi, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.+-]/g, "");

  if (isNegativeByParens || isNegativeByTrailingMinus) {
    normalized = `-${normalized.replace(/-/g, "")}`;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelSerialToIso(serial: number) {
  const epoch = Date.UTC(1899, 11, 30);
  const millis = Math.round(serial * 86400000);
  return new Date(epoch + millis).toISOString().slice(0, 10);
}

export function parseDate(value: string | number | null | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 90000) {
    return excelSerialToIso(value);
  }

  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const safeYear = year.length === 2 ? `20${year}` : year;
    return `${safeYear.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const ymdMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

export function autoDetectColumnMapping(headers: string[], rows: ParsedImportRow[] = []): ColumnMappingValue {
  const date = selectBestHeader(headers, rows, DATE_KEYS, scoreDateValues);
  const description = selectBestHeader(headers, rows, DESCRIPTION_KEYS, scoreDescriptionValues);
  const amount = selectBestHeader(headers, rows, AMOUNT_KEYS, scoreAmountValues);
  const debit = selectBestHeader(headers, rows, DEBIT_KEYS, scoreAmountValues);
  const credit = selectBestHeader(headers, rows, CREDIT_KEYS, scoreAmountValues);

  const mapping: ColumnMappingValue = {
    date: date.score >= 0.45 ? date.header : "",
    description: description.score >= 0.45 ? description.header : "",
    amount: amount.score >= 0.45 ? amount.header : "",
    debit: debit.score >= 0.45 ? debit.header : "",
    credit: credit.score >= 0.45 ? credit.header : "",
  };

  if (mapping.amount) {
    mapping.debit = "";
    mapping.credit = "";
  }

  return mapping;
}

export function getMappingSuggestion(headers: string[], rows: ParsedImportRow[]): MappingSuggestion {
  const date = selectBestHeader(headers, rows, DATE_KEYS, scoreDateValues);
  const description = selectBestHeader(headers, rows, DESCRIPTION_KEYS, scoreDescriptionValues);
  const amount = selectBestHeader(headers, rows, AMOUNT_KEYS, scoreAmountValues);
  const debit = selectBestHeader(headers, rows, DEBIT_KEYS, scoreAmountValues);
  const credit = selectBestHeader(headers, rows, CREDIT_KEYS, scoreAmountValues);
  const mapping = autoDetectColumnMapping(headers, rows);
  const missingRequiredFields = getRequiredMissing(mapping);

  const amountScore = mapping.amount
    ? amount.score
    : Math.max(debit.score, credit.score) * (mapping.debit || mapping.credit ? 1 : 0);

  const rawConfidence =
    clamp(date.score) * 0.34 + clamp(description.score) * 0.33 + clamp(amountScore) * 0.33;

  return {
    mapping,
    confidence: clamp(rawConfidence - missingRequiredFields.length * 0.2),
    missingRequiredFields,
  };
}

export function analyzeRows(rows: ParsedImportRow[], mapping: ColumnMappingValue): ImportRowAnalysis[] {
  return rows.map((row, index) => {
    const issues: string[] = [];
    const rawDate = mapping.date ? row[mapping.date] : "";
    const rawDescription = mapping.description ? row[mapping.description] : "";
    const parsedDate = parseDate(rawDate);
    const description = normalizeText(rawDescription ?? "");

    if (!parsedDate) {
      issues.push("Fecha inválida o ausente");
    }

    if (!description) {
      issues.push("Descripción ausente");
    }

    let amount = 0;
    const hasNetAmount = Boolean(mapping.amount);
    const hasSplitAmount = Boolean(mapping.debit || mapping.credit);

    if (hasNetAmount && mapping.amount) {
      const rawAmount = row[mapping.amount];
      amount = parseAmount(rawAmount);

      if (!String(rawAmount ?? "").trim()) {
        issues.push("Monto ausente");
      } else if (!isPotentialAmount(String(rawAmount))) {
        issues.push("Monto con formato dudoso");
      }
    } else if (hasSplitAmount) {
      const rawCredit = mapping.credit ? row[mapping.credit] : "";
      const rawDebit = mapping.debit ? row[mapping.debit] : "";
      amount = parseAmount(rawCredit) - parseAmount(rawDebit);

      if (!String(rawCredit ?? "").trim() && !String(rawDebit ?? "").trim()) {
        issues.push("Monto ausente");
      }
    } else {
      issues.push("No hay columnas de monto");
    }

    if (!issues.length && amount === 0) {
      issues.push("Monto en cero, revisar");
    }

    const transaction =
      parsedDate && description && !issues.includes("Monto ausente") && !issues.includes("No hay columnas de monto")
        ? {
            date: parsedDate,
            description,
            amount,
            metadata: row,
          }
        : null;

    let status: ImportRowStatus = "valid";

    if (!transaction || issues.some((issue) => issue.includes("ausente") || issue.includes("inválida"))) {
      status = "invalid";
    } else if (issues.length) {
      status = "review";
    }

    return {
      index,
      source: row,
      status,
      issues,
      transaction,
    };
  });
}

export function analyzeImportFile(rows: ParsedImportRow[]): ImportAnalysisResult {
  const headers = Object.keys(rows[0] ?? {});
  const suggestion = getMappingSuggestion(headers, rows);
  const rowAnalyses = analyzeRows(rows, suggestion.mapping);
  const validRows = rowAnalyses.filter((row) => row.status === "valid");
  const reviewRows = rowAnalyses.filter((row) => row.status === "review");
  const invalidRows = rowAnalyses.filter((row) => row.status === "invalid");
  const shouldSkipManualMapping =
    suggestion.missingRequiredFields.length === 0 && suggestion.confidence >= 0.8;

  return {
    headers,
    mapping: suggestion.mapping,
    confidence: suggestion.confidence,
    shouldSkipManualMapping,
    missingRequiredFields: suggestion.missingRequiredFields,
    rowAnalyses,
    validRows,
    reviewRows,
    invalidRows,
  };
}

export function buildImportedTransactions(rows: ParsedImportRow[], mapping: ColumnMappingValue): ImportedTransactionInput[] {
  return analyzeRows(rows, mapping)
    .filter((row) => row.status !== "invalid" && row.transaction)
    .map((row) => row.transaction as ImportedTransactionInput);
}

export function isMappingValid(mapping: ColumnMappingValue) {
  return Boolean(mapping.date && mapping.description && (mapping.amount || mapping.debit || mapping.credit));
}
