# PENDÊNCIAS — Branch `claude/laughing-cori-o9w35e` / PR #2338

**Atualizado em:** 2026-10-22  
**HEAD:** `47c4e91e`  

---

## P1 — `python-package-conda.yml` obsoleto em main

**Status:** ⚠️ Bloqueado — ação de PO/eng necessária  
**Causa:** `python-package-conda.yml` existe em main com `actions/setup-python@v3` (obsoleto) e SC2086. O arquivo NÃO existe no nosso branch — o Workflow Lint passa no nosso PR. Após o merge, main ainda terá o arquivo problemático.  
**Motivo do bloqueio:** Arquivo em main, não no nosso branch. Criar PR separado para deletar ou fixar.  
**Ação necessária:** Criar PR adicional para deletar `python-package-conda.yml` de main (arquivo de template não utilizado) ou atualizá-lo.  

---

## P2 — Visual Snapshot Baselines (P21b)

**Status:** ⚠️ Bloqueado — ação do PO necessária  
**Causa:** Snapshots visuais desatualizados. Workflow `update-snapshots.yml` precisa ser disparado via `workflow_dispatch`.  
**Motivo do bloqueio:** Requer PO disparar `update-snapshots.yml` com `workflow_dispatch`.  
**Ação necessária:** PO dispara `.github/workflows/update-snapshots.yml` via GitHub Actions UI.

---

## P3 — `Compare GitHub × Canonical` (P16 / required check)

**Status:** ⚠️ Em investigação  
**Causa:** Edge functions drift check entre GitHub e deployment canônico.  
**Observação:** `edge-functions-drift-check` passou ✅ no PR (run 39718254483). Se esse é o required check, está OK.  
**Motivo do bloqueio:** Verificar se `required-checks.json` usa o mesmo nome que o workflow de drift.

---

## P4 — E2E · `quote-view-overflow-regression.spec.ts` 

**Status:** ⚠️ Pré-existente em main  
**Causa:** Sticky sidebar falha em múltiplas resoluções — `@smoke sticky da sidebar sobrevive em múltiplas resoluções` apareceu como falha em Gate 3 no run de main `39670397385`.  
**Motivo do bloqueio:** Pré-existente, não causado por este PR. Investiga-se em PR separado.

---

## P5 — Segurança: Migration de REVOKE PUBLIC GRANT

**Status:** ⚠️ Pendente (E056 — DDL via workflow apenas)  
**Causa:** `fn_backfill_queue_reap_stuck` e `fn_detect_recurring_errors_last_hour` têm GRANT PUBLIC não intencionado.  
**Gap:** Qualquer `authenticated` pode chamar essas funções SECURITY DEFINER.  
**Motivo do bloqueio:** Requer migration via `db-apply-migration.yml` (REGRA E056). Arquivos SQL precisam ser criados e aprovados pelo PO.  
**Ação necessária:**  
1. Criar `supabase/migrations/20261022_revoke_fn_backfill_queue_reap_stuck_public_grant.sql`  
2. Criar `supabase/migrations/20261022_revoke_fn_detect_recurring_errors_public_grant.sql`  
3. Disparar `db-apply-migration.yml` com versão explícita após aprovação do PO.

---

## P6 — Vulnerabilidades Dependabot (3 high, 3 moderate)

**Status:** ⚠️ Monitoramento  
**Causa:** 6 vulnerabilidades pré-existentes (não introduzidas por este PR).  
**Gate afetado:** Gate 0.5 (`npm audit --audit-level high`) — se as vulnerabilidades não têm fix disponível, o Gate 0.5 pode estar configurado para `--production` ou pode já estar passando em main.  
**Motivo do bloqueio:** Vulnerabilidades pré-existentes em main. Gate 0.5 passou em main (run 39670397385: `R_DEP_AUDIT: success`).  
**Ação necessária:** Monitorar. Se surgirem novas CVEs high/critical, abrir PR de atualização.

---

## Itens Concluídos ✅

| Item | Commit | O quê foi corrigido |
|---|---|---|
| CNPJ maxLength | `47c4e91e` | `maxLength={18}` removido — Playwright fill() truncava strings > 18 chars |
| ALLOWLISTS_MEMORY.md | `47c4e91e` | 9 entradas lint-0011 + 6 entradas lint-0029 adicionadas |
| Spec 13b regex | `47c4e91e` | Toast RLS restringido ao título canônico |
| lint-0029 reason | `47c4e91e` | fn_backfill_queue_reap_stuck — gap documentado |
| lint-0011 OUT params | `bd851bb4` | 9 funções pgstattuple/pg_relpages sem OUT params na allowlist |
| Gate 1.12 CONTRACTS | `cb2706ca` | `magazine-reader-state-read` adicionado a NO_BODY_EXEMPT |
| Workflow Lint | (pré-existente no branch) | `stale.yml` já usa v9.1.0; `python-package-conda.yml` não existe no branch |
| Supabase Linter Gate | `bd851bb4` | lint-0011 alinhado com pg_get_function_identity_arguments |

---

_Atualizado automaticamente por sessão Claude — 2026-10-22_
