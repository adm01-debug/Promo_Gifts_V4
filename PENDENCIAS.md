# PENDÊNCIAS — Correção de Workflows CI

**Atualizado:** 2026-10-22T15:10 UTC  
**Branch ativa:** `claude/laughing-cori-o9w35e` → PR [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338)  
**HEAD:** `fdabf4a2` (docs(ci): atualiza PENDENCIAS.md — Deploy Gates e Gate 5 conclusion=success)  
**Gate Final HEAD:** [run 39801533636](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39801533636) — Deploy Gates para `fdabf4a2` — 🔄 **queued** (15:05Z) — aguardando conclusão  
**Gate Final anterior:** [run 39798033549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39798033549) — Deploy Gates para `141c915a` — ✅ **`conclusion=success`** (15:00Z) — todos 16 jobs passaram

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

## 1.1 INVENTÁRIO COMPLETO — Workflows em falha na `main` (2026-10-22T14:07 UTC)

> Extraído por query `status=failure&branch=main`. 16 workflows com última run em `conclusion=failure`.

| # | Workflow | Run ID | SHA | Categoria | Status na main (2026-10-22T14:05Z) |
|---|---|---|---|---|---|
| 1 | **CI Security & Drift Checks** | 39757064140 | 8e8053b9 | Fix branch | ✅ Fix via `9c2288c4` — aguardando merge PR |
| 2 | **Cart Invariants Smoke** | 39757063502 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth flake Firefox — documentado §2.6 |
| 3 | **Daily flows simulation** | 39735125888 | c7c25848 | Fix branch | ✅ Fix SIGPIPE via `3daebf93` + fix `6e4cf085`; run [39785415433](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39785415433) `conclusion=success` |
| 4 | **Deploy Gates** | 39757063931 | 8e8053b9 | Agregado | ⚠️ Falha cascata — itens abaixo |
| 5 | **E2E (Playwright)** | 39757063983 | 8e8053b9 | Pré-existente E2E | ⚠️ Múltiplos flakes/regressões — §2.6 |
| 6 | **E2E — Critical Flows & Error Boundaries** | 39757063778 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth/UI flake — §3.5 |
| 7 | **E2E — Personalization Flow** | 39757064319 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth failure pré-existente — §2.6 |
| 8 | **E2E • Swatch QuickView** | 39757064344 | 8e8053b9 | Pré-existente E2E | ⚠️ Visual/auth flake — §2.6 |
| 9 | **Gitleaks — Full History Audit** | [39757063805](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063805) | 8e8053b9 | **RESOLVIDO na main** | ✅ `conclusion=success` em 8e8053b9 — falha anterior era em c7c25848 |
| 10 | **Quote Builder Delivery Quality** | 39757063628 | 8e8053b9 | Pré-existente E2E | ⚠️ Tooltip visual flake — §2.7 |
| 11 | **Quote Number Hardening — Verify** | [39779794795](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39779794795) | 8e8053b9 | **RESOLVIDO na main** | ✅ `conclusion=success` em 8e8053b9 — agendado passou após timeout fix em PR |
| 12 | **Release Please** | 39757063511 | 8e8053b9 | Ação humana | ❌ Requer `contents:write` — ver §2.3 |
| 13 | **Supabase Linter Gate** | 39757063923 | 8e8053b9 | Fix branch | ✅ Fix via `3b14ab93`; run [39786612132](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39786612132) `conclusion=success` (PR branch) |
| 14 | **Uptime Monitor** | [39788883010](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39788883010) | 8e8053b9 | **RESOLVIDO na main** | ✅ `conclusion=success` em 13:40Z — app voltou ao ar |
| 15 | **db-schema-drift-check** | 39757238848 | 8e8053b9 | Ação humana | ❌ Ledger parity — ver §2.2 |
| 16 | **edge-functions-drift-check** | 39755009146 | c7c25848 | Ação humana | ❌ Edge fn drift — ver §2.11 |

---

## 2. FALHAS NA `main` (commit `8e8053b9`) — Status e Ações

### 2.1 Uptime Monitor — ✅ RESOLVIDO (transient — app voltou)

- **Run original (falha):** [39776635316](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39776635316)
- **Run atual (success):** [39788883010](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39788883010) — `conclusion=success` em 13:40Z, sha 8e8053b9
- **Causa original:** 4 falhas consecutivas no health check — app offline/transiente
- **Status:** ✅ Resolvido automaticamente — próxima execução agendada passou com sucesso
- **Ação necessária:** Nenhuma

### 2.2 db-schema-drift-check — Ledger Parity Falhou

- **Run:** [39757238848](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757238848)
- **Causa:** DDL aplicada out-of-band (sem migration no ledger) — `supabase_migrations.schema_migrations` desincronizado com schema real
- **Fix nesta sessão:** `scripts/drift-baseline.mjs` corrigido (commit `9c2288c4`) — SESSION_NOISE_EXACT ignora `set check_function_bodies = off;`; entrada inválida removida do allowlist
- **Pendência remanescente:** O ledger parity propriamente dito requer identificar qual DDL foi aplicada out-of-band e criar migration espelho via caminho E15/E99
- **Ação necessária:** Dispatch de `db-schema-drift-check.yml` após merge do PR; se ainda falhar, `schema-snapshot-export.yml` com `force_rotate: true`
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

- **Run na main:** [39757063778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063778) — sha `8e8053b9` — `conclusion=failure`
- **Jobs que falharam:**
  - `E2E — Error Boundaries (sem auth)` → step `Check min tests executed` — poucos testes executaram (artefato 201KB)
  - `E2E — Full User Flows (authed)` → step `Run Sidebar Tooltips E2E — desktop (chromium-authed)` + `Check min tests executed`
- **Causa:** Artefato pequeno (201KB) indica que app iniciou mas testes não executaram em quantidade suficiente; falha de autenticação ou timeout de setup impede execução do suite completo
- **Pré-existência:** Confirmado na main `8e8053b9` — nenhum commit desta branch toca autenticação ou sidebar
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

## 2.9 Daily Flows Simulation — SIGPIPE (exit 141)

- **Causa:** Step "Git diff guard" linha 47 — `git log ... | head -1` causava SIGPIPE (exit 141) quando `head -1` encerrava o pipe antes do `git log` terminar. Com bash `set -eo pipefail` (implícito), o step falhava com exit code 141.
- **Fix desta sessão:** `| head -1 || true` — o `|| true` neutraliza o exit 141
- **Arquivo:** `.github/workflows/daily-flows-simulation.yml` linha 47
- **Status:** ✅ Fix aplicado — aguardando commit e push

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
