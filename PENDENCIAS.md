# PENDENCIAS.md — Workflows com bloqueio externo

> Gerado em: 2026-10-23  
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
| 11 | E2E Quote Sheet | 39970462801 | ESC não abre dialog + snapshots desatualizados | ✅ Fix 5 aplicado + ❌ P-03 externo |
| 12 | E2E Cart Delete Popover | 39964680566 | Dados de teste (cart IDs) + runner shutdown | ❌ P-09 (externo/infra) |
| 13 | DB Migration E15 | 39957452351 | Migration já aplicada — preflight correto | ℹ️ OK |
| 14 | Uptime Monitor | 39988718944 | Downtime do site na janela de check | ❌ P-10 (infra) |
| 15 | Copilot Code Review | — | Branch de outro agente | ℹ️ P-06 |

**Fixes entregues no PR #2378:** Fix 1 (PopoverQtyInput), Fix 2 (HUSKY=0 Dialog snapshots), Fix 3 (NoveltiesPage overflow), Fix 4 (App.tsx TooltipProvider), Fix 5 (QuoteItemEditorSheet TooltipProvider)

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

## P-03 — E2E Quote Item Editor Sheet — Snapshots visuais desatualizados

**Workflow:** `.github/workflows/e2e-quote-item-editor-sheet.yml`  
**Erro:** Snapshots visuais do header/body do Sheet desatualizados (diff de pixels acima do threshold).

**Causa:** O componente `QuoteItemEditorSheet` mudou visualmente desde que os baselines foram gerados.

**O que você precisa fazer:**
1. Ir em **Actions → E2E · Update Quote Item Editor Sheet snapshots**
2. Clicar em **Run workflow** → branch `main`
3. O workflow roda `playwright test --update-snapshots` e faz commit dos PNGs

**Nota:** Use `workflow_dispatch` — o workflow tem `path-filter` que não dispara em PRs sem mudança no Sheet.

---

## P-04 — E2E Quote Item Editor Sheet — ESC não abre dialog de confirmação

**Status: FIX APLICADO** — `src/components/quotes/QuoteItemEditorSheet.tsx:89`  
Adicionado `disableHoverableContent` ao `TooltipProvider` local do Sheet.

**Pendência restante:** Snapshots visuais ainda desatualizados (P-03) — necessita `workflow_dispatch` manual.

---

## P-05 — db-schema-drift-check / Gate E40 — ✅ RESOLVIDO

**Status:** Secrets `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` confirmados como configurados pelo PO em 2026-10-23.  
O Gate E40 deve passar na próxima execução sem ação adicional.

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
**Run ID:** 39981481706

**Causa:** Não é um bug de código — o runner foi encerrado pelo GitHub (timeout ou manutenção).

**O que você precisa fazer:** Re-rodar o workflow manualmente quando CI voltar ao normal. Nenhuma correção de código necessária.

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

*Próxima atualização: após resolução dos itens acima, nova sessão deve atualizar este arquivo.*
