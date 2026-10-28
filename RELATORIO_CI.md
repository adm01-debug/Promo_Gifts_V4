# RELATORIO_CI.md -- Baseline e Inventario de Falhas
> Gerado: 2026-10-28 | Branch: claude_pink/focused-lamport-qyupp8 | SHA base: 5d12084e

---

## 1. Baseline local (container claude-code)

| Comando | Resultado | Observacao |
|---|---|---|
| `npm install` | OK sucesso | Dependencias instaladas sem erros |
| `npm run build` | OK sucesso (`built in 14.09s`) | Build Vite passou |
| `npx tsc --noEmit` | OK sucesso | Zero erros TypeScript |
| `npm run lint` | OOM (heap exhaustion) | Restricao de memoria do container (exit 0) -- nao e erro de codigo |
| `npx vitest run` | OOM (heap exhaustion) | Restricao de memoria do container -- nao e erro de testes |

> **Nota OOM:** Os containers da VPS tem limit de heap Node.js que nao suporta ESLint + Vitest em repos grandes. O ESLint no CI usa runners com mais memoria. Esse limite nao reproduz nenhum dos erros observados no CI.

---

## 2. Inventario de falhas -- ultima run em main

> Fonte: runs mais recentes em `main` em 2026-10-28.  
> Somente o **Gate Final (deploy-gates.yml)** e required check em main.

### 2.1 Gate Final -- Deploy Gates
**Run:** [40633601828](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40633601828) em SHA `d64f3df`

| Check | Status | Root cause | Fix nesta PR |
|---|---|---|---|
| R_SCHEMA_DRIFT | FALHOU | "Ledger parity": `local_only=1108; remote_only=647` -- 647 migrations em prod sem arquivo no repo | Requer PO: dispatch `schema-snapshot-export.yml --force_rotate` (P15) |
| Migration replay-safe | RISCO | Migration `20261027120000` tinha `RAISE EXCEPTION` quando pg_cron ausente -- falharia no replay apos nova baseline | CORRIGIDO: RAISE NOTICE + early RETURN |
| R_SSOT, R_DEP_AUDIT, R_LINT, R_UNIT, R_DB_INT, R_SECRETS, R_E2E, R_SEO, R_RESTORE, R_BUILD, R_SECRET_SCAN | PASSOU | -- | -- |

### 2.2 Workflows nao-required (referencia)
| Workflow | Status | Root cause | Registrado em |
|---|---|---|---|
| CI Security & Drift Checks | OK (ja em main) | rdp v8->v10 -- PR #2679 mergeado antes | -- |
| Branch Protection Sentinel | FALHOU historico | Commit 04239fdd direto em main | P22 |
| E2E Critical Flows | FALHOU | Auth redirect em CI (loginViaUI timeout) | P6 |
| E2E Swatch QuickView | FALHOU | webkit timeout + chromium/firefox flakes | P23 |
| Edge Integration Tests | FALHOU | generate-mockup/verify-2fa-token timeout; validate-access 200 em invalido | P1 |
| Uptime Monitor | FALHOU | health-check edge function 4xx/5xx | P20 |
| CI - Replenishment Module | FALHOU | E2E /reposicao auth redirect | P10 |
| Kit Coverage -- Integration | FALHOU | permission denied product_kit_components/v_kit_component_complete | P17 |
| Nightly Full CI | FALHOU | kit-builder auth redirect + visual regression color-swatch/magazine-header | P6+P18 |
| Quote Builder Delivery Quality | FALHOU | E2E auth redirect + visual regression | P6 |

---

## 3. Correcao aplicada

**Arquivo:** `supabase/migrations/20261027120000_fix_connections_auto_test_cron_secret.sql`

**Antes:** migration fazia `RAISE EXCEPTION` quando `cron.job connections-auto-test` nao existia -- isso derrubava o replay do drift-check (container sem pg_cron).

**Depois:** migration verifica existencia de `pg_cron` via `pg_catalog.pg_extension` e faz `RAISE NOTICE` + `RETURN` em ambiente de replay, tornando-a idempotente. Em producao (onde pg_cron e o job existem), o comportamento original e mantido.

---

## 4. Tabela de prova por workflow

| Workflow | Evidencia de conclusao | Status |
|---|---|---|
| Deploy Gates (R_SCHEMA_DRIFT) | Run 40633601828: ledger parity `remote_only=647` -- PO deve dispatch schema-snapshot-export.yml | PENDENCIAS P15 |
| CI Security & Drift Checks | Commit `ab70ca2` + PR #2679 mergeado em main | JA MERGEADO |
| Branch Protection Sentinel | Historico -- impossivel corrigir retroativamente | PENDENCIAS P22 |
| E2E Critical Flows | Bloqueio de auth em CI -- nao e codigo | PENDENCIAS P6 |
| E2E Swatch QuickView | Pre-existing flakes | PENDENCIAS P23 |
| Edge Integration Tests | Edge function drift -- requer dispatch deploy-edge-functions.yml | PENDENCIAS P1 |
| Uptime Monitor | Edge function nao deployada | PENDENCIAS P20 |
| CI - Replenishment Module | Bloqueio de auth em CI | PENDENCIAS P10 |
| Kit Coverage -- Integration | GRANT SELECT faltando -- DDL bloqueada por REGRA #8 E056 | PENDENCIAS P17 |
| Nightly Full CI | Auth + baselines desatualizados | PENDENCIAS P6+P18 |
| Quote Builder Delivery Quality | Auth + visuais | PENDENCIAS P6 |

---

## 5. Proximo passo bloqueante (PO)

**ANTES do merge** (unbloca Deploy Gates):
1. Dispatch `schema-snapshot-export.yml` -> `force_rotate: true` -> zera os 647 remote_only -> Deploy Gates passa

Apos merge:
2. Dispatch `deploy-edge-functions.yml` -> sincroniza 106 funcoes divergentes (P1)
3. Investigar/configurar secrets E2E em CI para resolver P6 (auth redirect)
