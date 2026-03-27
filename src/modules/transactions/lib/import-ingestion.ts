export type ParsedImportCell = string | number | boolean | null | undefined;
export type ParsedImportRow = Record<string, ParsedImportCell>;

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
  merchantName: string | null;
  metadata: Record<string, unknown>;
}

export type ImportRowStatus = "valid" | "review" | "invalid";
export type ImportConfidence = "high" | "medium" | "low";
type ImportField = keyof ColumnMappingValue;

export interface ImportFieldScore {
  header: string;
  score: number;
}

export interface NormalizedImportRow {
  index: number;
  raw: ParsedImportRow;
  status: ImportRowStatus;
  reasons: string[];
  transaction: ImportedTransactionInput | null;
}

export interface ImportAnalysis {
  mapping: ColumnMappingValue;
  confidence: ImportConfidence;
  confidenceScore: number;
  shouldSkipMapping: boolean;
  fieldScores: Record<ImportField, ImportFieldScore[]>;
  ambiguousFields: ImportField[];
  rows: NormalizedImportRow[];
  summary: {
    total: number;
    valid: number;
    review: number;
    invalid: number;
  };
}

const FIELD_CANDIDATES: Record<ImportField, string[]> = {
  date: [
    "fecha",
    "date",
    "fecha_operacion",
    "posted_at",
    "transaction_date",
    "fecha_movimiento",
  ],
  description: [
    "descripcion",
    "description",
    "detalle",
    "concepto",
    "merchant",
    "glosa",
    "movimiento",
  ],
  amount: ["monto", "amount", "importe", "total", "neto", "importe_total"],
  debit: ["debito", "debit", "cargo", "egreso", "salida"],
  credit: ["credito", "credit", "abono", "ingreso", "entrada"],
};

const DESCRIPTION_STOP_WORDS = new Set([
  "compra",
  "pago",
  "consumo",
  "debito",
  "credito",
  "transferencia",
  "transfer",
  "tarjeta",
  "visa",
  "mastercard",
  "maestro",
  "cuota",
  "cuotas",
  "plan",
  "aut",
  "ref",
  "nro",
  "cbu",
  "cvu",
  "cuit",
  "id",
  "trx",
  "op",
  "operacion",
  "movimiento",
  "comp",
  "deb",
  "cred",
]);

