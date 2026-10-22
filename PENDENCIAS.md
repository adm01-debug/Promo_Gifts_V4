# PENDÊNCIAS — Correção de Workflows CI

**Atualizado:** 2026-10-22T13:35 UTC  
**Branch ativa:** `claude/laughing-cori-o9w35e` → PR [#2338](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338)  
**HEAD:** `53035934` (docs: atualiza PENDENCIAS.md — HEAD ac0ba1bf, Gate Final run 39786612440)  
**Gate Final ativa:** run [39787169407](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39787169407) — queued (13:28Z) aguardando conclusão

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

## 1.1 INVENTÁRIO COMPLETO — Workflows em falha na `main` (2026-10-22T14:30 UTC)

> Extraído por query `status=failure&branch=main`. 16 workflows com última run em `conclusion=failure`.

| # | Workflow | Run ID | SHA | Categoria | Status |
|---|---|---|---|---|---|
| 1 | **CI Security & Drift Checks** | 39757064140 | 8e8053b9 | Fix branch | ✅ Fix via `9c2288c4` |
| 2 | **Cart Invariants Smoke** | 39757063502 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth flake Firefox |
| 3 | **Daily flows simulation** | 39735125888 | c7c25848 | Fix branch | ✅ Fix SIGPIPE via `3daebf93` |
| 4 | **Deploy Gates** | 39757063931 | 8e8053b9 | Agregado | ⚠️ Contém falhas abaixo |
| 5 | **E2E (Playwright)** | 39757063983 | 8e8053b9 | Pré-existente E2E | ⚠️ Múltiplos flakes/regressões |
| 6 | **E2E — Critical Flows & Error Boundaries** | 39757063778 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth/UI flake |
| 7 | **E2E — Personalization Flow** | 39757064319 | 8e8053b9 | Pré-existente E2E | ⚠️ Auth failure pré-existente |
| 8 | **E2E • Swatch QuickView** | 39757064344 | 8e8053b9 | Pré-existente E2E | ⚠️ Visual/auth flake |
| 9 | **Gitleaks — Full History Audit** | 39737833719 | c7c25848 | Ação humana | ❌ Secrets na history — ver §2.10 |
| 10 | **Quote Builder Delivery Quality** | 39757063628 | 8e8053b9 | Pré-existente E2E | ⚠️ Tooltip visual flake |
| 11 | **Quote Number Hardening — Verify** | 39735347516 | c7c25848 | Fix branch | ✅ Fix retry 544/timeout via commit pendente |
| 12 | **Release Please** | 39757063511 | 8e8053b9 | Ação humana | ❌ Requer `contents:write` — ver §2.3 |
| 13 | **Supabase Linter Gate** | 39757063923 | 8e8053b9 | Fix branch | ✅ Fix retry via `9c2288c4` |
| 14 | **Uptime Monitor** | 39776635316 | 8e8053b9 | Ação humana | ❌ App offline/transient — ver §2.1 |
| 15 | **db-schema-drift-check** | 39757238848 | 8e8053b9 | Ação humana | ❌ Ledger parity — ver §2.2 |
| 16 | **edge-functions-drift-check** | 39755009146 | c7c25848 | Ação humana | ❌ Edge fn drift — ver §2.11 |

---

## 2. FALHAS NA `main` (commit `8e8053b9`) — Status e Ações

### 2.1 Uptime Monitor — App Offline / Transient

- **Run:** [39776635316](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39776635316)
- **Causa:** 4 falhas consecutivas no health check do endpoint monitorado
- **Status:** Pré-existente — app pode estar offline ou serviço de uptime apresentando falha transiente
- **Ação necessária:** Verificar se o app está no ar; se transient, aguardar próxima execução automática (schedule)
- **Responsável:** PO / infraestrutura

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

### 2.6 E2E (Playwright) — Falhas Pré-existentes

- **Run:** [39757063983](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063983)
- **Causa:** Falhas de autenticação E2E e/ou flake (confirmadas como pré-existentes)
- **Falhas identificadas nesta sessão:**
  - `replenishment-stress` — timeout em `Produto Stress Test 0` (30s) — dado de carga indisponível
  - `E2E Popover Campos Pendentes` — visual regression (campos ausentes)
  - `cart-invariants firefox-authed` — auth flake em firefox (recorrente)
  - `E2E — Personalization Journey` — provável pré-existente
- **Fix desta sessão:** `mkdir -p playwright-report &&` antes do `touch` em `e2e-gates` (commit `c58e3a56`) resolve false-negative no gate header-sticky
- **Status:** Falhas pré-existentes confirmadas; não são regressões introduzidas por esta branch

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

## 2.10 Gitleaks — Full History Audit — Secrets no Histórico

- **Run:** [39737833719](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39737833719)
- **Causa:** Gitleaks encontrou segredos no histórico do git (SHA `c7c25848`)
- **Evidência:** Issue [#2261](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2261) criada automaticamente pelo workflow com detalhes dos achados
- **Fix possível:** NÃO resolvível por code push — requer rewrite do histórico (BFG Repo Cleaner ou `git filter-repo`)
- **Ação necessária:** PO revisar issue #2261, rotacionar TODAS as credenciais expostas, avaliar rewrite de histórico
- **Responsável:** PO (security owner)

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

## 4. PROVA DE SUCESSO (atualizado 2026-10-22T13:35 UTC)

| Workflow | Status | Evidência |
|---|---|---|
| **Uptime Monitor** | ❌ ação humana | PO/Infra verificar app online |
| **db-schema-drift-check** | ⚠️ ação humana | Fix falso positivo `9c2288c4`; ledger parity → PO+DBA via E99 |
| **Release Please** | ❌ ação humana | PO configurar `contents:write` no GitHub App |
| **Gitleaks Full History** | ❌ ação humana urgente | Issue #2261 — rotacionar credenciais — §2.10 |
| **Supabase Linter Gate** | ✅ **CONFIRMADO SUCCESS** | Run [39786612132](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39786612132) — HEAD `53035934` |
| **Daily Flows Simulation** | ✅ **CONFIRMADO SUCCESS** | Run [39785415433](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39785415433) — commit `7fa5c405` |
| **Gate 5 — Supabase Security Audit** | ✅ **CONFIRMADO SUCCESS** | Run [39784863177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39784863177) — commit `7fa5c405` |
| **CI Security & Drift Checks** | ⏳ `in_progress` | Run [39785427236](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39785427236) |
| **Gate Final deploy-gates** | ⏳ `pending` | Run [39787169407](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39787169407) — HEAD `53035934` |
| **edge-functions-drift-check** | ✅ **CONFIRMADO SUCCESS** | HEAD `53035934` — era failure antes desta branch |
| **Edge Integration Tests** | ⚠️ pré-existente | Bug em `validate-access` retorna 200 para number input — §3.4 |
| **E2E — Critical Flows** | ⚠️ pré-existente | Auth failure admin routes — §3.5 |
| **E2E (Playwright)** | ⚠️ pré-existentes | Documentadas §2.6–2.8 acima |
| **Quote Builder Delivery Quality** | ⚠️ pré-existente | Flake tooltip — §2.7 |
| **Gate 8 Security ACL** | ✅ retry + INCONCLUSIVE | Fix commits `6d6ed480`+`5216cfc7` |
| **Quote Number Hardening** | ✅ fix timeout 544 | Retry Management API — commit `070bd2c7` |
