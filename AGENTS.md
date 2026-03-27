# AGENTS.md — Finanzas AI

## About
AI Finance Assistant for Argentina. Personal finance tracking with AI-powered categorization and natural language chat.

## Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **AI:** Vercel AI SDK + OpenAI GPT-4o-mini (categorization) + Claude Sonnet (chat)
- **Charts:** Tremor
- **CSV:** papaparse
- **Deploy:** Vercel
- **Package manager:** pnpm

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Login, callback
│   ├── (app)/        # Dashboard, transactions, chat, settings
│   └── api/          # Import + chat endpoints
├── modules/          # Feature modules
│   ├── auth/         # Auth components, hooks, lib
│   ├── transactions/ # Transaction list, import, filters
│   ├── dashboard/    # Metrics, charts
│   ├── chat/         # Chat UI, text-to-SQL
│   └── shared/       # Sidebar, header, common components
├── lib/
│   ├── supabase/     # Client, server, middleware
│   └── ai/           # Categorization, chat, prompts
└── styles/
```

## Architecture Decisions
- **Module folder architecture** — each feature is self-contained
- **Server Components by default** — only `'use client'` when needed
- **RLS everywhere** — Supabase RLS enforces data isolation per user
- **AI categorization pipeline:** merchant lookup (free) → LLM batch (GPT-4o-mini) → user feedback loop
- **Chat:** text-to-SQL (not RAG) because financial data is structured/numeric
- **Streaming:** Vercel AI SDK for chat responses

## Key Patterns
- Auth: Supabase Auth with Google OAuth, middleware protects (app) routes
- Data queries: Use Supabase client directly (RLS enforced), no custom API for CRUD
- AI calls: Always server-side (Server Actions or API routes), never expose API keys
- Import: CSV → client preview (papaparse) → column mapping → server processing + AI categorization
- Categories: system categories (user_id=NULL) + user custom categories
- Merchant learning: user corrections saved to merchant_aliases table, checked before LLM

## Commands
```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev server (localhost:3000)
pnpm build          # Production build
pnpm test           # Run Vitest
pnpm test:e2e       # Run Playwright E2E
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Git Conventions
- Branch: `feat/<task-slug>` from main
- Commits: `feat(module): description` (conventional commits)
- Merge: squash merge to main
