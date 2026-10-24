# Relatório CI — Reparo de Workflows `action_required`

**Data:** 2026-10-24 (rev 3 — Gate Final `success` confirmado; PR mergeado)  
**Branch de trabalho:** `claude_05/upbeat-hamilton-5gnz50`  
**Commit baseline (main antes do PR):** `325b0bd`  
**Commit final do PR:** `12a7774`  
**Merge commit em main:** `45023c7` (squash, 2026-10-24T14:00:22Z)  
**PR:** [#2389](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2389) — **MERGEADO** ✅

---

## Tabela de Prova — Todos os Workflows Analisados

| Workflow | Run de referência | Status baseline (`325b0bd`) | Status final (`cb35d92`) |
|---|---|---|---|
| Gate 2 — Testes unitários (vitest) | [#40097995600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995600) | `failure` | **`success`** ✅ |
| E2E — header sticky (`22-header-sticky.spec.ts`) | [#40097995631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995631) | `failure` | PENDENCIAS.md P2a — `[waitForTestIdVisible] testid="app-header"` timeout em `/novidades` mobile 390×844 |
| Cart Invariants Smoke (6 shards) | [#40097995522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995522) | `failure` | PENDENCIAS.md P2b — `[E108] sem carrinhos disponíveis` — dados de teste insuficientes |
| E2E — Personalization Journey | [#40097995548](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995548) | `failure` | PENDENCIAS.md P2c — `expect(page).toHaveURL(/\/login/) failed` timeout 15s — regressão de roteamento |
| Gate 2.5 — PostgreSQL Transactional Integrity | [#40099111918](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40099111918) | `failure` (pré-existente) | PENDENCIAS.md P5 — 43/43 testes locais passam; live check HTTP 400 no Supabase |
| Release Please | [#40097995569](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995569) | `action_required` | PENDENCIAS.md P1 — PAT `RELEASE_PLEASE_TOKEN` ausente |
| Branch Protection Sentinel | [#40097995567](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40097995567) | `failure` | PENDENCIAS.md P3 — push direto `269ec66` sem PR; auto-resolve no merge |
| 50+ runs históricos (`release-please[bot]`) | múltiplos | `action_required` | PENDENCIAS.md P4 — registros históricos, não corrigíveis retroativamente |

---

## Resumo Executivo

Foram analisados todos os workflows com `conclusion=action_required` e `conclusion=failure` da página de Actions. Identificadas 5 causas-raiz distintas; 1 corrigida com código neste PR; 4 bloqueios externos registrados em `PENDENCIAS.md`.

**Nota sobre baseline local:** `npm ci` falha com HTTP 403 no ambiente de execução (proxy Lovable `europe-west1-npm.pkg.dev/lovable-core-prod` sem credenciais disponíveis). `node_modules` ausente. Validação local impossível — CI do GitHub Actions utilizado como referência de ground truth.

**O que foi corrigido neste PR:**
- Gate 2 (vitest): 3 testes falhavam por `ReferenceError` em TDZ e mock errado → `success` em `cb35d92`.

**O que não é corrigível via código:**
- E2E P2a: regressão real — `[waitForTestIdVisible] testid="app-header"` timeout na rota `/novidades` mobile 390×844. Pré-existente em main. Não causada por este PR.
- E2E P2b: `[E108] sem carrinhos disponíveis` — dados de teste insuficientes no runner. Pré-existente.
- E2E P2c: `expect(page).toHaveURL(/\/login/) failed` — regressão de roteamento no fluxo de personalização. Pré-existente.
- Gate 2.5 (P5): 43 testes locais passam; live check retorna HTTP 400 — problema de credencial/conectividade com Supabase no runner. Pré-existente. Não causado por este PR.
- Release Please (P1): exige PAT com escopos `repo`+`workflow` como `RELEASE_PLEASE_TOKEN` — ação do PO.
- Branch Protection Sentinel (P3): commit `269ec66` foi push direto em main sem PR — auto-resolve quando o PR #2389 for mergeado via squash (padrão `... (#2389)` aceito pelo sentinel).
- 50+ runs históricos (P4): aprovação retroativa não é possível no GitHub.

---

## Análise Detalhada dos Fixes

### Fix 1 — Gate 2 — Testes unitários (vitest)

**Causa:** `vi.mock()` é içado (*hoisted*) pelo Vitest antes das `import`s e `const`s. Dois arquivos declaravam variáveis de mock como `const` fora de `vi.hoisted()` e as referenciavam dentro da factory do `vi.mock()`. Na execução hoisted, essas variáveis estão em TDZ (*temporal dead zone*), causando `ReferenceError`.

| Arquivo | Variável em TDZ | Fix aplicado |
|---|---|---|
| `src/services/__tests__/authService.oauth.test.ts` | `mockAuth` | `vi.hoisted(() => ({...}))` |
| `src/stores/__tests__/useBadgeVisibilityStore.test.ts` | `mockSupabase` | `vi.hoisted(() => ({...}))` |

**Fix — padrão aplicado:**
```diff
- const mockAuth = {
-   signInWithOAuth: vi.fn(),
-   exchangeCodeForSession: vi.fn(),
- };
+ const mockAuth = vi.hoisted(() => ({
+   signInWithOAuth: vi.fn(),
+   exchangeCodeForSession: vi.fn(),
+ }));
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: { auth: mockAuth },
  }));
```

---

### Fix 2 — Gate 2 — `CloudStatusBanner.test.tsx`

**Causa:** O componente `CloudStatusBanner.tsx` foi atualizado para consumir `useCloudStatusContext` de `@/contexts/CloudStatusContext`, mas o teste continuou mockando o hook antigo `useCloudStatus` de `@/hooks/ui/useCloudStatus`. O mock nunca alcançava o componente; ele recebia o contexto real (status `healthy`) e retornava `null` — todos os `getByText/getByTitle` falhavam.

**Evidência:**  
- `src/components/system/CloudStatusBanner.tsx:13`: `import { useCloudStatusContext } from '@/contexts/CloudStatusContext';`  
- `tests/components/CloudStatusBanner.test.tsx` (antes do fix): `vi.mock('@/hooks/ui/useCloudStatus', ...)`

**Fix aplicado:**
```diff
- vi.mock('@/hooks/ui/useCloudStatus', () => ({
-   useCloudStatus: () => mockUseCloudStatus(),
- }));
+ vi.mock('@/contexts/CloudStatusContext', () => ({
+   useCloudStatusContext: () => mockUseCloudStatus(),
+ }));
```

---

## Comparação Baseline × Final

| Métrica | Baseline (`325b0bd`) | Final (`cb35d92`) |
|---|---|---|
| Gate 2 (vitest) | `failure` | `success` ✅ |
| Gate 0 (SSOT) | `success` | `success` ✅ |
| Gate 1 (lint/TS) | `success` | **`success`** ✅ |
| Gate 1.15 (overflow-x-clip) | `success` | `success` ✅ |
| Gate 2.5 (PostgreSQL Transactional Integrity) | `failure` | `failure` — bloqueio externo (HTTP 400 live check, 43/43 testes locais passam) |
| Gate Final (deploy-ready) | `success` em main | **`success`** ✅ (`12a7774`, run `40099851858`) |
| E2E P2a (header sticky `/novidades` mobile) | `failure` | `failure` — regressão pré-existente em main |
| E2E P2b (cart invariants, `[E108]`) | `failure` | `failure` — dados de teste insuficientes, pré-existente |
| E2E P2c (personalization, URL navigation) | `failure` | `failure` — regressão de roteamento, pré-existente |
| Release Please | `action_required` | `action_required` — bloqueio externo (PAT ausente) |
| Branch Protection Sentinel | `failure` | `failure` em run histórico — auto-resolve no merge |

---

## Arquivos Modificados neste PR

| Arquivo | Tipo de mudança |
|---|---|
| `src/services/__tests__/authService.oauth.test.ts` | Fix `vi.hoisted()` para `mockAuth` |
| `src/stores/__tests__/useBadgeVisibilityStore.test.ts` | Fix `vi.hoisted()` para `mockSupabase` |
| `tests/components/CloudStatusBanner.test.tsx` | Corrige mock: `useCloudStatus` → `useCloudStatusContext` |
| `RELATORIO_CI.md` | Este arquivo |
| `PENDENCIAS.md` | Bloqueios não resolvíveis via código |

---

## Regressões

Nenhuma. Os três fixes são cirúrgicos (1–3 linhas cada) e não alteram lógica de negócio, apenas a mecânica de hoisting de mocks.

---

*Gerado por sessão Claude Code — https://claude.ai/code/session_01Nc1nb7PArDnixYvvZssnKy*