const EMPTY_MAPPING: ColumnMappingValue = {
  date: "",
  description: "",
  amount: "",
  debit: "",
  credit: "",
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCell(value: ParsedImportCell): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isExcelDateNumber(value: number) {
  return value > 20_000 && value < 90_000;
}

function excelSerialToIso(value: number) {
  const unixTime = Math.round((value - 25569) * 86_400 * 1000);
  return new Date(unixTime).toISOString().slice(0, 10);
}

function headerSignal(normalizedHeader: string, candidates: string[]) {
  if (candidates.includes(normalizedHeader)) return 1;
  if (candidates.some((candidate) => normalizedHeader.startsWith(candidate))) return 0.92;
  if (candidates.some((candidate) => normalizedHeader.includes(candidate))) return 0.84;
  return 0;
}

function getSampleValues(rows: ParsedImportRow[], header: string) {
  return rows
    .slice(0, 25)
    .map((row) => row[header])
    .filter((value) => normalizeCell(value).length > 0);
}

function scoreDateValues(values: ParsedImportCell[]) {
  if (!values.length) return 0;
  const validCount = values.filter((value) => Boolean(parseDate(value))).length;
  return validCount / values.length;
}

function scoreAmountValues(values: ParsedImportCell[]) {
  if (!values.length) return 0;
  const numericValues = values.filter((value) => {
    const normalized = normalizeCell(value);
    return normalized.length > 0 && normalized !== "-" && !Number.isNaN(parseAmount(value));
  });
  return numericValues.length / values.length;
}

function scoreDescriptionValues(values: ParsedImportCell[]) {
  if (!values.length) return 0;
  const richValues = values.filter((value) => {
    const text = normalizeCell(value);
    return /[a-zA-Z]/.test(text) && text.replace(/[^a-zA-Z]/g, "").length >= 4;
  });
  return richValues.length / values.length;
}

function scoreField(field: ImportField, header: string, rows: ParsedImportRow[]) {
  const normalizedHeader = normalizeHeader(header);
  const values = getSampleValues(rows, header);
  const byHeader = headerSignal(normalizedHeader, FIELD_CANDIDATES[field]);

  let byContent = 0;
  if (field === "date") byContent = scoreDateValues(values);
  if (field === "description") byContent = scoreDescriptionValues(values);
  if (field === "amount" || field === "debit" || field === "credit") {
    byContent = scoreAmountValues(values);
  }

  if ((field === "debit" || field === "credit") && byHeader === 0) {
    return byContent * 0.35;
  }

  return byHeader * 0.68 + byContent * 0.32;
}

function dedupeFieldChoice(
  field: ImportField,
  fieldScores: Record<ImportField, ImportFieldScore[]>,
  usedHeaders: Set<string>
) {
  const scores = fieldScores[field];
  const best = scores.find((item) => !usedHeaders.has(item.header) && item.score >= 0.45);
  return best?.header ?? "";
}

export function detectFieldScores(
  headers: string[],
  rows: ParsedImportRow[]
): Record<ImportField, ImportFieldScore[]> {
  return {
    date: headers
      .map((header) => ({ header, score: scoreField("date", header, rows) }))
      .sort((a, b) => b.score - a.score),
    description: headers
      .map((header) => ({ header, score: scoreField("description", header, rows) }))
      .sort((a, b) => b.score - a.score),
    amount: headers
      .map((header) => ({ header, score: scoreField("amount", header, rows) }))
      .sort((a, b) => b.score - a.score),
    debit: headers
      .map((header) => ({ header, score: scoreField("debit", header, rows) }))
      .sort((a, b) => b.score - a.score),
    credit: headers
      .map((header) => ({ header, score: scoreField("credit", header, rows) }))
      .sort((a, b) => b.score - a.score),
  };
}

export function autoDetectColumnMapping(
  headers: string[],
  rows: ParsedImportRow[] = []
): ColumnMappingValue {
  const fieldScores = detectFieldScores(headers, rows);
  const usedHeaders = new Set<string>();
  const mapping: ColumnMappingValue = { ...EMPTY_MAPPING };

  mapping.date = dedupeFieldChoice("date", fieldScores, usedHeaders);
  if (mapping.date) usedHeaders.add(mapping.date);

  mapping.description = dedupeFieldChoice("description", fieldScores, usedHeaders);
  if (mapping.description) usedHeaders.add(mapping.description);

  mapping.amount = dedupeFieldChoice("amount", fieldScores, usedHeaders);
  if (mapping.amount) usedHeaders.add(mapping.amount);

  if (!mapping.amount) {
    mapping.debit = dedupeFieldChoice("debit", fieldScores, usedHeaders);
    if (mapping.debit) usedHeaders.add(mapping.debit);

    mapping.credit = dedupeFieldChoice("credit", fieldScores, usedHeaders);
    if (mapping.credit) usedHeaders.add(mapping.credit);
  }

  return mapping;
}

export function parseAmount(value: ParsedImportCell): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  const raw = normalizeCell(value);
  if (!raw) return Number.NaN;

  let normalized = raw.replace(/\s/g, "").replace(/\$/g, "").replace(/\u00a0/g, "");
  const isNegative = (normalized.includes("(") && normalized.includes(")")) || /-$/.test(normalized);
  normalized = normalized.replace(/[()]/g, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function parseDate(value: ParsedImportCell): string | null {
  if (typeof value === "number" && isExcelDateNumber(value)) {
    return excelSerialToIso(value);
  }

  const raw = normalizeCell(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");

  const dmyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const [, dayPart, monthPart, yearPart] = dmyMatch;
    const day = Number.parseInt(dayPart, 10);
    const month = Number.parseInt(monthPart, 10);
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year.padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const ymdMatch = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((chunk) => (chunk[0] ? chunk[0].toUpperCase() + chunk.slice(1) : chunk))
    .join(" ");
}

function normalizeDescription(value: ParsedImportCell) {
  const raw = collapseSpaces(normalizeCell(value));
  if (!raw) return "";

  const cleaned = collapseSpaces(
    raw
      .replace(/[_*]+/g, " ")
      .replace(/\b\d{6,}\b/g, " ")
      .replace(/\b(?:aut|ref|nro|cuota|trx|op)\b[:#\s-]*[a-z0-9-]*/gi, " ")
      .replace(/[|]+/g, " ")
  );

  if (!cleaned) return "";

  const alphaLength = cleaned.replace(/[^a-zA-Z]/g, "").length;
  return alphaLength >= 4 ? titleCase(cleaned) : cleaned;
}

function normalizeMerchantName(description: string) {
  const candidate = collapseSpaces(
    description
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
  );

  const filteredTokens = candidate
    .split(" ")
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 1 && !DESCRIPTION_STOP_WORDS.has(token) && !/^\d+$/.test(token));

  if (!filteredTokens.length) return null;

  return titleCase(filteredTokens.slice(0, 3).join(" "));
}

function safeMetadata(row: ParsedImportRow) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? ""]));
}

