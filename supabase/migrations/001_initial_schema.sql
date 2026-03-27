-- 001_initial_schema.sql
-- Finanzas AI: Initial database schema with RLS policies
-- Run this in Supabase SQL Editor

-- ============================================================================
-- ACCOUNTS
-- ============================================================================

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit_card', 'cash', 'investment')),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_accounts_user_id on public.accounts(user_id);

alter table public.accounts enable row level security;

create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own accounts"
  on public.accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  parent_id uuid references public.categories(id) on delete set null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_categories_user_id on public.categories(user_id);
create index idx_categories_parent_id on public.categories(parent_id);

alter table public.categories enable row level security;

-- Users can see system categories (user_id IS NULL) and their own
create policy "Users can view system and own categories"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id and is_system = false);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id and is_system = false);

-- ============================================================================
-- IMPORT BATCHES
-- ============================================================================

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  row_count integer not null default 0,
  categorized_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_import_batches_user_id on public.import_batches(user_id);

alter table public.import_batches enable row level security;

create policy "Users can view own import batches"
  on public.import_batches for select
  using (auth.uid() = user_id);

create policy "Users can insert own import batches"
  on public.import_batches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own import batches"
  on public.import_batches for update
  using (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(15, 2) not null,
  description text,
  merchant_name text,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  is_recurring boolean not null default false,
  ai_confidence numeric(3, 2) check (ai_confidence >= 0 and ai_confidence <= 1),
  user_verified boolean not null default false,
  import_batch_id uuid references public.import_batches(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_account_id on public.transactions(account_id);
create index idx_transactions_category_id on public.transactions(category_id);
create index idx_transactions_date on public.transactions(date);
create index idx_transactions_merchant_name on public.transactions(merchant_name);
create index idx_transactions_import_batch_id on public.transactions(import_batch_id);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- MERCHANT ALIASES
-- ============================================================================

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_pattern text not null,
  merchant_name text not null,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, raw_pattern)
);

create index idx_merchant_aliases_user_id on public.merchant_aliases(user_id);

alter table public.merchant_aliases enable row level security;

create policy "Users can view own merchant aliases"
  on public.merchant_aliases for select
  using (auth.uid() = user_id);

create policy "Users can insert own merchant aliases"
  on public.merchant_aliases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own merchant aliases"
  on public.merchant_aliases for update
  using (auth.uid() = user_id);

create policy "Users can delete own merchant aliases"
  on public.merchant_aliases for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_accounts_updated_at
  before update on public.accounts
  for each row execute function public.handle_updated_at();

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();
