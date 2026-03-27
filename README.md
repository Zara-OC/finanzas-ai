# Finanzas AI

AI Finance Assistant para Argentina.

MVP web para importar movimientos, categorizarlos automáticamente, analizarlos en un dashboard y consultar tus finanzas por chat.

## Stack
- Next.js 16 + App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- Vercel AI SDK
- OpenAI / Anthropic opcionales para AI avanzada

## Estado del MVP
Funcionalidades implementadas:
- Google OAuth con Supabase
- Importación CSV con preview y mapeo de columnas
- Detección de duplicados
- Categorización automática inicial
- Lista de transacciones con filtros
- Edición manual de categoría
- Dashboard con métricas, breakdown e insights
- Chat financiero MVP
- Landing pública

## Requisitos
- Node 22+
- pnpm
- Proyecto Supabase configurado

## Variables de entorno
Copiar `.env.local.example` a `.env.local` y completar:

```bash
cp .env.local.example .env.local
```

Variables necesarias:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (reservada para futuros flujos server/admin)
- `OPENAI_API_KEY` (opcional)
- `ANTHROPIC_API_KEY` (opcional)

## Setup de base de datos
Correr en Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_categories.sql`

## Desarrollo
```bash
pnpm install
pnpm dev
```

App local:
- http://localhost:3000

## Validación
Build:
```bash
pnpm build
```

Tests:
```bash
pnpm test
```

## Flujo de demo recomendado
1. Login con Google
2. Importar CSV bancario
3. Revisar categorización automática
4. Corregir alguna categoría manualmente
5. Ver dashboard
6. Probar chat con preguntas como:
   - `¿Cuánto gasté este mes?`
   - `¿Cuál fue mi gasto más grande?`
   - `¿En qué categoría gasto más?`

## Limitaciones actuales del MVP
- XLSX todavía no implementado, solo CSV
- Categorización automática inicial basada en heurísticas + capa opcional LLM
- Chat MVP usa contexto de transacciones cargadas; no hay text-to-SQL completo todavía
- Falta deploy final y wiring con Supabase real

## Próximos pasos sugeridos
- Deploy en Vercel
- Conectar Supabase real
- Completar text-to-SQL para chat
- Mejorar aliases/aprendizaje de merchants
- Agregar cuotas, multi-moneda e inflación
