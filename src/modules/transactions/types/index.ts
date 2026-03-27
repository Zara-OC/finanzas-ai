// Database types for Finanzas AI
// These match the schema in supabase/migrations/001_initial_schema.sql

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment'
export type Currency = 'ARS' | 'USD'
export type ImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: Currency
  institution: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  parent_id: string | null
  is_system: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  amount: number
  description: string | null
  merchant_name: string | null
  category_id: string | null
  date: string
  is_recurring: boolean
  ai_confidence: number | null
  user_verified: boolean
  import_batch_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ImportBatch {
  id: string
  user_id: string
  filename: string
  row_count: number
  categorized_count: number
  status: ImportBatchStatus
  created_at: string
}

export interface MerchantAlias {
  id: string
  user_id: string
  raw_pattern: string
  merchant_name: string
  category_id: string | null
  created_at: string
}

// Joined types for common queries
export interface TransactionWithCategory extends Transaction {
  category: Category | null
}

export interface TransactionWithDetails extends Transaction {
  category: Category | null
  account: Account | null
}

export interface CategoryWithChildren extends Category {
  children: Category[]
}
