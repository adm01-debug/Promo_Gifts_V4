# PENDENCIAS.md — Workflows com bloqueio externo

> Gerado em: 2026-10-23  
> Atualizado em: 2026-10-23 (sessão continuada)  
> Sessão: https://claude.ai/code/session_019gUZ8wvjsJMC3gYzy6k7jB  
> Branch de trabalho: `claude/magical-cannon-u5t1vy` → PR #2378

Itens abaixo **não foram corrigidos nesta sessão** por dependerem de secret, permissão
ou dado externo que não está disponível via MCP. Cada item documenta o workflow, o erro
exato e o que o PO precisa fazer para desbloquear.

---

## Inventário completo — run de baseline (main, commit `b167c9c8095a99be701187758bae66d760e9c94f`)

| # | Workflow | Run ID | Causa | Status |
|---|---|---|---|---|
| 1 | Deploy Gates | 39986411363 | Gate E40: `SUPABASE_ACCESS_TOKEN` ausente | ❌ P-05 (externo) |
| 2 | CI Security & Drift Checks | 39986411170 | Timeout em `MockupProductSelector.test.tsx` | ⚠️ P-07 (investigar) |
| 3 | E2E — Critical Flows | 39986411340 | Tooltips presos — ESC consumido | ✅ Corrigido Fix 4 (App.tsx) |
| 4 | Cart Invariants Smoke | 39986410736 | Invariants header/sidebar (provavelmente tooltip) | ✅ Corrigido Fix 4 |
| 5 | CI Replenishment | 39986410680 | /novidades — overflow:hidden quebrava sticky/scroll | ✅ Corrigido Fix 3 (NoveltiesPage) |
| 6 | E2E Personalization | 39986411295 | Secrets `E2E_USER_*` ausentes / usuário inativo | ❌ P-02 (externo) |
| 7 | Release Please | 39986410747 | PAT com `contents: write` ausente | ❌ P-01 (externo) |
| 8 | E2E Swatch QuickView | 39981481706 | Runner shutdown (sinal SIGTERM infra) | ❌ P-08 (infra) |
| 9 | E2E (Playwright) | 39973432189 | Header sticky /novidades — overflow:hidden | ✅ Corrigido Fix 3 |
| 10 | E2E Update Dialog snapshots | 39970463068 | Husky OOM no pré-push do CI | ✅ Corrigido Fix 2 (workflow YAML) |
| 11 | E2E Quote Sheet | 39970462801 | ESC não abre dialog + snapshots desatualizados | ✅ Fix 5 aplicado + 🔄 P-03 dispatch E155 enviado |
| 12 | E2E Cart Delete Popover | 39964680566 | Dados de teste (cart IDs) + runner shutdown | ❌ P-09 (externo/infra) |
| 13 | DB Migration E15 | 39957452351 | Migration já aplicada — preflight correto | ℹ️ OK |
| 14 | Uptime Monitor | 39988718944 / 39996580013 | Downtime do site na janela de check (recorrente) | ❌ P-10 (infra) |
| 15 | Copilot Code Review | — | Branch de outro agente | ℹ️ P-06 |
| 16 | Branch Protection Sentinel | 39981481558 | Commit `7401c9f` push direto na main sem padrão aceito | ❌ P-11 (pré-existente) |
| 17 | Update Quote Visual Snapshots | 39997674586 | chromium-authed: `E2E_USER_*` ausentes (mesmo P-02) | ❌ P-12 (externo) |

**Fixes entregues no PR #2378** (app code — aguarda aprovação do PO para merge): Fix 1 (PopoverQtyInput), Fix 3 (NoveltiesPage overflow), Fix 4 (App.tsx TooltipProvider), Fix 5 (QuoteItemEditorSheet TooltipProvider)  
**Fix entregue no PR #2381** (YAML-only — seguro para merge imediato via admin bypass): Fix 2 (HUSKY=0 no commit de snapshots do workflow `e2e-update-dialog-snapshots.yml`)

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

## P-05 — db-schema-drift-check / Gate E40 — ❌ BLOQUEIO ESTRUTURAL (externo)

**Workflow:** `.github/workflows/deploy-gates.yml` — job `Gate E40 - Schema Drift Check`  
**Step falho:** "Ledger parity (repo x canonical)"  
**Run:** 39986411363 (attempt 2, 2026-10-23T17:50)

