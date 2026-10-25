# Relatório CI — Baseline Local

**Sessão:** `claude_05/nifty-sagan-r23gqh`  
**Data:** 2026-10-25  
**Commit base (main):** `801e38a53ce0c235611ff207ea1dd3d41a0ca89a`  
**Branch:** `claude_05/nifty-sagan-r23gqh` (HEAD: `2e253c3a`)

---

## Verificações Executadas Localmente

| Check | Resultado | Evidência |
|---|---|---|
| `tsc --noEmit` (typecheck) | ✅ EXIT:0 | Sem erros de tipo |
| ESLint (`npm run lint`) | ✅ EXIT:0 | Sem erros de lint |
| Gate 1.3 — migration refs | ✅ EXIT:0 | 483 entradas, nenhuma ref nova detectada |
| Gate 2 — `test:deploy-gate` | ✅ 334 passed | `vitest run` nos 3 arquivos de gate |
| Correção unit test `check-supabase-linter-fallback.test.mjs` | ✅ 5 passed | Linha 51: `.toBe(0)` (E103) |

---

## Correção Aplicada Nesta Sessão

### `tests/scripts/check-supabase-linter-fallback.test.mjs` — linha 51

**Antes:**
```js
expect(await runLinter({ ...base, fetcher: async () => { throw new Error('timeout'); } })).toBe(2);
```

**Depois:**
```js
expect(await runLinter({ ...base, fetcher: async () => { throw new Error('timeout'); } })).toBe(0); // E103: throw de rede é não-bloqueante
```

**Causa raiz:** PR #2489 (`6457e24d`) introduziu E103 — exceções de rede em `runLinter` retornam 0 (não-bloqueante), mas o teste não foi atualizado junto. A correção alinha o teste ao comportamento real.

**Efeito colateral positivo:** Resolve também a falha do workflow `CI Security & Drift Checks` (`.github/workflows/ci-security-drift.yml`), que rodava o suite completo de vitest e falhava com `AssertionError: expected +0 to be 2` no job `quality-gate`.

---

## Gate Final em Main

**Run mais recente em `main`:** [#40189082464](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40189082464) (commit `801e38a5`)  
**Conclusão:** ✅ `success` (docs-only bypass aplicado — `paths-ignore: docs/**`)

---

## Workflows em Falha (não-required) — Cobertos pelo PENDENCIAS.md

| Workflow | Pendência | Motivo do bloqueio |
|---|---|---|
| `release-please.yml` | P1, P21, P44 | Requer PAT com escopo `repo` — ação do PO |
| `cart-invariants-smoke.yml` | P2b | Dados de fixture insuficientes no runner de CI |
| `ci-security-drift.yml` | P19 | **CORRIGIDO nesta sessão** (test `.toBe(2)` → `.toBe(0)`) |
| `uptime-monitor.yml` | P42 | Timeout de conectividade externa — infra |
| `supabase-linter-gate.yml` | P48 | Management API retorna HTTP 544 |
| `branch-protection-sentinel.yml` | P58 | Push direto de agente Claude (7fc20213) — advisory |
| Múltiplos E2E | P11, P16, P17, P23, P24 | Falhas em fixtures/dados de teste — não-required |

Todos os workflows acima são **não-required** (não fazem parte do Gate Final — Deploy Ready).

---

## Conclusão

O Gate Final continua verde em `main`. A única mudança de código desta sessão é a correção do teste unitário (alinhamento com E103), que não altera comportamento de produção.
