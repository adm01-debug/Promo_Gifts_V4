# Dossiê — devin/probe-e184-legacy-refs

**Data análise:** 2026-10-24  
**SHA main baseline:** 652a7f14  
**Merge-base:** 0cf49ffb | Ahead: 9 (git cherry) | Behind: ~77

## Intenção
Branch criada pelo Devin para E184 (legacy refs scan). Commit único genuíno: SQL probe read-only que varre o catálogo vivo atrás de referências a `pqpdolkaeqlyzpdpbizo` (projeto proibido) em funções, pg_cron jobs e GUCs. O resto dos commits são work-in-progress já mergeado em main.

## Commits (9 cherry-unique, mas maioria já em main por conteúdo)
```
1cc6041e test(probe): leitura read-only de refs legadas no catálogo vivo (E184)   ← ÚNICO
b27db99f fix(ci): rodada-5 — ressincroniza lock pós-#2284, endurece E064 + injeção  ← parcialmente único
50f513e7 chore(ci)(deps): bump actions/checkout (#2264)  ← mergeado
46275a9b fix(e2e+scripts+src): F3+F4+F5b de #2228 (#2284)  ← mergeado
...
```

## Arquivo de Valor Único
`qa/migrations-draft/probe_e184_legacy_refs.sql` — script `DO $$ ... BEGIN...ROLLBACK $$` que:
- Varre `pg_proc` via `pg_get_functiondef()` por `pqpdolkae`
- Varre `cron.job.command` por `pqpdolkae`  
- Varre GUCs `app.*` por `pqpdolkae`
- Propaga resultado via `EXCEPTION` proposital (read-only, nada persiste)

Não está em produção; é ferramenta de QA / auditoria.

## Arquivos modificados (exclusivos desta branch)
- `qa/migrations-draft/probe_e184_legacy_refs.sql` — probe E184 (ÚNICO valor real)
- Demais arquivos (`.github/workflows/**`, `src/**`, `scripts/**`): já em main via PRs (#2264, #2282, #2283, #2284, #2245, #2249, #2232, #2248)

## Cruzamento Supabase
- **Migrations:** ZERO (probe é `DO $$ BEGIN...ROLLBACK $$` — nada persiste)
- **Edge functions:** ZERO

## VEREDITO
**RESGATAR PARCIAL** — salvar apenas `qa/migrations-draft/probe_e184_legacy_refs.sql`. O probe E184 tem valor operacional (identificar refs legadas ao projeto proibido em produção) e não está em nenhuma outra branch. O restante dos commits já está em main.

**Ação:** criar branch `claude/fix-probe-e184-<timestamp>` com cherry-pick somente do arquivo `qa/migrations-draft/probe_e184_legacy_refs.sql` do commit `1cc6041e`, abrir PR.
