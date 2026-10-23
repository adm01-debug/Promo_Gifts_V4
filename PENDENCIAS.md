# PENDENCIAS.md — Workflows com bloqueio externo

> Gerado em: 2026-10-23  
> Atualizado em: 2026-10-23 (sessão continuada — inventário refeito com baseline `4c482cbc`)  
> Sessão: https://claude.ai/code/session_019gUZ8wvjsJMC3gYzy6k7jB  
> Branch de trabalho: `claude/magical-cannon-u5t1vy` → PR #2378

Itens abaixo **não foram corrigidos nesta sessão** por dependerem de secret, permissão
ou dado externo que não está disponível via MCP. Cada item documenta o workflow, o erro
exato e o que o PO precisa fazer para desbloquear.

---

## Inventário completo — run de baseline (main, commit `4c482cbc3a90509180cd575c7e26d25d3ed02aeb`)

| # | Workflow | Run ID | Causa | Status |
|---|---|---|---|---|
| 1 | Deploy Gates | 39999446914 | — | ✅ GREEN |
| 2 | CI Security & Drift Checks | 39999446430 | Timeout em `MockupProductSelector.test.tsx` | 🔄 Fix 7 no PR #2378 (aguarda merge) |
| 3 | CI - Replenishment Module Quality Gate | 39999446605 | `useReplenishmentStats` it() sem timeout → race com waitFor 15s | 🔄 Fix 8 no PR #2378 (aguarda merge) |
| 4 | E2E — Critical Flows & Error Boundaries | 39999446606 | sidebar-tooltips: tooltip visível após mouse out (hoverable content) | 🔄 Fix 4 no PR #2378 (aguarda merge) |
| 5 | E2E — Personalization Flow | 39999446757 | Secrets `E2E_USER_*` ausentes / usuário inativo | ❌ P-02 (externo) |
| 6 | Release Please | 39999446560 | PAT com `contents: write` ausente | ❌ P-01 (externo) |
| 7 | E2E • Swatch QuickView | 39999446623 | in_progress (infra, attempt 3+ em andamento) | ⏳ P-08 (infra) |
| 8 | Branch Protection Sentinel | 39999446486 | Commit `7401c9f` push direto na main sem padrão aceito | ❌ P-11 (pré-existente) |
| 9 | E2E · Atualizar snapshots visuais (E155) | 39999649279 | `chromium-authed`: `E2E_USER_*` ausentes (mesmo P-02) | ❌ P-03 (externo) |
| 10 | Update Quote Visual Snapshots | 39997674586 | `chromium-authed`: `E2E_USER_*` ausentes (mesmo P-02) | ❌ P-12 (externo) |
| 11 | Uptime Monitor | 40001131817 | Downtime do site na janela de check (recorrente) | ❌ P-10 (infra) |
| 12 | E2E (Playwright) | 39999446765 | cancelled (runner, infra) | ℹ️ cancelled |
| 13 | E2E · Cart Delete Popover | 39999446624 | cancelled (runner, infra) | ❌ P-09 (externo/infra) |
| 14 | Cart Invariants Smoke | 39999446524 | queued (aguardando runner) | ⏳ queued |

**Fixes entregues no PR #2378** (app code + testes — aguarda aprovação do PO para merge):
- Fix 1 (PopoverQtyInput)
- Fix 3 (NoveltiesPage overflow)
- Fix 4 (App.tsx TooltipProvider)
- Fix 5 (QuoteItemEditorSheet TooltipProvider)
- Fix 7 (MockupProductSelector.test.tsx resize dispatch)
- Fix 8 (useReplenishments.integration.test.ts timeout)

**Fix entregue no PR #2381** (YAML-only — seguro para merge imediato via admin bypass):
- Fix 2 (HUSKY=0 no workflow `e2e-update-dialog-snapshots.yml`)

---

## P-01 — Release Please

**Workflow:** `.github/workflows/release-please.yml`  
**Erro:**
```
Error: Resource not accessible by integration
HttpError: Resource not accessible by integration
```
**Causa:** O `GITHUB_TOKEN` padrão não tem `contents: write` nos repos com branch protection
configurado. O Release Please precisa criar branches, commits e abrir PRs de release.

**O que você precisa fazer:**
1. Criar um PAT com escopo `repo` (ou `contents: write + pull_requests: write`)
2. Ir em **Settings → Secrets and variables → Actions → New repository secret**
3. Criar o secret chamado `RELEASE_PLEASE_TOKEN` (ou o nome usado no workflow)

**Impacto:** Bloqueia criação automática de release notes/tags. Não bloqueia deploy.

---

## P-02 — E2E — Personalization Flow

**Workflow:** `.github/workflows/e2e-personalization.yml`  
**Erro:** Falha de autenticação — secrets `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` ausentes ou usuário inativo.

