# Discovery Brief — AI Finance Assistant (Argentina)

**Fecha:** 2026-03-27
**Status:** Draft
**Owner:** Turing 🧠

---

## Visión

Un asistente financiero personal con AI para Argentina. Importá tus gastos, categorizalos automáticamente, y chateá con tu plata para entender a dónde se va.

## Problema

El argentino promedio no tiene visibilidad real de sus finanzas:
- Usa 3-4 cuentas/billeteras (banco, Mercado Pago, Ualá, efectivo)
- Paga en cuotas y pierde noción de deuda futura
- La inflación distorsiona la percepción del gasto real
- Las apps locales (Ualá, MP, Prex) son billeteras, NO herramientas de análisis
- La alternativa es un Excel manual que nadie mantiene

## Target

- **Primario:** personas individuales en Argentina, 25-45 años, bancarizadas
- **Perfil:** tiene ingresos regulares, múltiples cuentas, quiere controlar gastos pero no tiene tiempo
- **Early adopter:** Manu (dogfooding)

## Value Proposition

**"Importá tus gastos, la AI los categoriza. Preguntale a tu plata a dónde se va."**

## Análisis de Competencia

### Mercado argentino — Gap enorme
Ninguna app local tiene:
- ❌ Categorización inteligente de gastos
- ❌ Presupuestos y metas
- ❌ Análisis de patrones con AI
- ❌ Chat conversacional sobre finanzas
- ❌ Tracking de cuotas pendientes
- ❌ Visión multi-moneda real (ARS + USD ajustado por inflación)

| App | Tipo | Análisis financiero | AI |
|-----|------|--------------------|----|
| Mercado Pago | Billetera/pagos | ❌ | ❌ |
| Ualá | Neobank | ❌ | ❌ |
| Prex | Cuenta digital | ❌ | ❌ |
| Naranja X | Tarjeta/banco | ❌ | ❌ |
| Fintonic | PFM (no opera en AR) | ✅ | ❌ |

### Referentes globales
| App | Precio | Diferencial | Limitación |
|-----|--------|-------------|------------|
| Copilot Money | $8-13/mo | Mejor UX, Apple Design Award | Solo Apple, solo US |
| Monarch Money | $8/mo | Colaboración de pareja, customizable | Solo US/CA, sin AI |
| Cleo | $0-15/mo | Chatbot con personalidad, "roast mode" | Solo US/UK |
| YNAB | $15/mo | Metodología zero-based budget | Sin AI, alta fricción |

### Diferenciadores únicos para Argentina
1. **Tracking de cuotas pendientes** — ninguna app global lo tiene (es fenómeno argentino)
2. **Multi-tipo de cambio** — blue, MEP, CCL, oficial en un solo lugar
3. **Comparación contra inflación** — ¿realmente gastaste más o es solo inflación?
4. **Integración Mercado Pago OAuth** — la billetera más usada del país
5. **Chat en español con contexto argentino** — entiende "cuotas", "blue", "plazo fijo"

## Ecosistema Técnico AR

### Integración de datos financieros
- ❌ No existe Plaid para Argentina
- ❌ No hay Open Banking regulado
- ✅ **Mercado Pago OAuth** — API robusta, alta penetración, acceso a movimientos
- ✅ **CSV/Excel upload** — bancos argentinos permiten export (Galicia, Santander, BBVA, ICBC)
- ✅ **OCR de comprobantes** — viable como complemento
- ✅ **dolarapi.com** — cotizaciones gratis (todos los tipos de cambio)

### Regulación
- **No necesita licencia BCRA** si es solo tracking/análisis (no mueve fondos)
- Ley 25.326 de Datos Personales — consentimiento informado, inscripción de base de datos
- Mantenerse en capa de **agregación y análisis**, no asesoramiento ni ejecución

## MVP Scope (MoSCoW)

### Must Have (v1)
1. **Auth** — signup/login con Google OAuth via Supabase
2. **Import de transacciones** — CSV upload con preview y mapeo de columnas
3. **Categorización AI automática** — LLM categoriza al importar, el usuario puede corregir
4. **Dashboard principal** — resumen mensual: ingresos, gastos, balance, top categorías
5. **Lista de transacciones** — con filtros (fecha, categoría, monto) y búsqueda
6. **Gráficos básicos** — gastos por categoría (donut), evolución mensual (área/línea)
7. **Chat con tus finanzas** — "¿Cuánto gasté en delivery este mes?" via text-to-SQL + LLM

### Should Have (v1.1)
8. Presupuestos por categoría con alertas (al 80% del límite)
9. Detección automática de gastos recurrentes / subscriptions
10. Multi-moneda ARS/USD con tipo de cambio seleccionable (oficial, blue, MEP)
11. Tracking de cuotas pendientes (compromisos futuros por mes)
12. Monthly insight automático (resumen narrativo AI del mes)

### Could Have (v2)
13. Integración Mercado Pago OAuth (import automático)
14. OCR de comprobantes (foto → transacción)
15. Predicción de cierre de mes ("a este ritmo te quedan $X")
16. Comparación contra inflación (IPC INDEC)
17. Detección de anomalías ("gastaste 3x más en supermercado")
18. Múltiples cuentas/billeteras con consolidación

### Won't Have (por ahora)
- ❌ Tracking de inversiones (plazo fijo, FCI, acciones)
- ❌ Asesoramiento financiero (requiere licencia CNV)
- ❌ Conexión directa a bancos (no hay API disponible)
- ❌ App mobile nativa (web responsive primero)
- ❌ Multi-usuario / colaboración de pareja

## Stack Técnico

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **AI:** Vercel AI SDK + GPT-4o-mini (categorización) + GPT-4o/Claude (chat + insights)
- **Charts:** Tremor (MVP speed) → Recharts (custom)
- **CSV parsing:** papaparse (client) + server validation
- **Cotizaciones:** dolarapi.com (gratis, open source)
- **Deploy:** Vercel
- **Tracking:** Linear (tasks) + Notion (docs) + GitHub (code)

## Arquitectura AI

### Pipeline de categorización (2 capas)
1. **Capa rápida:** regex + merchant lookup table → cubre ~60-70% a costo $0
2. **Capa LLM:** GPT-4o-mini con structured output para el resto → ~$0.0002 por txn

### Chat financiero
- **No es RAG clásico** — los datos son estructurados, no semánticos
- **Text-to-SQL:** LLM genera query → se ejecuta con RLS → resultado + contexto → respuesta natural
- **Vercel AI SDK** para streaming

### Feedback loop
- Usuario corrige categoría → se actualiza merchant_aliases → próxima vez no necesita LLM

## Nombre del producto

**Pendiente** — consultar con Manu.
Opciones iniciales a explorar: algo en español que transmita control + simplicidad.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| CSV de bancos AR mal formateados | Alta | Templates por banco, parsing robusto |
| LLM categoriza mal merchants AR | Media | Merchant lookup table AR, feedback loop |
| Costo de API LLM a escala | Baja (MVP) | Caché agresivo, GPT-4o-mini es barato |
| Competidor local aparece | Baja | Moverse rápido, diferenciarse con AI |
| Regulación cambia | Baja | No mover fondos, solo análisis |
