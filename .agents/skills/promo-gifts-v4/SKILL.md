---
name: promo-gifts-v4
description: Regras operacionais do repo Promo_Gifts_V4 (stack, comandos de lint/test/build, branch/commit/PR, banco Supabase canônico, proibições). Use ao começar qualquer tarefa neste repositório ou quando precisar saber como testar, commitar ou abrir PR aqui.
---

# Promo Gifts V4 — como trabalhar neste repo

Fonte completa: `AGENTS.md` na raiz (vence qualquer doc, relatório ou plano antigo). Referência longa em
`docs/agentes/`. Responda em PT-BR; o dono não é dev.

## Identidade
- Repo `adm01-debug/Promo_Gifts_V4` — React + TypeScript + Vite + Supabase (PG17). Node em `.nvmrc`, npm.
- Banco oficial (SSOT, produção): `doufsxqlfjyuvxuezpln`. Projeto proibido (legado): `pqpdolkaeqlyzpdpbizo`.
- Merge em `main` = produção (deploy automático na Vercel).

## Comandos
- `npm run lint` · `npm run qa:typecheck` · `npm test` (vitest, `TZ=America/Sao_Paulo`) · `npm run build`
- `npm run test:e2e` (Playwright; projetos: `grep "name:" playwright.config.ts`) · `npm run qa:full`
- Guardas: `node scripts/validate-supabase-config.mjs` · `node scripts/check-product-type-fields.mjs`

## Branch, commit, PR
- Branch de `main` atualizado: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>`. Nunca commite em
  `main`; só escreva em branch que você criou nesta sessão. Uma tarefa = uma branch = uma PR.
- Commit em PT-BR, `tipo(escopo): descrição` (commitlint; tipos: feat, fix, test, refactor, chore, docs,
  ci, build, perf, style, hotfix, revert, merge). Prefira 1 commit atômico.
- PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência (arquivo:linha,
  diff, saída de comando). Antes da PR: typecheck/lint/testes dos arquivos tocados.
- Mergeie sem aprovação (squash) só PR sua, CI verde, sem conflito, escopo comum. Deixe aberta e chame o
  dono: DDL/migration, CI/workflows, segredos, infra, deleção de dado, arquitetura, custo, conflito com
  outro agente.

## Nunca
- DDL/migration fora do workflow `db-apply-migration.yml` (nem via MCP `execute_sql`, nem em emergência).
  O `db push` do CLI do Supabase é proibido. Deploy de edge function só por `deploy-edge-functions.yml`.
- Referenciar o projeto legado `pqpdolkaeqlyzpdpbizo` em código executável.
- Alterar sem motivo explícito: `src/integrations/supabase/client.ts`, `scripts/validate-supabase-config.mjs`,
  `.env.example`, `.lovableignore`, `.github/CODEOWNERS`, `scripts/sentinel-check.sh`,
  `.github/workflows/deploy-gates.yml`, `.vercel/project.json`, `docs/SCHEMA_REFERENCE.md`.
- Segredos em código, commit ou resposta. Afirmar "testado" sem evidência. Expandir escopo.

## Onde olhar
- Banco/migrations/types: `docs/agentes/banco-migrations.md` · CI/gates: `docs/agentes/ci-gates.md`
- Lovable, conflitos, Vercel: `docs/agentes/lovable-conflitos-vercel.md`
- Estado real: `inventario/estado/` · contexto vivo: `git show origin/contexto:docs/contexto/00-INDEX.md`
- Grafo de código: `graphify query "<pergunta>"` quando `graphify-out/graph.json` existir.