**Causa provável (3 hipóteses):**
1. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` não cadastrados
2. Usuário de teste não existe no Supabase `doufsxqlfjyuvxuezpln` ou senha expirou
3. Dados de produto/personalização removidos do banco — seed E2E não rodou

**O que você precisa fazer:**
1. Verificar secrets: **Settings → Secrets → Actions** — procurar `E2E_USER_*`
2. Se não existirem: criar usuário de teste no Supabase auth e cadastrar os secrets
3. Se existirem: confirmar que o usuário está ativo no Supabase Dashboard

**Impacto:** Bloqueia validação do fluxo de personalização de produtos no CI.

---

## P-03 — E2E Quote Item Editor Sheet — Snapshots visuais desatualizados + auth blocker

**Workflow:** `.github/workflows/e2e-quote-item-editor-sheet.yml`  
**Erro original:** Snapshots visuais do header/body do Sheet desatualizados.

**Causa raiz (confirmada 2026-10-23):**  
O `workflow_dispatch` do E155 (run 39999649279) foi executado, mas o step "Regenerar snapshots" **falhou** — o spec `quote-item-editor-sheet-header.spec.ts` usa o projeto `chromium-authed` que exige `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`. **Mesma raiz de P-02 e P-12.**

**O que você precisa fazer:**
1. Resolver P-02 primeiro (cadastrar `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`)
2. Re-rodar o dispatch do workflow `E2E · Atualizar snapshots visuais` com spec `e2e/quotes/quote-item-editor-sheet-header.spec.ts`

---

## P-04 — E2E Quote Item Editor Sheet — ESC não abre dialog de confirmação

**Status: FIX APLICADO** — `src/components/quotes/QuoteItemEditorSheet.tsx:89`  
Adicionado `disableHoverableContent` ao `TooltipProvider` local do Sheet (PR #2378).

---

## P-05 — db-schema-drift-check / Gate E40 — ✅ RESOLVIDO

**Status: RESOLVIDO em 2026-10-23 pelo commit `4c482cbc` (outra sessão).**  
Deploy Gates com `conclusion=success` no run 39999446914 em `main`.

~~Workflow: `.github/workflows/deploy-gates.yml` — job `Gate E40 - Schema Drift Check`~~  
~~Erro: `local_only=1091; remote_only=638`~~

---

## P-06 — Running Copilot Code Review (branch de outro agente)

**Situação:** Workflow de revisão automática rodando em branch `claude/fix-realtime-messages-owner-261023-1600` (outro agente).

**Por que não foi tratado:** REGRA #10 do CLAUDE.md — não interagir com branches de outros agentes.

**Ação recomendada:** Verificar o PR aberto para aquela branch e decidir se deve ser mergeado, fechado ou reaberto.

---

## P-07 — CI Security & Drift Checks — Timeout em MockupProductSelector.test.tsx — 🔄 FIX NO PR #2378

**Workflow:** `ci-security-drift.yml` / `unit-tests` job  
**Run com falha:** `39999446430` (commit `4c482cbc`)

**Causa raiz confirmada (2026-10-23):**  
`@tanstack/react-virtual` v3 chama `getScrollElement()` durante o render síncrono. No primeiro render, `scrollParentRef.current` ainda é `null`. Com `scrollElement = null`, `outerSize = 0` e `calculateRange` retorna `null` → nenhuma `mockup-product-row` é renderizada → `waitFor` aguarda 5000ms e estoura.

**Fix aplicado (Fix 7 no PR #2378):**  
`window.dispatchEvent(new Event('resize'))` após `renderWithProviders` força re-render com ref preenchida.

**Pendência:** Merge do PR #2378 (aguarda aprovação do PO).

---

## P-08 — E2E Swatch QuickView — Runner shutdown (infra)

**Workflow:** `.github/workflows/e2e-swatch-quickview.yml`  
**Erro:** Jobs cancelados por SIGTERM — GitHub Actions runner desligado por infraestrutura.

**Status atual (2026-10-23):**  
- Attempt 3 (`run_attempt: 3`) disparado via `github_rerun_workflow` às ~18:21Z
- Novo run 39999446623 em `in_progress` no commit `4c482cbc`
- Causa é infra (runner shutdown/stuck) — nenhuma correção de código necessária

---

## P-09 — E2E Cart Delete Popover — Dados de teste e runner shutdown

**Workflow:** `.github/workflows/e2e-cart-delete-popover.yml`  
**Erro:** Falha por dados de teste (cart IDs ausentes) + runner shutdown.

**O que você precisa fazer:**
1. Verificar se o seed de dados E2E foi rodado
2. Confirmar que os cart IDs esperados pelo teste existem no banco
3. Re-rodar após seed

---

## P-10 — Uptime Monitor — Downtime da infraestrutura

**Workflow:** `.github/workflows/uptime-monitor.yml`  
**Erro:** Site indisponível durante a janela de monitoramento.

**Causa:** Não é um bug de código. Nenhuma correção necessária.

---

## P-11 — Branch Protection Sentinel — Push direto na main (pré-existente)

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Erro:**
```
1 commit(s) em push para main sem padrão aceito: 7401c9f
```
**Run ID:** 39999446486 (commit `4c482cbc`)

**Causa:** Commit `7401c9f742bfc9af6433bcf47a59e06ef5ea7450` que entrou na `main` antes desta sessão, sem mensagem que corresponda aos padrões aceitos pelo Sentinel. Esta falha é **pré-existente** e retrospectiva.

**Impacto:** Histórico — não impede merges ou deploys atuais.

---

## P-12 — Update Quote Visual Snapshots — Secrets E2E ausentes (mesmo bloqueio do P-02)

**Workflow:** `.github/workflows/e2e-update-quote-snapshots.yml`  
**Run ID:** 39997674586 (commit `b167c9c8`)

**Causa:** Projeto Playwright `chromium-authed` — `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` ausentes ou usuário inativo. Mesma raiz de P-02.

**O que você precisa fazer:**
1. Resolver P-02 (cadastrar secrets)
2. Re-rodar `E2E · Update Quote Visual Snapshots` via `workflow_dispatch` na branch `main`

---

*Próxima atualização: após merge do PR #2378 e resolução dos itens externos.*
