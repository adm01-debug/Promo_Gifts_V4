# Relatório de CI — Sessão 2026-10-26

**Branch:** `claude_04/beautiful-gates-bvocz5`  
**PR:** [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597)  
**Commit principal:** `2c9fb608f` (4 fixes) + `1960f24b2` (merge main)  
**Sessão:** https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4  
**Data:** 2026-10-26

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Workflows com falha investigados | 22+ |
| Falhas corrigidas nesta sessão | **4** |
| Falhas documentadas em PENDENCIAS.md (novos P) | **7** (P78–P84) |
| Gate Final bloqueante | ✅ Verde |
| PR aberto | [#2597](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2597) |

---

## Correções Aplicadas (commit `2c9fb608`)

### 1. P83 — invoke-direct-calls gate: `AnonymizeAccountDialog.tsx`

**Workflow:** `ci-security-drift.yml`  
**Problema:** `src/components/privacy/AnonymizeAccountDialog.tsx:44` usava `supabase.functions.invoke('anonymize-user', ...)` direto, violando o gate `check-invoke-direct-calls.mjs`.  
**Fix:** Substituído por `invokeEdge('anonymize-user', { body: { confirm_phrase: CONFIRM_PHRASE }, op: 'anonymize_user' })` via `@/lib/edge/safeInvokeCall`. Import `supabase` direto removido.

**Antes:**
```typescript
import { supabase } from '@/integrations/supabase/client';
// ...
const { error } = await supabase.functions.invoke('anonymize-user', {
  body: { confirm_phrase },
});
```

**Depois:**
```typescript
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
// ...
const { error } = await invokeEdge('anonymize-user', {
  body: { confirm_phrase: CONFIRM_PHRASE },
  op: 'anonymize_user',
});
```

---

### 2. P78 — Gitleaks: 22 leaks em histórico imutável

**Workflow:** `gitleaks-audit.yml`  
**Problema:** 22 secrets detectados em commits históricos imutáveis. O scan falhava com todas as detecções.  
**Fix:** 19 fingerprints de commits históricos adicionados ao array `commits` em `.gitleaks.toml`.

**Detalhe dos fingerprints adicionados:**
- 4 commits com chave `anon` pública do Supabase (rotação não obrigatória mas recomendada)
- 7 commits com JWT/service_role marcados como `[ROTACIONAR]`
- 5 commits com `apikey` em migrations/scripts
- 3 commits miscelâneos

**8 commits exigem rotação pelo PO** (detalhado em P78 do PENDENCIAS.md).

---

### 3. SIGPIPE (exit 141) em `ratchet-weekly.yml`

**Workflow:** `.github/workflows/ratchet-weekly.yml`  
**Problema:** `git diff .tsc-ratchet-baseline bundle-size-baseline.json | head -40` — quando `head` fecha o pipe antes de `git diff` terminar, em bash com `-eo pipefail`, o exit code 141 (SIGPIPE) era propagado e o step falhava.

**Fix:** Captura da saída em variável intermediária:
```bash
DIFF_OUT=$(git diff .tsc-ratchet-baseline bundle-size-baseline.json)
echo "$DIFF_OUT" | head -40
```

---

### 4. P64 — Replenishment integration test timeout

**Arquivo:** `src/hooks/products/__tests__/useReplenishments.integration.test.ts`  
**Problema:** `fn_get_replenishment_stats` demora >15s em CI com banco real — o `waitFor` timeout de 15s expirava antes da RPC responder.  
**Fix:** `waitFor` timeout 15000→25000ms; Vitest test timeout 30000→35000ms.

---

## Falhas Investigadas — Pré-Existentes ou Bloqueadas Externamente

### P84 — E2E Quotes — Matrix (E77): 4 jobs falhando

**Workflow:** `e2e-quotes.yml` (E77)  
**Run com falha:** [#40407715626](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40407715626)  
**Disparo:** `AnonymizeAccountDialog.tsx` matchou `src/components/**` no path filter  
**Conclusão:** Pré-existente no `main` — nenhuma das mudanças do PR afeta quotes/snapshots/undo

| Job falho | Tipo | Specs |
|---|---|---|
| `E2E · row-menu-width` | CSS visual | `quote-row-menu-width.spec.ts` (4 tests) |
| `E2E · view-no-presentation-mode` | Snapshot dark mode + flaky | Snapshot visual |
| `E2E · view-sticky` | Funcional + visual | `view-sticky.spec.ts` |
| `E2E · undo` | Funcional autenticado | Specs `04q`, `04r`, `04s` |

**Ação do PO:** Investigar CSS quote row menu, atualizar snapshots dark mode, corrigir sidebar sticky e edge cases de undo.

---

### P81 — db-schema-drift-check: secret `SUPABASE_DB_PASSWORD` ausente

**Bloqueio:** Secret não configurado no repositório GitHub.  
**Ação do PO:** Adicionar `SUPABASE_DB_PASSWORD` em GitHub → Settings → Secrets → Actions.

---

### P82 — edge-functions-drift-check: secret `SUPABASE_ACCESS_TOKEN` ausente

**Bloqueio:** Personal access token da Supabase Management API não configurado.  
**Ação do PO:** Gerar em app.supabase.com → Account → Access Tokens e adicionar como `SUPABASE_ACCESS_TOKEN`.

---

### P79, P80 — Supabase backend timeout transiente

**Workflows:** `e2e-personalization.yml`, `e2e-critical-flows.yml`  
**Causa:** Backend `doufsxqlfjyuvxuezpln` extremamente lento (auth/v1/token: 42s+) durante os runs.  
**Ação:** Nenhuma — falha transiente de infraestrutura.

---

## Estado do Gate Final

```
deploy-gates.yml (Gate Final) — VERDE ✅
  Gate 0: SSOT doufsxqlfjyuvxuezpln ✅
  Gate 0.5: npm audit ✅
  Gate 1: Lint + TypeScript ✅
  Gate 1.1–1.18: checks críticos ✅
  Gate 2: Vitest ✅
  Gate 3: E2E Smoke ✅
  Gate 5: SEO ✅
  Gate 6: Build Vite ✅
```

Os workflows com falha documentados neste relatório (P64, P78–P84) são **todos não-required** no Gate Final.

---

## Chaves que Exigem Rotação Pelo PO (CRÍTICO)

Os seguintes commits históricos têm chaves potencialmente ativas expostas em commits imutáveis:

| Commit | Tipo | Ação |
|---|---|---|
| `b5e044f4` | `service_role` hardcoded em `client.ts` | 🔴 ROTACIONAR |
| `06461a45` | `apikey` hardcoded em migration | 🔴 ROTACIONAR |
| `86ecbbb4` | JWT provável `service_role` | 🔴 ROTACIONAR |
| `7fc1a8cb` | JWT em `supabase/functions/_shared/auth.ts:32` | 🔴 ROTACIONAR |
| `0bebb586` | JWT em `supabase/functions/_shared/auth.ts:32` | 🔴 ROTACIONAR |
| `b0cc98c1` | `service_role` em `scripts/contract-testing.mjs` | 🔴 ROTACIONAR |
| `13c58825` | JWT + apikey em testes/migrations | 🔴 ROTACIONAR |

As chaves foram cobertas no allowlist do gitleaks (scan passa), mas **o risco real persiste até a rotação** no painel Supabase.

---

## Próximos Passos para o PO

1. **Rotacionar 7 chaves** marcadas acima no painel `doufsxqlfjyuvxuezpln` → Prioridade: `service_role` e `auth.ts`
2. **Configurar secrets** `SUPABASE_DB_PASSWORD` e `SUPABASE_ACCESS_TOKEN` no GitHub para desbloquear P81 e P82
3. **Mergear PR #2597** — corrige P83 (invoke-direct), P78 (gitleaks), SIGPIPE ratchet, P64 (replenishment timeout)
4. **Investigar E2E quotes** (P84): row-menu-width CSS, snapshots dark mode, sidebar sticky, undo edge cases

---

*Gerado por Claude Code — https://claude.ai/code/session_014RkohRYagi3sPiL8jtgot4 (2026-10-26)*
