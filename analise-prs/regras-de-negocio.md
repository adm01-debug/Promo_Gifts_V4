# Regras de Negócio — Promo Gifts V4

**Extraídas de:** docs/, CLAUDE.md, enums, migrations, policies, CI gates  
**Data:** 2026-11-09  
**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX

---

## 1. Infraestrutura e Stack

- **Stack:** React + TypeScript + Vite + Supabase Gold (`doufsxqlfjyuvxuezpln`)
- **Arquitetura Medallion:** Bronze → Silver → Gold (Supabase PG17)
- **UI builder:** Lovable (gpt-engineer-app[bot]) commita diretamente em `main`
- **Deploy:** Merge em `main` = deploy em produção via Lovable/Vercel
- **Vercel:** projeto canônico `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` (team `juca1`)
- **`.vercel/project.json`** versionado — não deletar (REGRA #11 CLAUDE.md)
- **SSOT:** `doufsxqlfjyuvxuezpln` — nunca `pqpdolkaeqlyzpdpbizo` (projeto descartado)

## 2. Tipo `Product` — campos críticos (REGRA #2)

O tipo em `src/types/product-catalog.ts` DEVE conter:

```typescript
price: number           // preço original
sale_price?: number     // preço de venda
shortDescription: string
category_id?: string
category_name?: string
```

Fonte: CLAUDE.md REGRA #2. Histórico: commit `f22e1e2` removeu esses campos (2026-06-11).

## 3. Produtos

- **Soft-delete:** `deleted_at IS NOT NULL` = produto removido
- **Count ativo:** 8321 produtos (verificado 2026-11-09T18:55Z via `SELECT COUNT(*) FROM products WHERE deleted_at IS NULL`)
- **View FT-079:** `vw_products_min_quantity` — `CREATE OR REPLACE VIEW`, idempotente, implementada em #3264
- **min_quantity:** regra de pedido mínimo por produto/variante

## 4. Migrations e Schema

- **Caminho único de aplicação:** `.github/workflows/db-apply-migration.yml` (workflow_dispatch)
- **Idempotência obrigatória:** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`
- **Proibido:** `DROP FUNCTION`, `DROP POLICY`, `DROP TABLE`, `ALTER TYPE` sem backward compat
- **Proibido via execute_sql:** DDL em sessão de agente Claude (REGRA #8 corolário E056)
- **RLS deny-all:** implementado idempotentemente (confirmado em produção via #3257)
- **Arquivos espelho CRON-001:** `20261101223908`, `20261101232022` (já aplicados em produção, registrados em #3261)
- **Partições de events 2027:** criadas idempotentemente (confirmado em #3257)
- **Ledger:** `supabase_migrations.schema_migrations` — deve estar sincronizado
- **Corolário E056:** `execute_sql` existe apenas para leitura (SELECT, EXPLAIN, pg_catalog)

## 5. CI Gates

- **Gate Final:** único required check em `main` (`.github/workflows/deploy-gates.yml`)
- **Gate 0:** SSOT — valida `doufsxqlfjyuvxuezpln` em `src/integrations/supabase/client.ts`
- **Gate 0.5:** `npm audit --audit-level high` — sem CVE high/critical
- **Gate 1:** Lint (ESLint) + TypeScript sem erros
- **Gate 1.6:** Bundle size dentro dos limites
- **Gate 1.9:** Ratchets — TODO/FIXME/`as any`/file-size não aumentam
- **Gate 1.9.1:** `console.*` baseline — não aumenta
- **Gate 1.10:** indexed-access ratchet
- **Gate 1.14:** Segredos documentados em `docs/ci/SEGREDOS.md` — adicionados 4 em #3366: TEST_ADMIN_PASSWORD, TEST_SELLER_PASSWORD, SMOKE_HEALTH_FN_URL, SMOKE_BASE_URL
- **Gate 2:** vitest — testes unitários
- **Gate 3:** E2E Smoke (Playwright, chromium)
- **Gate 6:** Build Vite sem erro

## 6. Restrições de Merge Autônomo

Merge autônomo (squash) permitido quando:
- CI verde (Gate Final SUCCESS)
- Sem conflito com main
- Escopo: front, edge function, workflow N8N, ajuste de config

DEVE aguardar PO (não mergear autonomamente):
- DDL/migration em banco de produção
- `.github/workflows/` (qualquer arquivo)
- Segredos/Dockerfile/infra
- Deleção de dado ou mudança de arquitetura
- Conflito com PR de outro agente

## 7. Kit Builder

- **FT-083/093/134/139/174:** UX batch6 rebuild implementado (#3350)
- **file-size baseline:** atualizado (#3343) após FT batch6
- **consumeUnloadBackup:** corrigido (#3344)
- **useKitBuilderQuote:** 5 falhas preexistentes corrigidas (#3348)
- **PriceFreshnessBadge:** snapshots atualizados (#3349)
- **Hook OOM:** `check-eslint-baseline.mjs` falha por OOM antes de escrever output → `JSON.parse(readFileSync(out))` lança ENOENT → exit 1 errado. Fix em PR #3365 (aguarda CI).

## 8. Branches e Agentes

- **Apenas 1 agente por branch:** branches de outras sessões Claude são READ-ONLY
- **Prefixos de agentes:** `claude/`, `claude_pink/`, `codex/`, `devin/`
- **Branch de entrega desta sessão:** `claude_pink/sleepy-cannon-h000nc` (PR #3355 — NUNCA MERGEAR)
- **REGRA #9:** sessão que gera commit de governança termina com `git push`
- **REGRA #10:** merge cross-agente exige PR

## 9. Dependabot e Bump PRs

- **Critério geral:** Dependabot PRs precisam de Gate Final SUCCESS para ser mergeados
- **Bloqueadores típicos:** conflito com main, npm ci ERESOLVE, zero CI runs no head SHA
- **PRs 3327-3334:** todos bloqueados por workflows ou zero CI
- **data-fns 3→4 (#3331):** CONFLICTING/DIRTY
- **eslint@10 (#3332):** quebra deps (npm ci ERESOLVE)
- **framer-motion 11→14 (#3333):** zero Gate Final
- **@sentry/react 8→11 (#3334):** zero Gate Final
