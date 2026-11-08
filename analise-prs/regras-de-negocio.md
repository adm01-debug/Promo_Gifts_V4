# Regras de Negócio — Promo_Gifts_V4
## Gerado em: 2026-11-08 — main@9b2644b2c1

Fontes lidas: `src/integrations/supabase/client.ts`, `src/types/product.ts`, `supabase/migrations/` (3047 migrations), `e2e/routes/`, `.github/workflows/deploy-gates.yml`, `CLAUDE.md`.

---

## 1. SSOT do Supabase (REGRA #1 — IMUTÁVEL)

**Projeto canônico Gold:** `doufsxqlfjyuvxuezpln`
**Projeto proibido:** `pqpdolkaeqlyzpdpbizo` (NUNCA referenciar em código executável)

Fonte: `src/integrations/supabase/client.ts` — `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`

Consequência de qualquer PR: se um PR alterar `CURRENT_PROJECT_ID` ou remover `validateEnv()`, **BLOQUEADO** (Gate 0).

---

## 2. Tipo `Product` — Campos Críticos (REGRA #2)

Obrigatório em `src/types/product.ts` (ou equivalente):
```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

Verificado em main@9b2644b2: `shortDescription`, `price`, `sale_price` presentes ✓

---

## 3. Schema de Banco — Tabelas Críticas

Via `supabase/migrations/` (3047 arquivos) + Gate 1.2 (types-inventory-drift):
- `products`, `product_variants`, `suppliers`, `supplier_products_raw`
- `personalization_techniques`
- `magazines`, `magazine_items`, `magazine_templates`
- `categories` (com coluna `level` — drift detectado em PR#3243)
- `supplier_stricker.*` (17 tabelas — sem RLS, pendência PR#3246)

---

## 4. DDL em Produção (REGRA #8/E15)

**Único caminho autorizado:** `.github/workflows/db-apply-migration.yml` (workflow_dispatch)

Tipos de DDL que BLOQUEIAM merge autônomo:
- `ALTER TABLE` (incluindo `ADD COLUMN`, `ENABLE ROW LEVEL SECURITY`)
- `CREATE POLICY`
- `cron.alter_job`, `cron.schedule`, `cron.unschedule`
- `DROP *`, `RENAME *`, `ALTER TYPE *`
- `CREATE TABLE`, `CREATE INDEX` não-idempotente

---

## 5. Deploy de Edge Functions (REGRA #8 corolário)

**Único caminho autorizado:** `.github/workflows/deploy-edge-functions.yml` (workflow_dispatch)

Edge functions em produção (Supabase `doufsxqlfjyuvxuezpln`):
- `collections-public-react` (referenciada em PR#3248)
- `comparisons-public-react` (referenciada em PR#3248)
- `categories-api` (modificada em PR#3214)
- 40+ outras edge functions

---

## 6. CI/CD — Gate Final (único required check)

**Único check required:** "Gate Final - Deploy Ready" (`.github/workflows/deploy-gates.yml`)

Gates bloqueantes relevantes para PRs analisadas:
- Gate 0: SSOT `doufsxqlfjyuvxuezpln`
- Gate 1: Lint (ESLint) + TypeScript
- Gate 1.3: Contratos de migration (preflight E15)
- Gate 2: Vitest unit tests
- Gate 3: E2E Smoke (Playwright)

---

## 7. Regra de Workflows CI (REGRA #8 "Não tocar .github/workflows")

Nenhum merge autônomo por agente em PR que toque `.github/workflows/**` ou `.github/scripts/**`.

PRs bloqueadas por esta regra: #3127, #3129, #3137, #3214 (contract-tests.yml), #3228, #3247.

---

## 8. Regras de Draft

PRs com `isDraft=true` **não são mergeadas** — aguardam publicação pelo PO.

PRs em draft desta sessão: #3214, #3228, #3245, #3246, #3247, #3248.

---

## 9. Rota Pública — Fábricas E2E

`buildPublicTokenSuite` em `e2e/routes/_factories.ts`:
- Suíte parametrizada para rotas públicas com token (coleção, comparar, dossier, kit)
- Espera edge function no Supabase e rota no frontend

Rotas públicas confirmadas em main: `/dossie`, `/kit-publico`, `/approve`
Rotas propostas por PR#3248: `/colecao-publica`, `/comparar-publica`

---

## 10. VirtualizedProductGrid — Componente Crítico

`src/components/products/VirtualizedProductGrid.tsx`:
- Grid virtualizado com 7.143+ produtos
- `showScrollTop` controla visibilidade do botão scroll-to-top
- PR#3245 inverte esta condição (`!showScrollTop`) — regressão real detectada

---

## 11. Cron Jobs em Produção

Schema `cron` (pg_cron):
- 10+ jobs em produção com problemas de "job startup timeout"
- CRON-001 (PR#3214): propõe escalonamento de 4 jobs (IDs 114, 224, 243, 276)
- Qualquer alteração via `cron.alter_job` requer migration via `db-apply-migration.yml`

---

## 12. Schema `supplier_stricker` — Segurança

17 tabelas sem RLS habilitado:
- Schema não exposto via API (sem GRANT USAGE para `authenticated`)
- Risco: qualquer GRANT futuro expõe todas as tabelas irrestritamente
- Mitigation: PR#3246 — `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY deny_all USING (false)`
