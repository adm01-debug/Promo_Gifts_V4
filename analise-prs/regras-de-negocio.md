# Regras de Negócio — Promo Gifts V4

**Data:** 2026-10-22  
**Baseline main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`  
**Fontes:** CLAUDE.md, `.github/workflows/deploy-gates.yml`, `src/integrations/supabase/client.ts`, `tests/contracts/webhook-schemas.ts`, `scripts/validate-supabase-config.mjs`, `supabase/functions/`, `docs/SCHEMA_REFERENCE.md`

---

## 1. SSOT Supabase — Regra #1 (IMUTÁVEL)

**Fonte:** `CLAUDE.md` §1 + `src/integrations/supabase/client.ts`  
**Evidência:** `grep CURRENT_PROJECT_ID src/integrations/supabase/client.ts` → `doufsxqlfjyuvxuezpln`

O projeto canônico de produção é **`doufsxqlfjyuvxuezpln`** (Gold/Medallion — PG17).

- `pqpdolkaeqlyzpdpbizo` é PROIBIDO em qualquer código executável
- Gate 0 do CI valida isso: `scripts/validate-supabase-config.mjs`
- O Lovable reverte `client.ts` silenciosamente — sempre verificar após commits do bot
- Incidente 2026-06-11: 6+ reversões em 10 min → 401 em produção

**Impacto para PRs:** qualquer PR que introduza `pqpdolkaeqlyzpdpbizo` = NÃO MERGEAR.

---

## 2. Campos Críticos do Tipo `Product` — Regra #2

**Fonte:** `CLAUDE.md` §2 + `src/types/product-catalog.ts`  
**Campos obrigatórios:**

```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

- Gate 1.1 do CI valida esses campos
- Commit `f22e1e2` (2026-06-11) removeu esses campos → 3 commits extras para restaurar
- Lovable pode renomear `price → sale_price` sem anunciar

**Impacto para PRs:** qualquer PR que remova esses campos = NÃO MERGEAR.

---

## 3. Schema Supabase — Regra #4

**Fonte:** `CLAUDE.md` §4 + `src/integrations/supabase/types.ts`  
**Tabelas/views que devem existir** (verificação manual obrigatória):

- `personalization_techniques`
- `products`
- `product_variants`
- `suppliers`
- `supplier_products_raw`
- `magazines`, `magazine_items`, `magazine_templates`

- Gate 1.2 do CI valida drift estrutural (TypeScript Compiler API, não contagem de `export type`)
- Incidente `7716ae9` (2026-07-16): Lovable removeu todas as tabelas `magazine_*` → 80+ erros TS

**Impacto para PRs:** qualquer PR que altere `types.ts` e remova tabelas sem allowlist = NÃO MERGEAR.

---

## 4. Contratos de Edge Functions — Gate 1.12

**Fonte:** `tests/contracts/webhook-schemas.ts`  
**Evidência:** Gate 1 job `119907185294`, step Gate 1.12

Todas as edge functions do Supabase devem estar documentadas no mapa `CONTRACTS` de `webhook-schemas.ts`.