function buildTransactionFromRow(row: ParsedImportRow, mapping: ColumnMappingValue): Omit<NormalizedImportRow, "index"> {
  const reasons: string[] = [];
  const parsedDate = parseDate(row[mapping.date]);
  const description = normalizeDescription(row[mapping.description]);

  let amount = Number.NaN;
  if (mapping.amount) {
    amount = parseAmount(row[mapping.amount]);
  } else {
    const credit = mapping.credit ? parseAmount(row[mapping.credit]) : 0;
    const debit = mapping.debit ? parseAmount(row[mapping.debit]) : 0;
    amount = (Number.isNaN(credit) ? 0 : credit) - (Number.isNaN(debit) ? 0 : debit);
  }

  if (!parsedDate) reasons.push("Fecha no reconocida");
  if (!description) reasons.push("Descripción vacía o ruidosa");
  if (!Number.isFinite(amount)) reasons.push("Monto no reconocido");
  if (Number.isFinite(amount) && amount === 0) reasons.push("Monto cero, revisar");

  let status: ImportRowStatus = "valid";
  if (!parsedDate || !description || !Number.isFinite(amount)) {
    status = "invalid";
  } else if (reasons.length) {
    status = "review";
  }

  return {
    raw: row,
    status,
    reasons,
    transaction:
      status === "invalid"
        ? null
        : {
            date: parsedDate!,
            description,
            amount,
            merchantName: normalizeMerchantName(description),
            metadata: safeMetadata(row),
          },
  };
}

export function buildImportedTransactions(
  rows: ParsedImportRow[],
  mapping: ColumnMappingValue
): ImportedTransactionInput[] {
  return rows
    .map((row) => buildTransactionFromRow(row, mapping))
    .filter(
      (row): row is Omit<NormalizedImportRow, "index"> & { transaction: ImportedTransactionInput } =>
        row.status === "valid" && row.transaction !== null
    )
    .map((row) => row.transaction);
}

function detectAmbiguousFields(
  fieldScores: Record<ImportField, ImportFieldScore[]>,
  mapping: ColumnMappingValue
): ImportField[] {
  return (Object.keys(fieldScores) as ImportField[]).filter((field) => {
    const selectedHeader = mapping[field];
    if (!selectedHeader) return false;

    const scores = fieldScores[field];
    const first = scores[0];
    const second = scores[1];
    if (!first || !second) return false;
    if (first.header !== selectedHeader) return false;

    return first.score - second.score < 0.12;
  });
}

export function analyzeImportRows(rows: ParsedImportRow[], mapping?: ColumnMappingValue): ImportAnalysis {
  const headers = Object.keys(rows[0] ?? {});
  const resolvedMapping = mapping ?? autoDetectColumnMapping(headers, rows);
  const fieldScores = detectFieldScores(headers, rows);
  const analyzedRows = rows.map((row, index) => ({
    ...buildTransactionFromRow(row, resolvedMapping),
    index,
  }));

  const summary = analyzedRows.reduce(
    (accumulator, row) => {
      accumulator[row.status] += 1;
      accumulator.total += 1;
      return accumulator;
    },
    { total: 0, valid: 0, review: 0, invalid: 0 }
  );

  const requiredScores = [
    fieldScores.date.find((item) => item.header === resolvedMapping.date)?.score ?? 0,
    fieldScores.description.find((item) => item.header === resolvedMapping.description)?.score ?? 0,
    Math.max(
      fieldScores.amount.find((item) => item.header === resolvedMapping.amount)?.score ?? 0,
      fieldScores.debit.find((item) => item.header === resolvedMapping.debit)?.score ?? 0,
      fieldScores.credit.find((item) => item.header === resolvedMapping.credit)?.score ?? 0
    ),
  ];

  const mappingScore = requiredScores.reduce((total, score) => total + score, 0) / requiredScores.length;
  const rowScore = summary.total ? (summary.valid + summary.review * 0.55) / summary.total : 0;
  const confidenceScore = Number((mappingScore * 0.6 + rowScore * 0.4).toFixed(2));

  let confidence: ImportConfidence = "low";
  if (confidenceScore >= 0.82 && summary.invalid === 0) confidence = "high";
  else if (confidenceScore >= 0.6) confidence = "medium";

  const ambiguousFields = detectAmbiguousFields(fieldScores, resolvedMapping);
  const shouldSkipMapping =
    isMappingValid(resolvedMapping) &&
    confidence === "high" &&
    ambiguousFields.length === 0;

  return {
    mapping: resolvedMapping,
    confidence,
    confidenceScore,
    shouldSkipMapping,
    fieldScores,
    ambiguousFields,
    rows: analyzedRows,
    summary,
  };
}

export function isMappingValid(mapping: ColumnMappingValue) {
  return Boolean(
    mapping.date &&
      mapping.description &&
      (mapping.amount || mapping.debit || mapping.credit)
  );
}