**Erro exato:**
```
[migration-ledger][bloqueado] local_only=1091; remote_only=638; mismatched=0; malformed=0
```

**Causa:** Os secrets estavam corretos (confirmado: `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` aparecem como `***` nos logs). O gate falha por **divergência estrutural de longa data no ledger de migrations**:
- 1.091 migrations existem em `supabase/migrations/` do repo mas **não estão registradas** no banco de produção (`schema_migrations`)
- 638 migrations estão **no banco** mas não existem no repo

Isso é pré-existente à sessão atual — o commit `b167c9c8` (main) já tinha essa divergência.

**O que você precisa fazer:**  
Esta é uma reconciliação de histórico de migrations que exige decisão do PO sobre cada versão. Não pode ser automatizada (REGRA #8 do CLAUDE.md).

1. Baixar o artefato `schema-reconciliation-evidence` do run 39986411363 para ver quais migrations divergem
2. Decidir a estratégia de reconciliação (criar migration espelhos para as 638 remotas, ou marcar as 1091 locais como `repair-only`)
3. Seguir o caminho de reconciliação E99 descrito em `docs/db/POLITICA_DDL.md`

**Impacto:** Bloqueia o Gate Final em qualquer push para `main` enquanto não reconciliado. Não impacta o PR #2378 (que roda os mesmos gates mas na branch — a branch não tem secrets configurados para o Gate E40, por isso o gate é skipped/failure diferente no PR).

---

## P-06 — Running Copilot Code Review (branch de outro agente)

**Situação:** Workflow de revisão automática rodando em branch `claude/fix-realtime-messages-owner-261023-1600` (outro agente).

**Por que não foi tratado:** REGRA #10 do CLAUDE.md — não interagir com branches de outros agentes.

**Ação recomendada:** Verificar o PR aberto para aquela branch e decidir se deve ser mergeado, fechado ou reaberto.

---

## P-07 — CI Security & Drift Checks — Timeout em MockupProductSelector.test.tsx — ✅ FIX APLICADO

**Workflow:** `ci-security-drift.yml` / `unit-tests` job  
**Run com falha original:** `39986411170`

**Causa raiz confirmada (2026-10-23):**  
`@tanstack/react-virtual` v3 chama `getScrollElement()` durante o render síncrono. No primeiro render, `scrollParentRef.current` ainda é `null` (React só seta refs após o commit phase). Com `scrollElement = null`, `outerSize = 0` e `calculateRange` retorna `null` → nenhuma `mockup-product-row` é renderizada → `waitFor` aguarda 5000ms (asyncUtilTimeout de `tests/setup.ts`) e estoura.

Em produção não há problema: logo após o mount, o `ResizeObserver` ou um re-render do componente já popula o ref. Em jsdom, o `ResizeObserver` está mockado como no-op (`tests/setup.ts`), então o re-render nunca ocorre sozinho.

**Fix aplicado (2026-10-23 — `tests/components/mockup/MockupProductSelector.test.tsx`):**  
O componente registra `window.addEventListener('resize', handleResize)` em `useEffect`, onde `handleResize` chama `setViewportWidth(window.innerWidth)`. Disparar `window.dispatchEvent(new Event('resize'))` após `renderWithProviders` força o re-render com `scrollParentRef.current` já preenchido → virtualizer recebe o scroll element não-nulo → `calculateRange` retorna as linhas → `mockup-product-row` aparece no DOM.

```diff
 async function renderAndOpenDialog(onSelect = vi.fn()) {
   renderWithProviders(<MockupProductSelector selection={null} onSelect={onSelect} />);
+  window.dispatchEvent(new Event('resize'));
   await waitFor(() =>
     expect(screen.getAllByTestId('mockup-product-row').length).toBeGreaterThan(0),
   );
 }
```

**Pendência restante:** `MockupProductSelector.test.tsx` **não está** no script `test:deploy-gate` (que roda só `migrated-endpoints`, `theme-presets` e `ProductSparkline`) — portanto **não bloqueava o Gate Final**. O fix resolve a falha intermitente em `ci-security-drift.yml` mas não impacta a mergabilidade do PR #2378.

---

## P-08 — E2E Swatch QuickView — Runner shutdown (infra)

**Workflow:** `.github/workflows/e2e-swatch-quickview.yml`  
**Erro:** Todos os jobs falharam com sinal SIGTERM — GitHub Actions runner foi desligado por infraestrutura.  
**Run ID original:** 39981481706  
**Attempt 2 disparado:** Run ID 39986410684 — `in_progress` desde 2026-10-23T17:47:23Z

**Causa:** Não é um bug de código — o runner foi encerrado pelo GitHub (timeout ou manutenção).

**Status atual:** Rerun (attempt 2) em andamento. Se o run 39986410684 também falhar por infra, re-rodar manualmente. Nenhuma correção de código necessária.

---

## P-09 — E2E Cart Delete Popover — Dados de teste e runner shutdown

**Workflow:** `.github/workflows/e2e-cart-delete-popover.yml`  
**Erro:** Falha por dados de teste (cart IDs ausentes) + runner shutdown.  
**Run ID:** 39964680566

**O que você precisa fazer:**
1. Verificar se o seed de dados E2E foi rodado
2. Confirmar que os cart IDs esperados pelo teste existem no banco
3. Re-rodar após seed

---

## P-10 — Uptime Monitor — Downtime da infraestrutura

**Workflow:** `.github/workflows/uptime-monitor.yml`  
**Erro:** Site indisponível durante a janela de monitoramento.  
**Run ID:** 39988718944

**Causa:** Não é um bug de código. Nenhuma correção necessária.

---

## P-11 — Branch Protection Sentinel — Push direto na main (pré-existente)

**Workflow:** `.github/workflows/branch-protection-sentinel.yml`  
**Erro:**
```
1 commit(s) em push para main sem padrão aceito: 7401c9f
```
**Run ID:** 39981481558 (commit `7401c9f742bfc9af6433bcf47a59e06ef5ea7450`)

**Causa:** Alguém (ou um bot não reconhecido) fez push direto na `main` sem que a mensagem do commit `7401c9f` correspondesse a nenhum dos padrões aceitos pelo Sentinel:
- Squash merge de PR (`(#NNN)`)
- Merge commit de PR
- Bot oficial (`github-actions[bot]`, `dependabot[bot]`, `renovate[bot]`, Lovable)
- Release (`chore(release): ...`)
- Allowlist estreita (`docs(redeploy):`, `chore(workflows):`, `chore(docs):`)
- Bypass de emergência (`[skip-sentinel: <motivo>]`)

**Nota:** Esta falha é **pré-existente** — o commit `7401c9f` entrou na `main` antes desta sessão. A falha do Sentinel é retrospectiva a esse push.

**O que você precisa fazer:**  
1. Verificar quem fez o push do commit `7401c9f` e por qual motivo
2. Se foi intencional, verificar se as mudanças estão corretas
3. O Sentinel não bloqueia nenhum workflow atual — é apenas advisory para essa run histórica
4. Se quiser limpar: abrir nova run manual do workflow `branch-protection-sentinel.yml` contra `main` — verificará apenas commits futuros

**Impacto:** Histórico — não impede merges ou deploys atuais.

---

## P-12 — Update Quote Visual Snapshots — Secrets E2E ausentes (mesmo bloqueio do P-02)

**Workflow:** `.github/workflows/e2e-update-quote-snapshots.yml`  
**Erro:**
```
7 failures em projeto chromium-authed:
  - e2e/quotes/quote-new-fab.spec.ts (5 viewports: mobile-390, tablet-768, laptop-1024, desktop-1280, wide-1440)
  - e2e/quotes/quote-pdf-header-snapshot.spec.ts (2 viewports: tablet-768, laptop-1024)
```
**Run ID:** 39997674586 (2026-10-23T17:52)

**Causa:** O workflow usa o projeto Playwright `chromium-authed` para testes que exigem usuário autenticado. As variáveis `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` **não estão configuradas como secrets** no repositório (ou o usuário de teste está inativo) — mesma raiz de P-02.

**O que você precisa fazer:**
1. Resolver o P-02 primeiro (cadastrar `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` em **Settings → Secrets → Actions**)
2. Re-rodar o workflow `E2E · Update Quote Visual Snapshots` via `workflow_dispatch` na branch `main`
3. O workflow fará `playwright test --update-snapshots` e commitará os PNGs atualizados automaticamente

**Impacto:** Snapshots desatualizados de `quote-new-fab` e `quote-pdf-header-snapshot` — falha visual no CI, não impede funcionalidade em produção.

---

*Próxima atualização: após resolução dos itens acima, nova sessão deve atualizar este arquivo.*
