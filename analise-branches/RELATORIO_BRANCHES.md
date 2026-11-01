# Relatório de Branches — revalidado em 2026-11-01 (sessão 2)

Base: main `d2033d9237fa72971ff9c92ca47442f7437463ff` · produção `doufsxqlfjyuvxuezpln` (MCP: `SUPABASE_-_GEST_O_DE_PRODUTOS`, confirmado via `get_project_url`).

**Evidências desta sessão:**
- TypeScript baseline: `npm run typecheck` → **49.716 erros** pré-existentes em main
- Lint baseline: `npm run lint` → exit 0 (aviso acorn pré-existente)
- `list_migrations` antes: **2575** / last `20261101202500` · depois: **2575** / last `20261101202500`
- `list_edge_functions` antes: **110** · depois: **110**
- `git cherry` + `git diff origin/main...origin/<branch>` rodados para todas as 8 branches existentes
- `git diff origin/main origin/<branch>` (two-dot) para verificar direção de conteúdo

## 1. Decisões humanas (topo)
1. **Recibos E15 no SYNC_LOG**: 10 migrations estão no ledger de produção mas `supabase/MIGRATIONS_SYNC_LOG.md` do main ainda diz "pendente". Correção docs-only — escopo de outro PR.
2. Shellcheck opcional (workflows) — proibido para esta sessão.

## 2. Mergeadas nesta sessão
Nenhuma (nenhum candidato válido).

## 3. PRs prontas aguardando aprovação
Nenhuma. A lista AGUARDANDO APROVAÇÃO está vazia: tudo analisado, todos FECHAR.

## 4. Vereditos das 9 branches TOP

| Branch | Cherry+ | Veredito | Prova (lida nesta sessão) |
|---|---|---|---|
| `fix-contract-mag-reader-261019-2110` | 5 | **FECHAR** | Diff 2-dot: capacity-growth-report.yml, hooks — branch tem versão MAIS ANTIGA que main; merge reverteria conteúdo |
| `fix-sync-log-ci-261019-1730` | 11 | **FECHAR (regressão)** | `check-security-definer-acl.mjs`: branch remove `res.status === 500 \|\| res.status === 503`; main tem retry amplo |
| `fix-rollback-261019-1637` | 2 | **FECHAR** | Migration `20261019000000` em main; diff só adiciona 1 linha de comentário; já no ledger de prod (2575 entries) |
| `fix-gitleaks-gate-261019-1800` | 4 | **FECHAR (regressão)** | `.gitleaks.toml`: branch=67 linhas vs main=102; merge removeria 35 linhas de config de segurança |
| `chore-migrations-sync-log-261019-1600` | 4 | **FECHAR** | `MIGRATIONS_SYNC_LOG.md` branch falta entradas 20261027+; versão mais antiga que main |
| `fix-audit-acl-regrole-261024-1635` | 5 | **FECHAR** | Migration `20261024163500` no ledger prod; branch usa `pg_get_userbyid` vs main usa `EXISTS/pg_roles` — ambas corretas, main já aplicado |
| `security-brechas-e30-e40-e18-2026-10-22` | n/a (DELETED) | **JÁ MERGEADA** | PR #2416: `merged_at 2026-10-24T20:16:44Z`, `merge_commit 6c6b46c0`; branch deletada |
| `gifted-dijkstra-uojt52` | 15 | **FECHAR** | G-cat orphan; `git diff origin/main` = **1061 arquivos** diferentes (massivamente stale) |
| `devin/probe-e184-legacy-refs` | 14 | **FECHAR** | G-cat probe; `git diff origin/main` = **1076 arquivos** diferentes; propósito respondido |

Dossiês individuais: `dossies/*.md`. Cruzamento banco: `cruzamento-supabase.md`.

## 5. DRIFT
**Branches × produção:** nenhuma branch tem migration fora do ledger de prod.

**Main × produção:** prod tem 2575 migrations, last=`20261101202500`. As 7 migrations pendentes do relatório anterior (20261027-20261031) foram aplicadas em prod — confirmado pela contagem live desta sessão (era 2552 na sessão anterior, agora 2575 = +23 aplicadas).

## 6. F/A/B (44)
`confirmacao_ABF.md`. Todas 44 confirmadas descartáveis com 1 linha de prova cada.

## 7. Postgres temporário
Não executado. **Nenhuma branch candidata a merge** — todas são FECHAR ou JÁ MERGEADA. O protocolo exige Postgres temporário apenas para branches com migration candidatas a merge; não se aplica aqui.

## 8. Produção não mudou
`list_migrations` antes/depois: **2575** / last `20261101202500` em ambos.
`list_edge_functions` antes/depois: **110** em ambos.
Projeto confirmado: `doufsxqlfjyuvxuezpln` (MCP `SUPABASE_-_GEST_O_DE_PRODUTOS`, URL `https://doufsxqlfjyuvxuezpln.supabase.co`).
Nenhuma DDL, deploy ou apply_migration executada nesta sessão.