- Funções GET-only (sem body) entram no set `NO_BODY_EXEMPT`
- Funções com body precisam de schema Zod definido
- `magazine-reader-state-read` é uma função GET-only → deve estar em `NO_BODY_EXEMPT` (correção do PR #2338)

Funções conhecidas e seus contratos (baseado em análise do diff do PR #2338):
- `magazine-reader-state-read`: GET-only, sem body → `NO_BODY_EXEMPT`

**Impacto para PRs:** PR que adiciona nova edge function sem entrada no contrato = bloqueada pelo Gate 1.12.

---

## 5. Gates de CI — Estrutura Obrigatória

**Fonte:** `CLAUDE.md` §CI + `.github/workflows/deploy-gates.yml`  
**Único check required no branch protection de `main`:** `Gate Final - Deploy Ready`

Gates obrigatórios que compõem o Gate Final:

| Gate | Check | Bloqueante |
|---|---|---|
| 0 | SSOT `doufsxqlfjyuvxuezpln` | sim |
| 0.5 | `npm audit --audit-level high` | sim |
| 1 | Lint + TypeScript | sim |
| 1.1 | Campos críticos Product | sim |
| 1.2 | Drift estrutural types.ts | sim |
| 1.12 | Contract coverage (edge functions) | sim |
| 2 | Testes unitários (vitest) | sim |
| 2.5 | Integridade transacional PostgreSQL | sim |
| 3 | E2E Smoke | sim |
| 5 | SEO sanity | sim |
| 6 | Build Vite + SBOM | sim |

**Falhas pré-existentes no baseline `8e8053b9`** (não são regressão de PRs):
- Gate 0.5: advisories moderate em `@vitest/coverage-v8`, `@vitest/mocker`, `vitest`
- Gate 1 step 1.12: `magazine-reader-state-read` ausente do contrato (corrigido pelo PR #2338)
- E2E Error Boundaries: spec list vazia (infra CI failure)
- cart-invariants chromium shard 1: `[E108] sem carrinhos disponíveis` (setup de dados)
- E2E Full User Flows: auth/v1/token 504 (Supabase auth instável)
- E2E Personalization Journey: product-card timeout + auth guard não ativado
- Migrations x Canonical (Gate E40): ECR Public rate limit

---

## 6. Regras de Workflow de CI — Padrão E12 (R1–R20)

**Fonte:** `CLAUDE.md` §CI Padrão E12 + `docs/ci/PADRAO_WORKFLOW.md`

Regras críticas para qualquer workflow em `.github/workflows/`:

- **R1:** `permissions:` explícito (mínimo `contents: read`)
- **R3:** `timeout-minutes:` em todo job (estático ≤ 5 min, E2E ≤ 20 min por shard)
- **R4:** `node-version-file: .nvmrc` (nunca `'22'` literal)
- **R8:** ID de job em kebab-case (ex: `ssot-gate`, `unit-tests`)
- **R11:** `permissions.contents: write` PROIBIDO em workflows com trigger `pull_request`
- **R14:** Runner `ubuntu-24.04` (nunca `ubuntu-latest` — migra para Ubuntu 26 em 19/10/2026)
- **R15:** Actions externas pinadas por SHA completo de 40 chars
- **R18:** `supabase db push` PROIBIDO em qualquer step `run:`
- **R19:** Nenhum workflow referencia `pqpdolkaeqlyzpdpbizo`

**Impacto para PRs:** qualquer PR que viole R1–R20 em workflows = bloqueada pelo actionlint (Gate 1).

---

## 7. Migrations e DDL — Regra #8

**Fonte:** `CLAUDE.md` §8 + `docs/db/POLITICA_DDL.md`

- **Único caminho autorizado para migration em produção:** `.github/workflows/db-apply-migration.yml` (workflow_dispatch)
- `supabase db push` é PROIBIDO (Regra #1/§7)
- `execute_sql` com DDL é PROIBIDO em sessão de agente (E056)
- Migrations via MCP/dashboard fora do workflow exigem migration espelho + `migration repair` + PR no mesmo dia

**Migrations aceitáveis em PR:**
- Aditivas (CREATE TABLE/INDEX/FUNCTION, INSERT)
- Não destrutivas (sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa)
- Idempotentes (WITH IF NOT EXISTS onde aplicável)
- Testadas aplicando toda a cadeia em Postgres temporário

**Impacto para PRs:** PR com migration destrutiva = NÃO MERGEAR. PR com migration aditiva = verificar idempotência.

---

## 8. Edge Functions — Deploy

**Fonte:** `CLAUDE.md` §8 corolário  
**Único caminho autorizado:** `.github/workflows/deploy-edge-functions.yml` (workflow_dispatch)

- `deploy_edge_function` via MCP é PROIBIDO como caminho padrão (só para leitura/inspeção)
- Deploy fora do workflow cria divergência silenciosa (casos: `kit-ai-builder` 2026-09-23, `magazine-reader-state-read` 2026-09-24)

**Impacto para PRs:** PR que altera edge function = verificar testes + nenhum afrouxamento de autenticação.

---

## 9. RLS e Permissões

**Fonte:** `CLAUDE.md` Gates 1.13, 1.13.1, 1.13.2

- Gate 1.13: RLS policies baseline vs `pg_policies` ao vivo
- Gate 1.13.1: Tabelas com RLS habilitada e zero policies = deny-all silencioso (bloqueante)
- Gate 1.13.2: 7 tabelas com INSERT anônimo têm trigger de rate guard

**Impacto para PRs:** PR que altera RLS/permissões = só se testes em Postgres temporário provarem que nenhum acesso foi ampliado.

---

## 10. Multi-Agente — Regra #10

**Fonte:** `CLAUDE.md` §10

Seis agentes escrevem neste repositório: Claude, Codex, Devin, Lovable, github-actions, cline.

- Merge direto entre branches de agentes diferentes SEM PR = PROIBIDO
- Resolver conflitos entre agents = registrar em `docs/coordenacao/conflitos-semanticos.md`
- Gate 1.18: Ledger de conflitos semânticos — PRs de agentes diferentes bloqueados sem aprovação

**Impacto para PRs:** PR que merge branch de um agente direto em branch de outro = verificar Gate 1.18.

---

## 11. SINGU — READ-ONLY

**Fonte:** instrução do operador na tarefa original

SINGU é sistema externo integrado e SOMENTE LEITURA.  
**Qualquer PR que escreva no SINGU = NÃO MERGEAR.**

---

## 12. Clusters de PRs Identificados

### Cluster: Correções de CI (Claude agent)
- PR #2338 ✅ MERGEADA — Gate 1.12 fix + 5 workflows
- PR #2316 ⏳ AGUARDAR_REBASE — Gate 1.12 fix alternativo (conflito semântico com #2338)
- PR #2312 ⏳ AGUARDAR_REBASE — paths E197+E24

### Cluster: Ratchets e credenciais (Claude agent)
- PR #2314 ⏳ AGUARDAR_REBASE — productionAsCount bump
- PR #2315 ⏳ AGUARDAR_REBASE — remove credenciais reais C25 (depende de #2314)

### Cluster: Major bumps de dependências (Dependabot)
- PR #2290 🤔 DECISAO_HUMANA — @eslint/js 9→10
- PR #2293 🤔 DECISAO_HUMANA — recharts 2→3

### Cluster: Templates de CI (github-actions bot) — 15 PRs
- PRs #2322–#2331, #2333–#2337 ❌ FECHAR — workflows para stacks erradas (Django, Go, Rust, etc.)
- Nenhuma dessas PRs altera código do projeto; todas geradas automaticamente pelo GitHub Actions

### Singular
- PR #2319 ❌ NAO_MERGEAR — Jules bot, 0 arquivos, PR vazia
- PR #2320 📝 DRAFT — aguardar promoção pelo autor
