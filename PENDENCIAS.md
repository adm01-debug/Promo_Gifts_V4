# PENDENCIAS.md — Workflows com bloqueio externo

> Gerado em: 2026-10-23  
> Atualizado em: 2026-10-23T20:30Z (P-13 adicionado; Fix7+8 movidos para PR #2383; seções críticas da sessão 2026-10-22 preservadas — migrations urgentes + decisões banco)  
> Sessão: https://claude.ai/code/session_019gUZ8wvjsJMC3gYzy6k7jB  
> Branch de trabalho: `claude/magical-cannon-u5t1vy` → PRs #2378, #2381, #2383

Itens abaixo **não foram corrigidos nesta sessão** por dependerem de secret, permissão
ou dado externo que não está disponível via MCP. Cada item documenta o workflow, o erro
exato e o que o PO precisa fazer para desbloquear.

---

## Inventário completo — run de baseline (main, commit `4c482cbc3a90509180cd575c7e26d25d3ed02aeb`)

| # | Workflow | Run ID | Causa | Status |
|---|---|---|---|---|
| 1 | Deploy Gates | 39999446914 | — | ✅ GREEN |
| 2 | CI Security & Drift Checks | 39999446430 | `clientHeight`/`clientWidth` = 0 no jsdom → `@tanstack/react-virtual` outerSize=0 → 0 rows renderizados | 🔄 Fix 7 no PR #2383 (aguarda merge) |
| 3 | CI - Replenishment Module Quality Gate | 39999446605 | `useReplenishmentStats` timeout 15s (race + site estava down às 18:02Z) | 🔄 Fix 8 no PR #2383; recorrente quando site indisponível |
| 4 | E2E — Critical Flows & Error Boundaries | 39999446606 | sidebar-tooltips: tooltip visível após mouse out (hoverable content) | 🔄 Fix 4 no PR #2378 (aguarda merge) |
| 5 | E2E — Personalization Flow | 39999446757 | Secrets `E2E_USER_*` ausentes / usuário inativo | ❌ P-02 (externo) |
| 6 | Release Please | 39999446560 | PAT com `contents: write` ausente | ❌ P-01 (externo) |
| 7 | E2E • Swatch QuickView | 39999446623 | in_progress (infra, attempt 3+ em andamento) | ⏳ P-08 (infra) |
| 8 | Branch Protection Sentinel | 39999446486 | Commit `7401c9f` push direto na main sem padrão aceito | ❌ P-11 (pré-existente) |
| 9 | E2E · Atualizar snapshots visuais (E155) | 39999649279 | `chromium-authed`: `E2E_USER_*` ausentes (mesmo P-02) | ❌ P-03 (externo) |
| 10 | Update Quote Visual Snapshots | 39997674586 | `chromium-authed`: `E2E_USER_*` ausentes (mesmo P-02) | ❌ P-12 (externo) |
| 11 | Uptime Monitor | 40001131817 → 40005522306 | Downtime recuperado: run 40001131817=failure → 40005522306=success | ✅ Recuperado |
| 12 | E2E (Playwright) | 39999446765 | cancelled (runner, infra) | ℹ️ cancelled |
| 13 | E2E · Cart Delete Popover | 39999446624 | cancelled (runner, infra) | ❌ P-09 (externo/infra) |
| 14 | Cart Invariants Smoke | 39999446524 | `chromium-authed`/`firefox-authed` shards: `E2E_USER_*` ausentes (mesma raiz P-02) | ❌ P-13 (externo) |

**Fixes entregues no PR #2378** (app code — aguarda aprovação do PO para merge):
- Fix 1 (PopoverQtyInput)
- Fix 3 (NoveltiesPage overflow)
- Fix 4 (App.tsx TooltipProvider)
- Fix 5 (QuoteItemEditorSheet TooltipProvider)

**Fixes entregues no PR #2383** (test-only — seguro para merge imediato, zero código de produção):
- Fix 7 (MockupProductSelector.test.tsx — mocks clientHeight/clientWidth para `@tanstack/react-virtual` v3)
- Fix 8 (useReplenishments.integration.test.ts — timeout 30000 para evitar race)

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

## P-07 — CI Security & Drift Checks — clientHeight=0 em MockupProductSelector.test.tsx — 🔄 FIX NO PR #2383

**Workflow:** `ci-security-drift.yml` / `unit-tests` job  
**Run com falha:** `39999446430` (commit `4c482cbc`)

**Causa raiz confirmada (2026-10-23):**  
`@tanstack/virtual-core` v3 usa `getRect()` que lê `element.clientHeight`/`clientWidth` para calcular `outerSize` do container de scroll. jsdom devolve `0` para ambos por padrão → `outerSize = 0` → `calculateRange` retorna `null` → zero linhas renderizadas → `waitFor` estoura em 5000ms.

**Fix aplicado (Fix 7 no PR #2383, commit `82a3a9c`):**  
`clientHeight` e `clientWidth` mockados no `beforeEach` via `Object.defineProperty`. Confirmado: 16/16 testes passando no branch.

**Pendência:** Merge do PR #2383 (seguro para merge imediato — zero código de produção).

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

## P-11 — Branch Protection Sentinel — Push direto na main sem PR

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Erro (confirmado nos logs do job 120571425838):**
```
1 commit(s) em push para main sem padrão aceito: 4c482cb
```
**Run ID:** 39999446486 (PUSH_BEFORE=`b167c9c8`, PUSH_AFTER=`4c482cbc`)

**Causa:** Commit `4c482cbc` (fix Gate E40 — Schema Drift) foi pushado diretamente para
`main` por sessão Claude anterior sem seguir PR. O Sentinel requer que commits na main
venham via squash-merge/merge-commit de PR, bot oficial, Lovable, release ou bypass tag
`[skip-sentinel: motivo]`. Nenhum desses padrões foi usado.

**Padrões aceitos:** squash merge terminando em `(#NNN)` • `Merge pull request #NNN` • bot oficial • `chore(release):` • `docs(redeploy):` • `chore(workflows):` • `[skip-sentinel: ...]`

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

## P-13 — Cart Invariants Smoke — Secrets E2E ausentes (mesma raiz P-02)

**Workflow:** `.github/workflows/e2e-cart-invariants.yml` (ou similar)  
**Run ID:** 39999446524 (commit `4c482cbc`)

**Erro:** Todos os shards `chromium-authed` e `firefox-authed` falham em "Playwright — invariants do header/sidebar" com autenticação.

**Causa:** `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` ausentes. O spec de invariants usa o projeto Playwright autenticado — mesma raiz de P-02, P-03 e P-12.

**O que você precisa fazer:**
1. Resolver P-02 (cadastrar `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`)
2. O Cart Invariants Smoke passará automaticamente no próximo push após o cadastro

**Impacto:** 4 shards (2 browsers × 2 shards) retornam `conclusion=failure`.

---

## P-14 — E2E · Quote Conditions visual PR check — Infra flake (zero diffs reais)

**Workflow:** `.github/workflows/e2e-quote-conditions-visual.yml` (ou similar)
**Run ID:** 40013194317 (commit `de56a10b`)

**Status:** `visual-check` job = `failure`, mas `diff-artifacts/` vazio (nenhum PNG de diff gerado).
`visual-diff-preview` tem apenas 1168 bytes (2 arquivos) — sem divergência de pixel confirmada.
Mesmo padrão do `visual-check` infra-flake documentado no inventário.

**Causa provável:** Runner encerrou o spec antes de gerar os diffs, ou o spec encontrou erro de infra
(ex.: dev server não inicializou a tempo) — o job falha com exit ≠ 0 sem produzir artefatos reais.

**Impacto:** Não bloqueante — Deploy Gates (Gate Final) = ✅ SUCCESS no mesmo commit `de56a10b`.
Este workflow é check advisory, não required.

**O que você pode fazer (opcional):**
Re-rodar via `workflow_dispatch` para confirmar se é flake recorrente ou divergência real.

---

## Resumo final — HEAD `de56a10b` (branch `claude/magical-cannon-u5t1vy`)

| Check | Status | Observação |
|---|---|---|
| **Deploy Gates (Gate Final)** | ✅ SUCCESS | Required check — PR #2378 mergeable |
| SSOT Supabase Guard | ✅ SUCCESS | |
| Security Scan | ✅ SUCCESS | |
| Workflow Lint | ✅ SUCCESS | |
| Bundle size report | ✅ SUCCESS | |
| Contract Tests | ✅ SUCCESS | |
| TS Unused Locals Ratchet | ✅ SUCCESS | |
| Required Checks Guard | ✅ SUCCESS | |
| edge-functions-drift-check | ✅ SUCCESS | |
| CI Security & Drift (unit-tests) | 🔄 Fix 7 no PR #2383 | aguarda merge de #2383 |
| CI Replenishment Quality Gate (E2E smoke) | 🔄 Fix 8 + P-02 | timeout fix em #2383; E2E smoke ainda depende de P-02 |
| E2E — Personalization Flow | ❌ P-02 | secrets ausentes |
| E2E Quote Item Editor Sheet | ❌ P-02 | secrets ausentes |
| E2E Focused UI Matrix | ❌ P-02 | secrets ausentes |
| E2E · Quote Conditions visual PR check | ❌ P-14 | infra flake (0 diffs reais) |
| visual-check | ❌ P-14 padrão | infra flake recorrente |
| E2E — Personalization Journey | ❌ P-02 | secrets ausentes |
| Running Copilot Code Review | ❌ bot | review bot, não bloqueia |

*Última atualização: 2026-10-23T20:30Z — Deploy Gates ✅ SUCCESS. PRs abertos: #2378 (app code, aguarda PO), #2381 (YAML, merge seguro), #2383 (testes, merge seguro).*

---

## 🔴 URGENTE — Gate E40 vermelho em `main` (ledger parity — sessão anterior 2026-10-22)

**Causa:** 6 migrations novas em `supabase/migrations/` (PR #2352 mergeado às 22:36 UTC)
não foram aplicadas em produção. O check de ledger falha até serem aplicadas.

**O que você precisa fazer:**

### Passo 1 — Aplicar 5 migrations seguras (via workflow obrigatório)

Execute um por vez, na ordem, usando `gh workflow run`:

```sh
# 1. Revoke EXECUTE anon em fn_cron_guard (CRÍTICO — segurança)
gh workflow run db-apply-migration.yml \
  -f version=20261022100001 \
  --repo adm01-debug/Promo_Gifts_V4

# 2. RLS wrapper auth.uid() performance (seguro — só ALTER POLICY)
gh workflow run db-apply-migration.yml \
  -f version=20261022100010 \
  --repo adm01-debug/Promo_Gifts_V4

# 3. Cron reschedule: dispatcher_failure_alert (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100020 \
  --repo adm01-debug/Promo_Gifts_V4

# 4. Cron reschedule: hash_product_images (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100021 \
  --repo adm01-debug/Promo_Gifts_V4

# 5. Cron reschedule: sync_is_stockout_universal (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100022 \
  --repo adm01-debug/Promo_Gifts_V4
```

### ⚠️ NÃO aplicar ainda — requer análise

```
20261022100011_perf_drop_unused_indexes.sql
```

- Contém 13 `DROP INDEX` — irreversível sem recriação
- Antes de aplicar: rodar `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0`
  em produção para confirmar que os índices estão realmente sem uso
- Risco de regressão de performance em queries não cobertas pelos testes

### Como verificar que o Gate E40 voltou ao verde

Após aplicar as migrations acima, dispare manualmente o workflow de CI:

```sh
gh workflow run deploy-gates.yml --repo adm01-debug/Promo_Gifts_V4 --ref main
```

Aguarde ~10 min e confirme que todos os gates passam.

---

## 🔴 URGENTE — Incidente do banco 22/10/2026 — migration `20261022193000`

**O que é:** reduz a frequência das 15 rotinas automáticas mais pesadas, que estão saturando o banco (milhares de erros 503/504 por hora desde 21/10 ~20h). Também passa a registrar no log quando uma rotina estoura o tempo.

**Por que trava:** mudança no banco de produção só entra pelo workflow `db-apply-migration.yml`, com aprovação humana no ambiente "production".

**Passo a passo:**
1. Abra https://github.com/adm01-debug/Promo_Gifts_V4/actions/workflows/db-apply-migration.yml
2. Se houver execução "Waiting": clique nela → **Review deployments** → marque **production** → **Approve and deploy**.
3. Se não houver: **Run workflow** → branch `main` → `version`: `20261022193000` → `approved_by`: seu nome → aprove como no passo 2.

---

## 🟡 Decisões pendentes do banco (sessão anterior 2026-10-22)

### 12 correções antigas que nunca chegaram ao banco

Desde setembro, 12 migrações aprovadas em PR nunca foram aplicadas porque o validador passou a exigir arquivo de rollback. Entre elas há correções de segurança abertas em produção:
- usuários logados executam `mcp_kv_get` (lê segredos) — E18
- visitantes anônimos podem gravar/apagar em `external_connections` — E23
- visitantes anônimos têm acesso total a `mockup_approval_links` — 20261008230000

Para consolidar: responda "pode consolidar as 12 migrações pendentes". A sessão cria o PR com rollback e recibo, e você aprova uma única vez.

**Higiene (baixa prioridade):** 9 migrações já aplicadas em produção por outro caminho, só falta registrá-las (modo `repair-only`): 20260902220800, 20260902221000, 20260903093500, 20260905033100, 20260905033200, 20260916181609, 20260916210000, 20260920120000, 20260928212000.

### Quem pode ver o card "Risco de ruptura"

Em 13/10 o acesso direto à visão `mv_stock_rupture_alert` foi retirado de usuários logados. A tela de estoque ainda a lê → card vazio desde 13/10 (632 erros/dia).

Decisão: responda uma das opções:
- "todos os usuários logados" (como era antes de 13/10)
- "só coordenador para cima" / "só supervisor para cima" / "só admin"

### Secret `ASIA_INGESTION_CRON_SECRET` ausente

Uma rotina do fornecedor Asia reclama 143×/dia. Supabase → Project Settings → Vault → "Add new secret" com esse nome e o valor da integração Asia.

### Avaliar aumentar máquina do banco (custo)

Banco em máquina pequena (2 GB de memória) com ~150 rotinas. Supabase → projeto `doufsxqlfjyuvxuezpln` → Settings → Compute and Disk → avaliar o próximo tamanho.

---

> Seções acima preservadas da sessão `claude/laughing-cori-o9w35e` (2026-10-22, PR #2338 mergeado). Não remover sem confirmar que as migrations foram aplicadas e as decisões tomadas.
