# Regras de Negócio — adm01-debug/Promo_Gifts_V4
# Gerado em: 2026-10-23

## RN-01: Projeto Supabase Canônico
**Fonte:** `src/integrations/supabase/client.ts` + CLAUDE.md REGRA #1
**Regra:** O projeto canônico de produção é `doufsxqlfjyuvxuezpln`. Código referenciando `pqpdolkaeqlyzpdpbizo` é proibido.

## RN-02: Tipo Product — Campos Críticos
**Fonte:** `src/types/product-catalog.ts` + CLAUDE.md REGRA #2
**Regra:** `price: number`, `sale_price?: number`, `shortDescription: string`, `category_id?: string`, `category_name?: string` são obrigatórios.

## RN-03: Acesso Anônimo Mínimo (E30, E40)
**Fonte:** `supabase/migrations/20261022194*.sql` + auditoria 2026-10-22
**Regra:** Role `anon` não deve ter INSERT/UPDATE/DELETE em `external_connections`. Role `anon` não deve ter nenhum privilege em `mockup_approval_links`. Acesso controlado por RLS.

## RN-04: Função mcp_kv_get — Acesso Restrito (E18)
**Fonte:** `supabase/migrations/20261022194200*.sql`
**Regra:** Apenas `postgres` e `service_role` podem executar `mcp_kv_get`. Role `authenticated` não tem EXECUTE.

## RN-05: CI — Gate Final obrigatório
**Fonte:** `.github/workflows/deploy-gates.yml` + CLAUDE.md
**Regra:** "Gate Final - Deploy Ready" é o único required check. PRs docs-only (E14) podem skip gates de código. Merge em main = deploy em produção.

## RN-06: Credenciais E2E — públicos vs autenticados
**Fonte:** E2E workflows `e2e-quote-conditions-pr-check.yml` etc.
**Regra:** Specs em `chromium-public` não precisam de `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`. Expor estas variáveis em steps públicos é desnecessário e aumenta superfície de risco.

## RN-07: CORS wildcard via constante
**Fonte:** `supabase/functions/_shared/cors.ts`
**Regra:** O `'*'` de CORS em endpoints públicos deve ser expresso via constante `CORS_WILDCARD_ORIGIN` para evitar falso-positivo no Gate E95 (grep-based).

## RN-08: Contratos de Edge Functions (Gate 1.11)
**Fonte:** `tests/contracts/webhook-schemas.ts`
**Regra:** Toda edge function deve ter contrato registrado em `CONTRACTS`. `magazine-reader-state-read` requer token+fingerprint.

## RN-09: Dependências — Major Bumps por PR Dedicado
**Fonte:** comportamento do repo (PRs #2290, #2293, #2312-#2357)
**Regra:** Bumps de major version (recharts 2→3, @eslint/js 9→10) exigem PR dedicado com validação de breaking changes + peer deps antes de merge.
