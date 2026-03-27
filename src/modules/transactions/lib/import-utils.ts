export type ParsedCsvRow = Record<string, string>

export interface ColumnMappingValue {
  date: string
  description: string
  amount?: string
  debit?: string
  credit?: string
}

export interface ImportedTransactionInput {
  date: string
  description: string
  amount: number
  metadata: Record<string, unknown>
}

const DATE_KEYS = ["fecha", "date", "fecha_operacion", "posted_at"]
const DESCRIPTION_KEYS = ["descripcion", "description", "detalle", "concepto", "merchant"]
const AMOUNT_KEYS = ["monto", "amount", "importe", "total"]
const DEBIT_KEYS = ["debito", "debit", "cargo", "egreso"]
const CREDIT_KEYS = ["credito", "credit", "abono", "ingreso"]

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
}

function findMatchingHeader(headers: string[], candidates: string[]) {
  const normalizedMap = new Map(headers.map((header) => [normalizeHeader(header), header]))

  for (const candidate of candidates) {
    const direct = normalizedMap.get(candidate)
    if (direct) return direct
  }

  for (const header of headers) {
    const normalized = normalizeHeader(header)
    if (candidates.some((candidate) => normalized.includes(candidate))) {
      return header
    }
  }

  return ""
}

export function autoDetectColumnMapping(headers: string[]): ColumnMappingValue {
  return {
    date: findMatchingHeader(headers, DATE_KEYS),
    description: findMatchingHeader(headers, DESCRIPTION_KEYS),
    amount: findMatchingHeader(headers, AMOUNT_KEYS),
    debit: findMatchingHeader(headers, DEBIT_KEYS),
    credit: findMatchingHeader(headers, CREDIT_KEYS),
  }
}

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return value
  if (!value) return 0

  let normalized = String(value).trim()
  normalized = normalized.replace(/\s/g, "")
  normalized = normalized.replace(/\$/g, "")

  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  }

  normalized = normalized.replace(/[^0-9.-]/g, "")

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseDate(value: string | null | undefined): string | null {
  if (!value) return null

  const raw = value.trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    const safeYear = year.length === 2 ? `20${year}` : year
    return `${safeYear.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

export function buildImportedTransactions(
  rows: ParsedCsvRow[],
  mapping: ColumnMappingValue
): ImportedTransactionInput[] {
  const mappedRows = rows.map((row): ImportedTransactionInput | null => {
    const rawDate = row[mapping.date]
    const rawDescription = row[mapping.description]
    const parsedDate = parseDate(rawDate)

    const amount = mapping.amount
      ? parseAmount(row[mapping.amount])
      : parseAmount(mapping.credit ? row[mapping.credit] : 0) -
        parseAmount(mapping.debit ? row[mapping.debit] : 0)

    if (!parsedDate || !rawDescription?.trim()) {
      return null
    }

    return {
      date: parsedDate,
      description: rawDescription.trim(),
      amount,
      metadata: row,
    }
  })

  return mappedRows.filter(
    (value): value is ImportedTransactionInput => value !== null
  )
}

export function isMappingValid(mapping: ColumnMappingValue) {
  return Boolean(
    mapping.date &&
      mapping.description &&
      (mapping.amount || mapping.debit || mapping.credit)
  )
}
