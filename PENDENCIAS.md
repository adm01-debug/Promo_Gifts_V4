# PENDÊNCIAS — Correção de Workflows CI

**Atualizado:** 2026-10-22T18:40 UTC  
**Branch ativa:** `claude/laughing-cori-o9w35e` → PR [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338)  
**HEAD atual:** `b83a5487` (docs: run stuck push)  
**Gate Final b83a5487:** run [39827039880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39827039880) — ⚠️ `queued/runner-capacity` — Gate 0 ✅, Gate 5.5 ✅ (17:59Z), Gate 1 e outros 10 jobs aguardando runner há 42+ min — problema de infra GitHub Actions  
**Gate Final 580d5187:** run [39826419850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39826419850) — `cancelled` (superado por b83a5487)  
**Gate Final ac0f4e10:** run [39826162164](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39826162164) — `cancelled` (superado por 580d5187)  
**Gate Final c97f4959 (agente inventário):** run [39826030788](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39826030788) — `cancelled` (superado por ac0f4e10)  
**Gate Final e2bf7804:** run [39824526266](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39824526266) — `queued` (superado por c97f4959)  
**Gate Final db65121a (E104):** run [39824243692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39824243692) — `cancelled` (superado por e2bf7804)  
**Gate Final a83e1c0d:** run [39818934114](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39818934114) — `cancelled` (superado por 5499c532)  
**Gate Final precedente (sucesso):** run [39798033549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39798033549) — `141c915a` — ✅ **`conclusion=success`** (15:00Z, 16 jobs)  
**Gate Final b977f790:** run [39815181210](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39815181210) — `cancelled` (superado por f6b11477)  
**Gate 8 — Security (run 39815181224):** ❌ `conclusion=failure` — HTTP 504 transiente — **não bloqueia Gate Final** — ver §2.13

### Commits desta sessão
| Commit | Descrição | Resolve |
|---|---|---|
| `b442d1ed` | fix(security): corrige allowlist lint-0011 com assinaturas completas pgstattuple (OUT params) | Supabase Linter Gate — mismatch assinaturas OUT params |
| `a21f6200` | fix(ci): corrige SIGPIPE (exit 141) no guard do daily-flows-simulation | Daily flows simulation — exit 141 SIGPIPE em `gh api --jq` |
| `f6b1147` | fix(ci): pre-pull com retry para ghcr.io rate limit no drift check | db-schema-drift-check — `toomanyrequests` (44000/min) ao puxar `ghcr.io/supabase/postgres:17.6.1.063` |
| `db65121a` | ci(drift-check): override SUPABASE_INTERNAL_IMAGE_REGISTRY para ECR Public (E104) | db-schema-drift-check — `supabase/setup-cli` action define `SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr.io` via `$GITHUB_ENV`, sobrescrevendo pre-pull ECR. Fix: novo step exporta `SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws` após setup-cli |
| `ac0f4e10` | fix(ci): E104 override ECR em contract-tests + corrige expectativa audit_http_error_exhausted | contract-tests job smoke rate limit (E104) + Codex P2: reason exhausted + extraEnv CHECK_RETRY_DELAY_MS |

### Reruns Attempt 2 (15:12Z) — Conclusões Confirmadas

| Run | Workflow | Att | Conclusão | Horário | Categoria |
|---|---|---|---|---|---|
| 39757063628 | Quote Builder Delivery Quality | 2 | ✅ success | 15:15Z | pré-existente (tooltip flake resolvido) |
| 39757063923 | Supabase Linter Gate | 2 | ❌ failure | 15:14Z | fix no branch aguardando merge PR |
| 39757064140 | CI Security & Drift Checks | 2 | ❌ failure | 15:14Z | fix no branch aguardando merge PR |
| 39757063778 | E2E — Critical Flows & Error Boundaries | 2 | ❌ failure | 15:20Z | pré-existente — Admin Critical Routes + Check min tests |
| 39757064319 | E2E — Personalization Flow | 2 | ❌ failure | 15:21Z | pré-existente — Check min tests (auth setup) |
| 39757063502 | Cart Invariants Smoke | 2 | ❌ failure | 15:23Z | pré-existente — cart mutations paralelas |
| 39757063983 | E2E (Playwright) | 2 | ❌ failure | 15:26Z | pré-existente — header sticky |
| 39757063931 | Deploy Gates (main) | 2 | ❌ failure | 15:30Z | cascata — bloqueadores humanos |
| 39757064344 | E2E • Swatch QuickView | 2 | ❌ failure | 15:38Z | pré-existente — visual/auth flake |
| 39802177763 | Uptime Monitor | 2 | ✅ success | 15:37Z | transiente resolvido |

> Todos os reruns E2E falharam novamente no attempt 2, **confirmando que são falhas pré-existentes na main** não relacionadas ao branch `claude/laughing-cori-o9w35e`.

### Status Gates HEAD `141c915a` (run 39798033549 — ✅ CONCLUÍDO 15:00Z)

