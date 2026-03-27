# Spec Funcional — Finanzas AI MVP

**Fecha:** 2026-03-27
**Status:** Draft
**Owner:** Turing 🧠

---

## User Stories + Acceptance Criteria

### US-01: Registro e inicio de sesión
**As a** usuario nuevo, **I want to** registrarme con mi cuenta de Google **so that** pueda empezar a usar la app sin fricción.

**Acceptance Criteria:**
- GIVEN estoy en la landing page WHEN hago click en "Empezar con Google" THEN se inicia OAuth con Google y me crea una cuenta
- GIVEN ya tengo cuenta WHEN inicio sesión con Google THEN voy directo al dashboard
- GIVEN no estoy autenticado WHEN intento acceder a /dashboard THEN soy redirigido a /login

### US-02: Importar transacciones desde CSV
**As a** usuario, **I want to** subir un archivo CSV de mi banco **so that** mis transacciones se carguen automáticamente.

**Acceptance Criteria:**
- GIVEN estoy en el dashboard WHEN hago click en "Importar" THEN veo un modal para subir CSV/Excel
- GIVEN subí un CSV WHEN se procesa THEN veo un preview de las primeras 10 filas
- GIVEN veo el preview WHEN mapeo las columnas (fecha, descripción, monto) THEN puedo confirmar la importación
- GIVEN confirmo la importación WHEN se procesan las transacciones THEN se categorizan automáticamente con AI
- GIVEN hay transacciones duplicadas (misma fecha + monto + descripción) WHEN importo THEN se marcan y puedo elegir ignorarlas
- GIVEN el CSV tiene formato inválido WHEN intento importarlo THEN veo un mensaje de error claro

### US-03: Ver dashboard principal
**As a** usuario, **I want to** ver un resumen de mis finanzas del mes **so that** sepa rápidamente cómo estoy.

**Acceptance Criteria:**
- GIVEN tengo transacciones cargadas WHEN voy al dashboard THEN veo: ingresos del mes, gastos del mes, balance, y top 5 categorías
- GIVEN estoy en el dashboard WHEN cambio el mes THEN los datos se actualizan
- GIVEN no tengo transacciones WHEN voy al dashboard THEN veo un estado vacío con CTA para importar

### US-04: Ver lista de transacciones
**As a** usuario, **I want to** ver todas mis transacciones **so that** pueda revisar y buscar gastos específicos.

**Acceptance Criteria:**
- GIVEN tengo transacciones WHEN voy a "Transacciones" THEN veo una lista ordenada por fecha (más reciente primero)
- GIVEN estoy en la lista WHEN filtro por categoría THEN solo veo transacciones de esa categoría
- GIVEN estoy en la lista WHEN filtro por rango de fechas THEN solo veo transacciones en ese rango
- GIVEN estoy en la lista WHEN busco texto THEN se filtra por descripción o merchant name
- GIVEN hay muchas transacciones WHEN scrolleo THEN se cargan más (infinite scroll o paginación)

### US-05: Categorización AI automática
**As a** usuario, **I want to** que mis transacciones se categoricen automáticamente **so that** no tenga que hacerlo manualmente.

**Acceptance Criteria:**
- GIVEN importé transacciones WHEN se procesan THEN cada una tiene categoría + subcategoría asignada por AI
- GIVEN veo una transacción mal categorizada WHEN la corrijo THEN se actualiza y el sistema aprende para futuras importaciones
- GIVEN corrijo una categoría WHEN importo otra transacción del mismo merchant THEN se usa la corrección del usuario
- GIVEN la AI no tiene confianza suficiente (<0.5) WHEN se muestra la transacción THEN se marca como "sugerida" para que el usuario confirme

### US-06: Ver gráficos de gastos
**As a** usuario, **I want to** ver gráficos de mis gastos **so that** entienda visualmente a dónde va mi plata.

**Acceptance Criteria:**
- GIVEN tengo transacciones WHEN veo el dashboard THEN veo un gráfico donut de gastos por categoría
- GIVEN tengo transacciones de varios meses WHEN veo el dashboard THEN veo un gráfico de evolución mensual (línea/área)
- GIVEN hago click en una categoría del donut THEN se filtran las transacciones de esa categoría
- GIVEN no tengo datos suficientes THEN los gráficos muestran estado vacío adecuado

### US-07: Chat con mis finanzas
**As a** usuario, **I want to** hacer preguntas sobre mis gastos en lenguaje natural **so that** obtenga respuestas sin navegar reportes.

**Acceptance Criteria:**
- GIVEN estoy en el chat WHEN escribo "¿Cuánto gasté en delivery este mes?" THEN recibo una respuesta con el monto exacto
- GIVEN estoy en el chat WHEN escribo "¿Cuál fue mi gasto más grande en marzo?" THEN recibo la transacción específica
- GIVEN estoy en el chat WHEN pregunto algo que no tiene datos THEN recibe una respuesta clara indicando que no hay información
- GIVEN estoy en el chat WHEN las respuestas se generan THEN se muestran en streaming (no todo de golpe)
- GIVEN la pregunta requiere cálculos WHEN el LLM genera SQL THEN se ejecuta con RLS (solo mis datos)

---

## E2E Test Specs (Playwright)

### test-auth.spec.ts
- Login con Google OAuth redirect correcto
- Redirect a dashboard post-login
- Protección de rutas (redirect a login si no autenticado)
- Logout funciona y redirige

### test-import.spec.ts
- Upload CSV abre modal con preview
- Mapeo de columnas funciona
- Import procesa transacciones y muestra en lista
- CSV inválido muestra error
- Detección de duplicados funciona

### test-dashboard.spec.ts
- Dashboard muestra métricas correctas (ingresos, gastos, balance)
- Cambio de mes actualiza datos
- Estado vacío se muestra correctamente
- Gráfico donut muestra categorías correctas
- Click en categoría filtra transacciones

### test-transactions.spec.ts
- Lista muestra transacciones ordenadas por fecha
- Filtro por categoría funciona
- Filtro por fecha funciona
- Búsqueda por texto funciona
- Editar categoría de transacción funciona

### test-chat.spec.ts
- Enviar pregunta muestra respuesta
- Streaming de respuesta funciona
- Preguntas sobre montos devuelven datos correctos
- Pregunta sin datos relevantes muestra respuesta adecuada

---

## Screens

1. **Landing** — hero + CTA "Empezar con Google"
2. **Dashboard** — métricas + gráficos + acciones rápidas
3. **Transacciones** — lista con filtros y búsqueda
4. **Import modal** — upload + preview + mapeo + confirm
5. **Chat** — interfaz conversacional (panel lateral o página dedicada)
6. **Settings** — perfil, categorías custom, export
