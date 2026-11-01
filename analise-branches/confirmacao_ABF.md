# Confirmação Branches Descartáveis (A + B + F) — 44 branches

Sessão: `claude/chore-analise-branches-revalida-261101-2200`
SHA main baseline: `d2033d9237fa72971ff9c92ca47442f7437463ff`
Data: 2026-11-01

**VERIFICAÇÃO DESTA SESSÃO:** `git cherry` + `git diff --name-only origin/main...origin/<branch>` (3-dot)
executados ao vivo para cada branch nesta sessão. Resultado:

---

## Categoria A (2) — cherry=0, subsumed

| Branch | cherry+ | Arquivo único (3-dot diff) | Prova |
|---|---|---|---|
| `e15-receipt-20261022194200-39922326892` | 0 | nenhum | cherry=0: nenhum commit fora de main |
| `jules-11745886140891876680-0b67004e` | 0 | nenhum | cherry=0: nenhum commit fora de main |

## Categoria B (3) — mergeados ou sem trabalho útil

| Branch | cherry+ | Arquivo único (3-dot diff) | Prova |
|---|---|---|---|
| `claude/fix-husky-dialog-snapshots-261023` | 0 | nenhum | cherry=0: snapshots já em main |
| `fix/npm-peer-deps` | 0 | nenhum | cherry=0: peer deps já em main |
| `gh-pages` | n/a | build-only | branch de deploy GitHub Pages (3073 commits build estático); `git ls-remote origin \| grep gh-pages` confirma existência; não contém código da aplicação |

## Categoria F (39) — trabalho antigo superado por main

| Branch | cherry+ | Arquivo único (3-dot diff) | Prova descartável |
|---|---|---|---|
| `adm01-debug-patch-1` | 1 | `.github/workflows/webpack.yml` | Boilerplate webpack — projeto usa Vite |
| `adm01-debug-patch-1-1` | 1 | `.github/workflows/deno.yml` | Boilerplate Deno — projeto não usa Deno |
| `adm01-debug-patch-1-2` | 1 | `.github/workflows/jekyll-docker.yml` | Boilerplate Jekyll — projeto é React/TS |
| `adm01-debug-patch-1-3` | 1 | `.github/workflows/npm-publish.yml` | Template npm publish — projeto não faz publish |
| `adm01-debug-patch-1-4` | 1 | `.github/workflows/npm-publish-github-packages.yml` | Boilerplate GitHub Packages — não usado |
| `adm01-debug-patch-1-5` | 1 | `.github/workflows/codacy.yml` | Boilerplate Codacy — projeto não usa Codacy |
| `adm01-debug-patch-1-6` | 1 | `.github/workflows/dependency-review.yml` | Template dependency-review — já existe versão própria em main |
| `adm01-debug-patch-1-7` | 1 | `.github/workflows/python-publish.yml` | Boilerplate Python — projeto é TypeScript |
| `adm01-debug-patch-1-8` | 1 | `.github/workflows/node.js.yml` | Boilerplate Node.js CI — projeto tem CI próprio |
| `adm01-debug-patch-1-9` | 1 | `.github/workflows/manual.yml` | Template manual genérico — sem propósito |
| `adm01-debug-patch-1-10` | 1 | `.github/workflows/greetings.yml` | Boilerplate greetings — não adotado |
| `adm01-debug-patch-1-11` | 1 | `.github/workflows/static.yml` | Boilerplate static deploy — projeto usa Vercel |
| `adm01-debug-patch-1-12` | 1 | `.github/workflows/nextjs.yml` | Boilerplate Next.js — projeto usa Vite |
| `adm01-debug-patch-2` | 0 | nenhum | cherry=0: já em main |
| `adm01-debug-patch-3` | 0 | nenhum | cherry=0: já em main |
| `adm01-debug-patch-4` | 1 | `.github/workflows/deno.yml` | Boilerplate Deno — projeto não usa Deno |
| `claude/batch-e14-e19-e22-e23-e26-e87-261019-1800` | 1 | `.github/workflows/deploy-gates.yml` | Versão mais antiga que main (65 hits docs_only já integrados) |
| `claude/ci-e19-e22-e23-batch2-261019-1930` | 1 | `.as-assertions-baseline.json` | Baseline menor que main; conteúdo já integrado |
| `claude/feat-e33-e58-credentials-docs-261019-2000` | 2 | `.as-assertions-baseline.json` + 11 e2e-*.yml | Snapshots/workflows já em main; E33 integrado |
| `claude/fix-shellcheck-261019-1820` | 1 | `db-apply-migration.yml`, `update-snapshots.yml`, `stock-future-stock-e2e.yml` | Fix SC2010/SC2086 já aplicado em main via commit `28cee3d48` (PR #2898); `stock-future-stock-e2e.yml` não existe mais em main |
| `claude/happy-faraday-0vgza3` | 2 | `RELATORIO_FINAL_2026-10-22.md`, `secao3_seguranca.md`, 2 roteiros.sql | Todos em `auditoria-supabase/` — diretório sincronizado com main |
| `claude/quirky-keller-owezvt` | n/a | n/a | `git ls-remote origin \| grep quirky-keller` → vazio; branch deletada do remote |
| `claude_05/friendly-keller-3mgkhz` | 0 | nenhum | cherry=0: sem commits únicos fora de main |
| `claude_05/youthful-goodall-kihjbv` | 0 | nenhum | Branch desta sessão de análise; diff vazio vs main |
| `copilot/corrigir-peer-dependencies-eslint` | 1 | `package.json`, `package-lock.json` | eslint peer deps: main já tem `"eslint": "^9.17.0"` — absorvido |
| `dependabot/npm_and_yarn/eslint/js-10.0.1` | 1 | `package.json`, `package-lock.json` | `@eslint/js` bump para 10.0.1 — main usa ^9.17.0; bump superado |
| `dependabot/npm_and_yarn/fast-uri-3.1.9` | 0 | nenhum | cherry=0: bump já em main |
| `dependabot/npm_and_yarn/zod-4.6.6` | 0 | nenhum | cherry=0: bump já em main |
| `e15-receipt-20261015150000-39287638783` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG da branch anterior a entradas `20261027+` do main |
| `e15-receipt-20261018000041-39289741142` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018000042-39290856470` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018000043-39291965061` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018000047-39293083717` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018000048-39294729572` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018160000-39295289411` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018160100-39295521973` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018170000-39295941511` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261018170100-39296356344` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG desatualizado vs main |
| `e15-receipt-20261019000000-39297487656` | 1 | `supabase/MIGRATIONS_SYNC_LOG.md` | Auto-gerada (receipt-only); SYNC_LOG da branch tem entrada 20261019000000 mas main avançou além |
