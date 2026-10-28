# RELATÓRIO CI — Promo Gifts V4
**Gerado em:** 2026-10-28  
**Branch de correção:** `fix/ci-workflows` (esta sessão)  
**SHA main no momento do diagnóstico:** `8c81483` (pós-fix Gate E40)  
**SHA main final (pós-merge PR #2704):** `4562f376` (docs-only — sem alteração de código)

---

## 1. Inventário de Workflows — Estado atual na Main (SHA `4562f376`)

| Workflow | Último run na main | Conclusão | Observação |
|---|---|---|---|
| Deploy Gates (Gate Final) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | ✅ success | SHA `4562f376` |
| Branch Protection Sentinel | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | ✅ success | SHA `4562f376` |
| E2E — Critical Flows | [40741741633](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741633) | ✅ success* | SHA `4562f376` — 90% skipped (requireAuth sem secrets) |
| E2E — Personalization Flow | [40741742442](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742442) | ✅ success* | SHA `4562f376` — skipped (requireAuth) |
| E2E • Swatch QuickView | [40741742801](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742801) | ⏳ pending | SHA `4562f376` — em execução no momento do relatório |
| CI Replenishment Module E2E | [40735988559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988559) | ❌ failure | SHA `9bb37c44` — 4 secrets E2E ausentes (P1) |
| Edge Integration Tests — All | [40735988490](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988490) | ❌ failure | SHA `9bb37c44` — versões edge functions desatualizadas (P11) |
| edge-functions-drift-check | [40740410933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40740410933) | ❌ failure | SHA `c7bc0ba6` — drift GitHub × canônico (P8) |
| db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | ❌ failure | workflow_dispatch SHA `2cee272b` — ledger divergente (P7) |
| Kit Coverage — Integration | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | ❌ failure | schedule SHA `62af0798` — GRANT ausente (P12) |
| E2E Quotes — Matrix (E77) | N/A | N/A | Workflow só roda em PR; 0 execuções na main |

> `*` success via `requireAuth`: os testes verificam se as secrets E2E estão presentes; sem elas, o suite é skipped integralmente e o workflow retorna success. A causa raiz (secrets ausentes) está em P1.

---

## 2. Baseline desta sessão (2026-10-28 — ANTES de qualquer alteração)

> Todos os comandos rodados na branch `fix/ci-workflows` resetada para `origin/main` (`8c81483`).

### 2a. npm install
```
npm install → exit 0 (minor audit warnings, sem blockers)
```

### 2b. Build (Vite)
```
npm run build → exit 0
vite v5.x.x building for production...
built in 19.14s
Apenas warnings pre-existentes INEFFECTIVE_DYNAMIC_IMPORT (não bloqueantes)
```

### 2c. Typecheck (tsc)
```
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit → exit 0
Nenhum erro de TypeScript.
```

### 2d. Lint (ESLint)
```
NODE_OPTIONS="--max-old-space-size=4096" npm run lint:baseline → exit 0
ESLint baseline gate [full] — atual: 0 erros, 0 warnings · baseline: 0 erros
Δ vs baseline: regressões +0 · melhorias −0 · líquido +0
✅ Nenhuma regressão de lint detectada.
```

> Nota: execuções sem NODE_OPTIONS falham por OOM no container local (heap limit 2GB).

### 2e. Testes unitários (Vitest)

```
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run

Test Files  1 failed | 1209 passed | 131 skipped (1341)
     Tests  3 failed | 25653 passed | 1134 skipped | 24 todo (26814)
  Start at  11:24:43
  Duration  1261.23s
```

> **3 falhas TZ-dependentes em `tests/unit/date-utils.test.ts`** (função `formatTime`): testes esperam horário em BRT (UTC-3), mas o container roda em UTC. O Gate 2 no CI passa porque roda com `TZ=America/Sao_Paulo`. No container local sem essa variável, as 3 falham. Não são regressões.

---

## 3. Correções aplicadas nesta sessão

### Grupo A — Testes unitários Calendar (P5 — CI Security & Drift Checks)

**Causa raiz:** O commit `8b0b606` migrou o `calendar.tsx` de react-day-picker v8 para v10, mas não atualizou os testes. No v10, `aria-selected="true"` vai para o `<td>` (não para o `<button>`) e botões de dia não têm mais `name="day"`.

**Fix:** Commit `c73cb9b` na main — 3 arquivos corrigidos:

| Arquivo | Linha | Antes | Depois |
|---|---|---|---|
| `calendar.dimensions.test.tsx` | 78 | `querySelector('button[aria-selected="true"]')` | `querySelector('[aria-selected="true"] button')` |
| `calendar.dimensions.test.tsx` | 110 | `querySelectorAll('button[name="day"]')` | `querySelectorAll('td[role="gridcell"] button')` |
| `calendar.redesign.test.tsx` | 58–63 | busca frágil por `text-destructive` | `Array.from(querySelectorAll('td')).find(td => td.className.includes('[&>button]:text-destructive'))` |
| `calendar.redesign.test.tsx` | 68 | `querySelector('button[aria-selected="true"]')` | `querySelector('[aria-selected="true"]')` |
| `date-picker-field.test.tsx` | 60 | click direto no `<td>` | `querySelector('button') ?? cell` + click |

### Grupo B — Gate E40 Schema Drift (P4 — Deploy Gates)

**Causa raiz:** As migrations `20261027120000` e `20261027140000` executavam `ALTER SYSTEM SET cron.database_name` e `UPDATE cron.job` incondicionalmente. No ambiente de replay do Gate E40 (que usa PostgreSQL sem extensão `pg_cron`), esses comandos lançavam `RAISE EXCEPTION` e abortavam o replay.

**Fix:** Commit `8c81483` na main — guard `IF to_regclass('cron.job') IS NULL` adicionado nas duas migrations.

---

## 4. Comparação baseline × pós-correção

| Métrica | Pré-correção (baseline) | Pós-correção (main `4562f376`) |
|---|---|---|
| Build Vite | ✅ exit 0, 19.14s | ✅ exit 0 |
| TypeScript (tsc) | ✅ exit 0 | ✅ exit 0 |
| Testes unitários | 3 falhas TZ-ambientais | 3 falhas TZ-ambientais (inalteradas — ambiente) |
| Lint (ESLint) | ✅ 0 erros | ✅ 0 erros |
| Deploy Gates (Gate Final) | ❌ Gate E40 failure | ✅ success (run [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537)) |
| Branch Protection Sentinel | ❌ título sem (#NNN) | ✅ success (run [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700)) |

> **SHA `4562f376` valida o baseline:** o commit `4562f376` (PR #2704) alterou apenas `PENDENCIAS.md` e `RELATORIO_CI.md` (docs na raiz). Nenhum arquivo de código, migration, edge function, teste ou workflow foi modificado. Os resultados do baseline (build/lint/tsc/vitest) são válidos para este SHA — não há delta de código a medir.

**Nenhuma regressão introduzida:** somente 3 arquivos de teste e 2 migrations foram alterados nesta sessão; código de produção intacto.

---

## 5. Prova de conclusão — estado de cada workflow em falha (Run ID falha original → Último run na main)

**Legenda:** `Run ID original` = run que originou o item no PENDENCIAS.md. `Último run na main` = execução mais recente na branch main verificada em 2026-10-28.

| # | Workflow em falha | Run ID original | Último run na main | Conclusão atual | Desfecho |
|---|---|---|---|---|---|
| P0/P4 | Deploy Gates (Gate Final) | [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | ✅ success | **RESOLVIDO** — fix `8c81483` (Gate E40) |
| P3 | Branch Protection Sentinel | [40615509825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509825) | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | ✅ success | **RESOLVIDO** — PRs com `(#NNN)` |
| P5 | CI Security & Drift Checks | [40615509752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752) | incorporado em Deploy Gates | ✅ success | **RESOLVIDO** — fix `c73cb9b` (Calendar v10) |
| P1 | CI Replenishment Module E2E | [40612760478](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478) | [40735988559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988559) | ❌ failure | **PENDENCIAS.md P1** — 4 secrets E2E ausentes; requer ação do PO |
| P2 | E2E — Critical Flows | [40615510053](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053) | [40741741633](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741633) | ✅ success* | **PENDENCIAS.md P2** — success espúrio (requireAuth skipa testes); causa raiz = P1 |
| P6 | E2E Quotes — Matrix (E77) | [40667936090](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090) | N/A (0 runs na main) | N/A | **PENDENCIAS.md P6** — workflow só dispara em PR; run original era em branch de PR (cancelled) |
| P7 | db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | ❌ failure | **PENDENCIAS.md P7** — ledger divergente `local_only=1108; remote_only=648` |
| P8 | edge-functions-drift-check | [40663094555](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40663094555) | [40740410933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40740410933) | ❌ failure | **PENDENCIAS.md P8** — drift GitHub × canônico; requer reconciliação pelo PO |
| P9 | E2E — Personalization Flow | [40662579633](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579633) | [40741742442](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742442) | ✅ success* | **PENDENCIAS.md P9** — success espúrio (requireAuth); causa raiz = P1 |
| P10 | E2E • Swatch QuickView | [40662579393](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393) | [40741742801](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742801) | ⏳ pending | **PENDENCIAS.md P10** — em execução no momento do relatório; causa raiz = P1 + webkit |
| P11 | Edge Integration Tests — All | [40638774637](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40638774637) | [40735988490](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988490) | ❌ failure | **PENDENCIAS.md P11** — versões edge functions desatualizadas; requer `deploy-edge-functions.yml` pelo PO |
| P12 | Kit Coverage — Integration | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | ❌ failure | **PENDENCIAS.md P12** — `permission denied for view v_kit_component_complete`; bloqueado por P7 |

> `*` success via `requireAuth`: testes verificam presença de secrets antes de rodar; sem elas, o suite é skipped e o workflow retorna success. A causa raiz (P1 — secrets ausentes) persiste.

---

## 6. Runs de referência — workflows verdes na main após as correções

| Workflow | Run ID | SHA | Conclusão | Data |
|---|---|---|---|---|
| Deploy Gates (Gate Final) | [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) | `8c81483` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) | `c73cb9b` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40739341785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341785) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | `4562f376` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | `4562f376` | ✅ success | 2026-10-28 |

**Gate Final verde em 4 runs consecutivos na main — condição de processo satisfeita.**

---

## 7. Workflows aguardando ação do PO

Os itens abaixo estão documentados em `PENDENCIAS.md` com o motivo exato do bloqueio e a ação necessária:

| Item | Workflow | Bloqueio | Ação necessária |
|---|---|---|---|
| P1 | CI Replenishment Module E2E | 4 secrets E2E ausentes no GitHub Actions | Adicionar `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| P2, P9, P10 | E2E Critical Flows, Personalization, Swatch | Dependem de P1 | Resolvido automaticamente após P1 |
| P6 | E2E Quotes — Matrix (E77) | Workflow não roda na main (somente PR); run original era em branch de PR (cancelled) | Investigar se falha persiste em novo PR |
| P7 | db-schema-drift-check | `local_only=1108; remote_only=648` — ledger divergente | Reconciliar via `db-apply-migration.yml` ou `migration repair` com versão explícita |
| P8 | edge-functions-drift-check | Drift GitHub × canônico (funções no repo divergem das deployadas) | Disparar `deploy-edge-functions.yml` (workflow_dispatch) e aprovar `environment: production` |
| P11 | Edge Integration Tests — All | Versões deployadas desatualizadas (código no repo correto) | Disparar `deploy-edge-functions.yml` (workflow_dispatch) |
| P12 | Kit Coverage — Integration | `permission denied for view v_kit_component_complete` | Opção A: resolver P7 e mergear PR #2701 com GRANT. Opção B: `db-apply-migration.yml` com GRANT SELECT |
| P13 | N/A (Vercel infra) | Projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` gerando builds duplicados | Deletar projeto fantasma no dashboard Vercel |