| Gate | Job | Status | Observado |
|---|---|---|---|
| Gate 0 — SSOT | job 119891313235 | ✅ success | 14:44Z |
| Detectar mudanças | job 119891313750 | ✅ success | 14:44Z |
| Gate 0.5 — Dependency Audit | job 119891511976 | ✅ success | 14:46Z |
| Gate 0.6 — Dependency Review | job 119891511999 | ✅ success | 14:48Z |
| Gate 2 — Unit Tests | job 119891511988 | ✅ success | 14:47Z |
| Gate 5 — SEO Sanity Check | job 119891511996 | ✅ success | 14:46Z |
| Gate 5.5 — RPC restore_seller_cart | job 119891512025 | ✅ success | 14:49Z |
| Gate 4 — Lighthouse CI | job 119891512052 | ✅ success | 14:49Z |
| Gate 2.5 — PostgreSQL Integrity | job 119891512065 | ✅ success | 14:48Z |
| Gate 1 — Lint + TypeScript (42 sub-gates) | job 119891512076 | ✅ success | 14:54Z |
| Gate E40 — Schema file changes | job 119891512127 | ✅ success | 14:48Z |
| Gate E23 — Secrets E2E | job 119891512162 | ✅ success | 14:47Z |
| Gate E23 — Gitleaks | job 119891512174 | ✅ success | 14:49Z |
| Gate 3 — E2E Smoke | job 119893058790 | ✅ success | 14:53Z |
| Gate 6 — Build | job 119897045825 | ✅ success | 14:55Z |
| Gate E40 — Schema Drift Check | job 119894032658 | ✅ success | 15:00Z |

> Gate 1 — Lint + TypeScript: todos 42 sub-gates passaram (1.1 a 1.18, E89, E95, E113, E118a-j, E119).

**Gate 5 — Supabase Security Audit** (workflow separado `supabase-security-gate.yml`, attempt 2, run 39798033576):
- ✅ **`conclusion=success`** (15:03Z) — attempt 2 concluiu com sucesso
- attempt 1 falhou por HTTP 500 da Supabase API (transiente, não regressão de código)
- `check-security-definer-audit.mjs`: ✅ PASSOU (570 funções auditadas, todas com search_path)

---

## 1. BLOQUEIOS DO CONTAINER CLOUD

### npm install — 403 Forbidden (registry privado Lovable)

- **Erro:** `403 Forbidden - GET https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...`
- **Impacto:** Nenhum comando local que dependa de `node_modules` funciona neste container:
  - `npm run lint` — BLOQUEADO
  - `npm run typecheck` — BLOQUEADO
  - `npx vitest run` — BLOQUEADO
  - `npm run build` — BLOQUEADO
- **Validação:** Feita exclusivamente via CI do GitHub Actions
- **Ação necessária:** Acesso ao registry privado do Lovable requer configuração no ambiente cloud (fora do escopo desta sessão)

---

## 1.1 INVENTÁRIO COMPLETO — Workflows em falha na `main` (2026-10-22T15:40 UTC)

> Inventário original: 16 workflows com última run em `conclusion=failure` (14:07Z). Atualizado com 2 workflows adicionais descobertos nesta sessão (+Kit Coverage +Quote Number Hardening nos reruns).

| # | Workflow | Run ID | SHA | Categoria | Status (2026-10-22T15:40Z) |
|---|---|---|---|---|---|
| 1 | **CI Security & Drift Checks** | 39757064140 | 8e8053b9 | Fix branch | ✅ Fix via `b442d1ed` (allowlist lint-0011 OUT params) + `679b5f45` (vitest allowlist) — aguardando merge PR |
| 2 | **Cart Invariants Smoke** | 39757063502 | 8e8053b9 | Pré-existente E2E | ❌ Att 2 failure confirmada (15:23Z) — cart mutations paralelas pré-existente §2.6.1 |
| 3 | **Daily flows simulation** | 39735125888 | c7c25848 | ✅ Fix branch + rerun | ✅ Fix SIGPIPE `a21f6200` + rerun attempt 2 → `conclusion=success` (15:25Z) observado via API |
| 4 | **Deploy Gates** | 39757063931 | 8e8053b9 | Agregado | ⚠️ Falha cascata — itens abaixo |
| 5 | **E2E (Playwright)** | 39757063983 | 8e8053b9 | Pré-existente E2E | ❌ Att 2 failure confirmada (15:26Z) — header sticky pré-existente §2.6 |
| 6 | **E2E — Critical Flows & Error Boundaries** | 39757063778 | 8e8053b9 | Pré-existente E2E | ❌ Att 2 failure confirmada (15:20Z) — Admin Critical Routes + Check min tests pré-existente §2.6.2 |
| 7 | **E2E — Personalization Flow** | 39757064319 | 8e8053b9 | Pré-existente E2E | ❌ Att 2 failure confirmada (15:21Z) — Check min tests (auth setup) pré-existente §2.6.3 |
| 8 | **E2E • Swatch QuickView** | 39757064344 | 8e8053b9 | Pré-existente E2E | ❌ Att 2 failure confirmada (15:38Z) — visual/auth pré-existente §2.6.4 |
| 9 | **Gitleaks — Full History Audit** | [39757063805](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063805) | 8e8053b9 | **RESOLVIDO na main** | ✅ `conclusion=success` em 8e8053b9 — falha anterior era em c7c25848 |
| 10 | **Quote Builder Delivery Quality** | 39757063628 | 8e8053b9 | Pré-existente E2E | ✅ `conclusion=success` — attempt 2 rerun confirmado |
| 11 | **Quote Number Hardening — Verify** | [39735347516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39735347516) | c7c25848 | ✅ RESOLVIDO (rerun) | ✅ Rerun attempt 2 → `conclusion=success` (15:25Z) observado via API |
| 12 | **Release Please** | 39757063511 | 8e8053b9 | Ação humana | ❌ Requer `contents:write` — ver §2.3 |
| 13 | **Supabase Linter Gate** | 39757063923 | 8e8053b9 | Fix branch | ✅ Fix `b442d1ed` (assinaturas OUT params corretas); run [39786612132](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39786612132) `conclusion=success` (PR branch) |
| 14 | **Uptime Monitor** | [39802177763](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39802177763) | 8e8053b9 | ✅ RESOLVIDO (transiente) | ✅ `conclusion=success` em 15:37Z — attempt 2 rerun confirmado — §2.1 |
| 15 | **db-schema-drift-check** | 39757238848 | 8e8053b9 | Fix branch | ✅ Fix E104 commit `db65121a` (ECR Public override) — aguardando Gate Final e2bf7804 |
| 16 | **edge-functions-drift-check** | 39755009146 | c7c25848 | Ação humana | ❌ Edge fn drift — ver §2.11 |
| 17 | **Kit Coverage — Integration** | [39719136176](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39719136176) | c7c25848 | ❌ Bloqueador humano | ❌ `permission denied for view v_kit_component_complete` + `permission denied for table product_kit_components` — ver §2.12 |
| 18 | **Nightly Full CI** | [39713855139](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39713855139) | c7c25848 | Pré-existente E2E | ❌ Playwright E2E (2) cancelled + E2E Visual Focused magazine-header falhou — ver §2.14 |
| 19 | **Python Package using Conda** | [39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | c7c25848 | Phantom workflow | ❌ `environment.yml` not found — workflow template padrão do GitHub não pertence a este projeto — ver §2.15 |
| 20 | **E2E • Thumb QuickView** | [39670397261](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397261) | c7c25848 | Pré-existente E2E | ❌ Pré-existente visual/interação — ver §2.6 |

---

## 2. FALHAS NA `main` (commit `8e8053b9`) — Status e Ações

### 2.1 Uptime Monitor — ⚠️ INTERMITENTE (health-check 503 = database unhealthy)

- **Run original (09:09Z):** [39776635316](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39776635316) — `conclusion=failure`
- **Recovery (13:40Z):** [39788883010](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39788883010) — `conclusion=success`
- **Nova falha (15:09Z):** [39802177763](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39802177763) — `conclusion=failure`
  - **Attempt 2:** `conclusion=success` em 15:37Z ✅
- **Nova falha (16:10Z):** [39811647198](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39811647198) — `conclusion=failure`
  - **Causa:** Mesmo padrão — probe transiente de infra do banco canônico
  - **Padrão confirmado:** 3 falhas em schedule (09:09Z, 15:09Z, 16:10Z); recoveries automáticas em 13:40Z e 15:37Z
- **Status:** ⚠️ INTERMITENTE — falha agendada do schedule, sem ação de código necessária
- **Ação necessária:** Nenhuma — health-check usa timeout 1500ms; falhas são transientes de infra do banco canônico

### 2.2 db-schema-drift-check — Ledger Parity + Docker Rate Limit

- **Run original (falha):** [39757238848](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757238848) — Ledger Parity
- **Causa 1 (resolvida):** SESSION_NOISE_EXACT ignorava `set check_function_bodies = off;` — commit `9c2288c4`
- **Causa 2 (resolvida):** Docker ghcr.io rate limit `toomanyrequests` (44000/min) ao puxar `ghcr.io/supabase/postgres:17.6.1.063` — 3 attempts consecutivos (runs 39810527986 att 1, 2, 3) — **commit `f6b1147` adiciona step pre-pull com 5 tentativas + backoff 30s**
- **Causa 3 (corrigida — commit `db65121a`):** `supabase/setup-cli` action define `SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr.io` via `$GITHUB_ENV` **após** qualquer configuração prévia, fazendo o `supabase db diff` puxar TODAS as imagens de ghcr.io (postgres 17.6.1.063, realtime v2.86.3, etc.) com rate limit. Fix (E104): novo step "Override image registry to ECR Public" exporta `SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws` para `$GITHUB_ENV` imediatamente após setup-cli, garantindo que db diff e pre-pull usem o mesmo registry (ECR Public). Causa raiz confirmada nos logs do att 2 (job 119967665431): pre-pull ECR foi sucesso, mas db diff puxou `ghcr.io/supabase/postgres:17.6.1.063` com `toomanyrequests: allowed: 44000/minute`.
- **Gate Final b977f790:** run [39815181210](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39815181210) — ❌ `conclusion=failure` — causas: `R_SCHEMA_DRIFT=failure` (Gate E40, ledger parity) + `R_RESTORE=cancelled` (Gate 5.5, consequência de E40)
- **Outros gates em b977f790:** R_SSOT, R_DEP_AUDIT, R_DEP_REVIEW, R_LINT, R_UNIT, R_DB_INT, R_SECRETS, R_E2E, R_SEO, R_BUILD, R_SECRET_SCAN — todos ✅ `success`
- **Pendência remanescente (ação humana):** O ledger parity propriamente dito requer identificar qual DDL foi aplicada out-of-band e criar migration espelho via caminho E15/E99
- **Ação necessária:** Dispatch `schema-snapshot-export.yml` com `force_rotate: true` após reconciliar ledger
- **Responsável:** PO + DBA (REGRA #8 corolário)

### 2.3 Release Please — `Resource not accessible by integration`

- **Run:** [39757063511](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063511)
- **Causa:** GitHub App sem permissão `contents:write` configurada para o repo
- **Fix possível:** Não resolvível por code push — requer configuração da permissão no GitHub App do Release Please
- **Ação necessária:** PO deve revisar settings do GitHub App em Settings → GitHub Apps → Release Please → Permissions
- **Responsável:** PO (owner do repo)

### 2.4 Supabase Linter Gate — Management API Timeout (AbortError)

- **Run:** [39757063923](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063923)
- **Causa:** AbortError após 15s na Management API — 3 tentativas esgotadas sem retry
- **Fix nesta sessão:** Retry 3× com backoff (15/20/25s) + `sleepFn` injetável implementados em `scripts/check-supabase-linter.mjs` (commit `9c2288c4`)
- **Status:** Aguardando nova execução para confirmar que o fix resolve

### 2.5 CI Security & Drift Checks — Composto

- **Run:** [39757064140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064140)
- **Causa:** Workflow composto que inclui `db-schema-drift-check` e/ou `Supabase Linter Gate`
- **Status:** Fix do drift-baseline (commit `9c2288c4`) deve resolver; aguardando nova execução após merge

### 2.6 E2E (Playwright) — `22-header-sticky.spec.ts` — Falha Pré-existente

- **Run na main:** [39757063983](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063983) — sha `8e8053b9` — `conclusion=failure`
- **Job:** `e2e-gates`
- **Step que falhou:** `🛑 Fail-fast se header sticky falhou`
- **Erro exato (log):** `"O Header global deixou de ser sticky em alguma rota/viewport. Spec: e2e/flows/22-header-sticky.spec.ts. Causa raiz típica: 'overflow' / 'transform' / 'filter' em ancestral do <header> em src/components/layout/MainLayout.tsx criando scroll container ou stacking context indevido."`
- **Testes que falharam:**
  - `22-header-sticky.spec.ts:148:7` — `/admin/auditoria-propriedade`, `/admin/rbac-rotas`, `/status`
  - `22-header-sticky.spec.ts:186:3` — header sticky pós-login
  - `22-header-sticky.spec.ts:206:3` — header sticky entre módulos protegidos
- **Resultado:** 170 testes saltados (skip), 1 passou
- **Pré-existência:** Confirmado na main `8e8053b9` — nenhum commit desta branch toca `MainLayout.tsx`
- **Bloqueio para correção:** npm install bloqueado (403 Forbidden — registry privado Lovable) — impossível rodar suite local; correção requer acesso ao ambiente de desenvolvimento completo
- **Fix desta sessão:** `mkdir -p playwright-report &&` antes do `touch` em `e2e-gates` (commit `c58e3a56`) — resolve false-negative de infra no gate, não a regressão de sticky
- **Ação necessária:** PO + dev identificar qual propriedade CSS em `src/components/layout/MainLayout.tsx` cria container de scroll ou stacking context que quebra `position: sticky` do header

### 2.6.1 Cart Invariants Smoke — Falha Pré-existente

- **Run na main:** [39757063502](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063502) — sha `8e8053b9` — `conclusion=failure`
- **Jobs que falharam:** `cart-invariants (chromium-authed · shard 1/2)`, `shard 2/2`, `(firefox-authed · shard 1/2)`, `shard 2/2`
- **Step que falhou em todos os jobs:** `Playwright — invariants do header/sidebar`
- **9 testes falharam (chromium shard 1) — especificações exatas:**
  - `e2e/carrinhos/active-cart-edge-cases.spec.ts:51` — trocas rápidas em sequência convergem para o carrinho final
  - `e2e/carrinhos/active-cart-edge-cases.spec.ts:72` — carrinho vazio zera Qtd/subtotal
  - `e2e/carrinhos/active-cart-edge-cases.spec.ts:105` — formatação pt-BR de moeda no header
  - `e2e/carrinhos/active-cart-intermittent-failure.spec.ts:62` — timeout/5xx transitório + refresh
  - `e2e/carrinhos/active-cart-mutations-parallel.spec.ts:79` (desktop + mobile) — DELETE/PATCH tardios não vazam
  - `e2e/carrinhos/active-cart-network-failure.spec.ts:52` — offline no meio do reload
  - `e2e/carrinhos/active-cart-parallel-actions.spec.ts:55` — trocas rápidas com fetch/mutação paralelos
  - `e2e/carrinhos/active-cart-parallel-actions.spec.ts:119` — trocas repetidas com refresh intermediário
- **Aviso:** Shard chromium #1 durou 558s > 480s (timeout warning)
- **Pré-existência:** Confirmado na main `8e8053b9` — nenhum commit desta branch toca carrinho ativo
- **Ação necessária:** PO + dev de features corrigir isolamento de estado de cart ativo sob mutações paralelas

### 2.6.2 E2E Critical Flows & Error Boundaries — Falha Pré-existente

- **Run na main (att 1):** [39757063778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778) — sha `8e8053b9` — `conclusion=failure`
- **Run na main (att 2):** [39757063778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778) att 2 — `conclusion=failure` (15:20Z) — **CONFIRMA PRÉ-EXISTÊNCIA**
- **Jobs que falharam (att 2):**
  - `E2E — Error Boundaries (sem auth)` (job 119907013865) → step `Check min tests executed` (15:14Z) — falhou após `Run Error Boundaries E2E` completar (sucess mas poucos testes)
  - `E2E — Full User Flows (authed)` (job 119907012863) → step `Run Admin Critical Routes E2E` (15:19Z failure) + `Check min tests executed`
  - `E2E — Mobile Critical Routes` (job 119907083547) → ✅ success (09:47Z — att 1, não rerode)
- **Causa:** Admin Critical Routes falha por autenticação ou permissão RBAC; "Check min tests executed" falha consequente quando poucos testes executam
- **Pré-existência:** ✅ Confirmado att 2 — nenhum commit desta branch toca autenticação, Admin Routes ou sidebar
- **Ação necessária:** PO + dev de features investigar setup de autenticação E2E para Admin Critical Routes e Sidebar Tooltips

### 2.6.3 E2E Personalization Flow — Falha Pré-existente

- **Run na main:** [39757064319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064319) — sha `8e8053b9` — `conclusion=failure`
- **Job que falhou:** `E2E — Personalization Journey`
- **Step que falhou:** `Check min tests executed`
- **Causa:** Artefato muito pequeno (206KB) — testes não executaram em quantidade suficiente; app pode não ter iniciado a tempo ou autenticação falhou no setup
- **Pré-existência:** Confirmado na main `8e8053b9` — nenhum commit desta branch toca fluxo de personalização
- **Ação necessária:** PO + dev de features investigar setup de autenticação E2E para fluxo de personalização

### 2.6.4 E2E Swatch QuickView — Falha Pré-existente

- **Run na main:** [39757064344](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064344) — sha `8e8053b9` — `conclusion=failure`
- **Jobs e steps que falharam:**
  - `webkit • swatch→QV` → step `Run swatch→QuickView suite` + `Check min tests executed` — failure
  - `chromium • swatch→QV` → step `Run swatch→QuickView suite` + `Check min tests executed` — failure
  - `firefox • swatch→QV` → step `Run swatch→QuickView suite` — cancelled (duração >60min, timeout runner); `Check min tests executed` — failure
- **Causa:** Suite swatch→QuickView falha em webkit e chromium; firefox excede timeout de 60 minutos
- **Pré-existência:** Confirmado na main `8e8053b9` — nenhum commit desta branch toca componente de swatch ou QuickView
- **Ação necessária:** PO + dev de features investigar componente swatch/QuickView para webkit/chromium e timeout do firefox

### 2.8 E2E PDF Exportado — quote_number (pré-existente)

- **Run:** [39780983106](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39780983106), job 119832065424
- **Check:** `E2E PDF exportado · quote_number`
- **Commit afetado:** `55adfac3` (mudou apenas `PENDENCIAS.md` — zero código)
- **Testes que falharam:**
  1. `view NÃO quebra grid layout` — chromium-authed
  2. `é comercial e sem frase legada` — chromium-authed
  3. `r e não contém frase legada` (2 variantes) — chromium-authed
- **Conclusão:** Pré-existente — commit não tocou código; falha não causada por esta branch
- **Ação necessária:** Investigar regressão no componente de PDF/quote number; provável flake de autenticação ou regressão do Lovable
- **Responsável:** PO + dev de features

### 2.7 Quote Builder Delivery Quality — E2E Tooltip Pré-existente

- **Run:** [39757063628](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063628)
- **Job que falhou:** `quality-gate` → step `🌍 E2E & Visual Regression`
- **Causa confirmada:**
  1. `[chromium-authed] › e2e/quote-builder-delivery.spec.ts:14:3 › should show and hide delivery tooltip on hover` — FAIL
  2. `[chromium-authed] › e2e/quote-builder-delivery.spec.ts:86:3 › should verify warning guidance via delivery tooltip` — FAIL (com retry)
- **Status:** Pré-existente na `main` (commit `8e8053b9`) — não causado por nenhuma mudança desta branch
- **Ação necessária:** Investigar regressão de UI no componente de tooltip de entrega no QuoteBuilderPage; pode ser flake de autenticação ou regressão real de componente introduzida pelo Lovable
- **Responsável:** PO + dev de features

---

## 2.9 Daily Flows Simulation — SIGPIPE (exit 141) — ✅ RESOLVIDO

- **Causa raiz:** Step "Git diff guard (schedule only)" — o comando `gh api "..." --jq '...'` em subshell `$()` com bash `set -eo pipefail` implícito causava exit 141 (SIGPIPE) quando o jq fechava o pipe antes do gh terminar de enviar saída. `|| true` na linha não bastava porque o sinal vinha de dentro do subprocesso gh, não do comando externo.
- **Fix desta sessão (commit `a21f6200`):** `set +o pipefail` adicionado no início do step, **antes** do comando `gh api`. Isso desabilita o `pipefail` apenas para este step, neutralizando o exit 141.
- **Arquivo:** `.github/workflows/daily-flows-simulation.yml` (step "Git diff guard (schedule only)")
- **Confirmação:** Rerun attempt 2 (run 39735125888) → `conclusion=success` (15:25Z) — **observado via API** ✅
- **Nota:** O fix está apenas na branch `claude/laughing-cori-o9w35e`. A main (`c7c25848`) só será corrigida após merge do PR #2338.

## 2.12 Kit Coverage — Integration — ❌ BLOQUEADOR HUMANO (GRANT no banco)

- **Run:** [39719136176](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39719136176) — sha `c7c25848` — attempt 2 → `conclusion=failure`
- **Causa raiz confirmada** (logs attempt 2, 15:25Z): **`permission denied for view v_kit_component_complete`** e **`permission denied for table product_kit_components`**
  - 3/3 testes falham: "view e base retornam linhas para o mesmo kit", "view NÃO regride em nenhum campo crítico vs base", "cobertura média da view ≥ 70%"
  - Não é timeout de conexão — é erro de permissão de banco de dados persistente
- **Não resolvível por código:** Requer `GRANT SELECT ON v_kit_component_complete, product_kit_components TO <role_dos_testes>` no banco canônico `doufsxqlfjyuvxuezpln`. DDL via `execute_sql` é PROIBIDO em sessão de agente (REGRA E056).
- **Ação necessária:** PO/DBA conceder SELECT ao role utilizado nos testes de integração nas tabelas/views: `v_kit_component_complete` (view) e `product_kit_components` (tabela), via migration espelho + caminho E15 (workflow `db-apply-migration.yml`)
- **Responsável:** PO + DBA

---

## 2.13 Security & Credential Audit — ❌ TRANSIENTE (HTTP 504 — não bloqueia Gate Final)

- **Run:** [39815181224](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39815181224) — workflow `Quality Gates Summary` — sha `b977f790` — `conclusion=failure`
- **Este workflow é SEPARADO do Gate Final** — não é required check em `main`; não bloqueia merge nem deploy.
- **Causa:** `check:security-definer-acl --require-live` retornou HTTP 504 após 3 tentativas (~2min cada):
  - `⚠️ [security-definer-acl] inconclusive: HTTP 504 (tentativa 1/3)` — exit code 2
  - `⚠️ [security-definer-acl] inconclusive: HTTP 504 (tentativa 2/3)` — exit code 2
  - `⚠️ [security-definer-acl] inconclusive: HTTP 504 (tentativa 3/3)` — exit code 2
- **Steps que passaram no mesmo job:** `audit:credentials` ✅, `check:edge-cors` ✅
- **Diagnóstico:** HTTP 504 = Supabase Management API temporariamente indisponível no momento do run (~17:10Z). Falha transiente, não regressão de código.
- **Ação:** Nenhuma ação de código necessária. O workflow re-rodará automaticamente no próximo cron ou pode ser re-despachado após o Supabase recuperar. **Não documenta bloqueio real** — o último run verde deste workflow foi anterior e válido.
- **Responsável:** Nenhum — falha de infraestrutura transiente

---

## 2.10 Gitleaks — Full History Audit — ✅ RESOLVIDO na main

- **Run original (falha):** [39737833719](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39737833719) — sha `c7c25848`
- **Run atual (success):** [39757063805](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063805) — `conclusion=success`, sha `8e8053b9`
- **Causa original:** Gitleaks encontrou segredos no histórico do git (SHA `c7c25848`)
- **Status:** ✅ Resolvido na main — issue [#2261](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2261) provavelmente tratada pelo PO antes do commit `8e8053b9`
- **Nota:** O run atual na main (8e8053b9) passou com success. Se a issue ainda estiver aberta, verificar se a scan full-history continua passando nos próximos runs agendados.

---

## 2.11 edge-functions-drift-check — Edge Function Drift

- **Run:** [39755009146](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39755009146)
- **Causa:** "Drift detectado entre GitHub e canônico" — edge function(s) deployadas diretamente no Supabase (via MCP ou dashboard) sem commit no repo
- **Evidência:** Step "Fail if drift detected" falhou; artefato `drift-report.csv` contém funções afetadas
- **Fix possível:** Depende do tipo de drift no `drift-report.csv`:
  - **Função ausente no Supabase (in git, missing live):** dispatch de `deploy-edge-functions.yml` — publica a versão do repo.
  - **Content drift (in Supabase differs from git):** **NÃO fazer deploy antes de reconciliar** — deploiar sobrescreveria a versão canônica live. Baixar a versão live do Supabase e commitar no repo primeiro; só então dispatch deploy.
  - **Orphan (live, not in git):** decidir se deve ser incorporado ao repo ou removido do Supabase; nunca deploiar de git sem verificar.
- **Ação necessária:** PO/DBA inspecionar artefato `drift-report.csv`, identificar o tipo de cada drift e aplicar a remediação específica acima
- **Responsável:** PO + DBA

---

## 3. FALHAS NA BRANCH `claude/laughing-cori-o9w35e` (commit `c58e3a56`) — Status

### 3.0 Qodo Finding High — Auth State Vazio em Snapshot Regeneration

- **Arquivo:** `.github/workflows/e2e-update-quote-missing-fields-snapshots.yml` (linhas 89-96)
- **Causa:** O step "Regenerar snapshots" rodava sem validar se `auth.setup.ts` produziu credenciais reais ou estado vazio — capturia páginas não-autenticadas como baseline aprovado
- **Fix commit `0aad32d3`:** Novo step "Verificar auth state antes de regenerar baselines" — falha com erro descritivo se `E2E_USER_EMAIL` ausente ou se `storageState.json` tiver 0 cookies
- **Status:** ✅ Fix commitado — aguardando CI confirmar

### 3.1 Gate 8 — Security & Credential Audit (freight-quality-gates.yml)

- **Run:** [39778554897](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39778554897), job 119827102194
- **Causa:** HTTP 500 transient ao chamar RPC `audit_security_definer_acl` — não causado por este PR
- **Script:** `scripts/check-security-definer-acl.mjs` já tinha retry para 503/504, mas não para 500
- **Fix commit `6d6ed480`:** Adicionado HTTP 500 à lista de status retentáveis
- **Fix commit `5216cfc7` (Codex P2):** HTTP 500 exaurido agora emite INCONCLUSIVE via `concludeCheck` em vez de `process.exit(0)` — evita que erro persistente de SQL/RPC passe silenciosamente pelo gate de segurança
- **Status:** ✅ Fix completo — aguardando CI confirmar

### 3.2 E2E Pré-existentes (sticky-and-scroll, Full User Flows, swatch→QV, undo, view-no-presentation-mode)

- **Causa:** Falhas pré-existentes confirmadas — commits anteriores (`175a75ad`) também os apresentam
- **Status:** Não são regressões desta branch; não bloqueiam o Gate Final

### 3.3 Gate Final (deploy-gates.yml) — Run 39786612440

- **Status:** `queued` em 15:45 UTC → aguardando conclusão
- **Head SHA:** `ac0ba1bf` (commit mais recente)
- **Nota:** Run `39784651433` para `3daebf93` foi **cancelado** (não falhou) — concorrência cancelou ao push de `7fa5c405`. Run `39784863088` para `7fa5c405` e run `39786185972` para `070bd2c7` foram superados por pushes subsequentes. Comportamento esperado do concurrency group.

### 3.4 Edge Integration Tests — All Functions (pré-existente)

- **Run:** [39784863282](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863282)
- **Job:** "Edge Functions · Integration All"
- **Step que falhou:** "Run all edge function integration tests (LIVE)"
- **Causa:** `tests/edge-functions/live/validate-access.test.ts` — "input inválido (número) → sem crash 5xx"
  `AssertionError: número: deveria ser 4xx: expected 200 to be greater than at least 400`
  A edge function `validate-access` retorna HTTP 200 para input inválido (number) em vez de 4xx
- **Pré-existente:** Nenhum commit desta branch toca edge functions — SSOT de edge fn não foi modificado
- **edge-functions-drift-check passou** (run 39784863251 success) — confirma que o deploy está em sincronia com o repo; portanto o bug está no código da função, não no deploy
- **Responsável:** PO + dev de features (bug real na validação de input da edge function `validate-access`)

### 3.5 E2E — Critical Flows & Error Boundaries (pré-existente)

- **Run:** [39784863168](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863168)
- **Job:** "E2E — Full User Flows (authed)"
- **Steps que falharam:** "Run Admin Critical Routes E2E" + "Check min tests executed"
- **Causa:** Falha de autenticação no fluxo Admin Critical Routes — pré-existente confirmada
- **Evidência de pré-existência:** item §2C linha 6 do inventário da main (`8e8053b9`) — `E2E — Critical Flows & Error Boundaries` run [39757063778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778) também falhou; nenhum commit desta branch toca autenticação ou rotas admin
- **Status:** ⚠️ Pré-existente — não é regressão desta branch

---

## 4. PROVA DE CONCLUSÃO FINAL (atualizado 2026-10-22T14:22 UTC)

> **Formato:** workflow | run conclusivo | resultado | evidência ou entrada em PENDENCIAS.md  
> Comparado com inventário inicial de **16 workflows em failure** na main (sha `8e8053b9` e c7c25848).

### 4A. Workflows corrigidos (conclusion=success confirmado)

| Workflow | Run Conclusivo | Resultado | Evidência |
|---|---|---|---|
| **Supabase Linter Gate** | [39786612132](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39786612132) | ✅ `success` | Fix allowlist OUT params (commit `3b14ab93`) — PR branch |
| **Daily Flows Simulation** | [39785415433](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39785415433) | ✅ `success` | Fix SIGPIPE + git log silencioso (commits `3daebf93`+`6e4cf085`) — PR branch |
| **Gate 5 — Supabase Security Audit** | [39784863177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863177) | ✅ `success` | Confirmado em PR branch |
| **CI Security & Drift Checks** | [39790111533](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39790111533) | ✅ `success` | 3/3 gates OK — PR branch HEAD `3b14ab93` |
| **E2E · Carts Undo RPC Atomic** | [39784863169](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863169) | ✅ `success` | Confirmado PR branch |
| **TS Unused Locals Ratchet** | [39784863099](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863099) | ✅ `success` | Confirmado PR branch |
| **Required Checks Guard** | [39784863107](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863107) | ✅ `success` | Confirmado PR branch |
| **Policies Baseline** | [39790110439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39790110439) | ✅ `success` | Confirmado PR branch `3b14ab93` |
| **cart-header-quality-gate** | [39790111270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39790111270) | ✅ `success` | Confirmado PR branch `3b14ab93` |
| **Uptime Monitor** | [39788883010](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39788883010) | ✅ `success` | Resolvido automaticamente na main (8e8053b9) — app voltou ao ar |
| **Gitleaks — Full History Audit** | [39757063805](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063805) | ✅ `success` | Resolvido na main (8e8053b9) — was failing em c7c25848 |
| **Quote Number Hardening — Verify** | [39779794795](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39779794795) | ✅ `success` | Resolvido na main (8e8053b9) — agendado passou |
| **Gate Final — PR branch `89cbf1e2`** | [39791769169](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39791769169) | 🚫 `cancelled` (concorrência) | Cancelado pelo push de `18455381` — comportamento esperado do concurrency group (cancel-in-progress=true); NÃO é failure |
| **Gate Final — PR branch `18455381`** | [39793218590](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39793218590) | 🚫 `cancelled` (concorrência) | Cancelado pelo push de `0f1d53d2` — comportamento esperado do concurrency group; NÃO é failure. NOTA: run 39793218383 é "Freight Quest — Quality Gates" (workflow diferente), erroneamente identificado antes como Gate Final |
| **Gate Final — PR branch `0f1d53d2`** | [39794023027](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39794023027) | 🚫 `cancelled` (concorrência) | Cancelado por este push (docs + RELATORIO_CI) — comportamento esperado de cancel-in-progress=true; NÃO é failure; mesmo padrão de 39791769169 e 39793218590 |
| **Gate Final — PR branch `e9c1b99a`** | [39796246518](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39796246518) | 🚫 `pending` → cancelado (concorrência) | Iniciado por push `e9c1b99a`; cancelado pelo push de `986b37c0` — comportamento esperado de cancel-in-progress=true; NÃO é failure |
| **Gate Final — PR branch `986b37c0` (HEAD)** | [39796843703](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39796843703) | ⏳ `queued` (14:34Z) | Run iniciado por push `986b37c0`; aguardando conclusão OBSERVADA via API; será cancelado por próximo push se houver |

### 4B. Workflows com falhas pré-existentes (não causados por esta branch)

> Todos os motivos abaixo foram verificados via API (logs de jobs/artifacts) em 2026-10-22T14:30Z–14:45Z.

| Workflow | Run (main) | Status | Motivo verificado via API | Entrada em PENDENCIAS.md |
|---|---|---|---|---|
| **E2E (Playwright)** | [39757063983](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063983) | ⚠️ failure pré-existente | `e2e-gates` step `🛑 Fail-fast se header sticky falhou` — `22-header-sticky.spec.ts:148,186,206` — overflow/transform em `MainLayout.tsx` quebra `position: sticky`; 170 testes saltados | §2.6 |
| **E2E — Critical Flows & Error Boundaries** | [39757063778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778) | ⚠️ failure pré-existente | "E2E — Error Boundaries" → `Check min tests executed`; "E2E — Full User Flows" → `Run Sidebar Tooltips E2E` + `Check min tests executed`; artefato 201KB | §2.6.2 |
| **E2E — Personalization Flow** | [39757064319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064319) | ⚠️ failure pré-existente | "E2E — Personalization Journey" → `Check min tests executed`; artefato 206KB | §2.6.3 |
| **E2E • Swatch QuickView** | [39757064344](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757064344) | ⚠️ failure pré-existente | webkit+chromium: `Run swatch→QuickView suite` + `Check min tests executed`; firefox: cancelled (>60min timeout) | §2.6.4 |
| **Cart Invariants Smoke** | [39757063502](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063502) | ⚠️ failure pré-existente | 9 testes falham em `e2e/carrinhos/active-cart-*.spec.ts` — isolamento de estado cart sob mutações paralelas; chromium+firefox shards 1+2; shard 1: 558s > 480s | §2.6.1 |
| **Quote Builder Delivery Quality** | [39757063628](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063628) | ⚠️ failure pré-existente | `e2e/quote-builder-delivery.spec.ts:14,86` — delivery tooltip hover/warning; flake visual/auth | §2.7 |
| **Deploy Gates (main)** | [39757063931](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063931) | ⚠️ failure (cascata) | Agrega E2E acima + Supabase Linter (fix em PR) | §4 |
| **copilot-pull-request-reviewer** | [39790122062](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39790122062) | ❌ failure pré-existente | GitHub App sem `pull_requests:write` — não é required check | Não bloqueante |

### 4C. Workflows bloqueados — ação humana necessária

| Workflow | Run (main) | Status | Entrada em PENDENCIAS.md | Responsável |
|---|---|---|---|---|
| **Release Please** | 39757063511 | ❌ ação humana | §2.3 — GitHub App sem `contents:write` | PO (owner) |
| **db-schema-drift-check** | 39757238848 | ❌ ação humana | §2.2 — DDL ledger parity out-of-band | PO + DBA |
| **edge-functions-drift-check** | 39755009146 | ❌ ação humana | §2.11 — edge function drift | PO + DBA |
