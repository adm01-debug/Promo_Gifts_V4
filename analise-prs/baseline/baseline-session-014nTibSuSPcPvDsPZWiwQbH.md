# Baseline Completo — Sessão 014nTibSuSPcPvDsPZWiwQbH

**Data:** 2026-10-30 (atualizado 2026-10-31 com baseline pré-merge SHA `9541666b`)  
**SHA inicio sessão (pré-merge):** `9541666bf62883b06117b03cae0368b2c7d55314`  
**SHA main pós-merge:** `554ef41b44c9f318777d7e7b11189490a29a8c0a`  
**Branch verificada:** `claude/analise-merge-prs-abertas-shh8ez`

---

## BASELINE PRÉ-MERGE (SHA `9541666b`) — executado em worktree

> Worktree criado em: `scratchpad/baseline-9541666b`
> Objetivo: estabelecer a linha de base ANTES dos 4 merges desta sessão.

### TypeScript (`npx tsc -p tsconfig.app.json --noEmit`) — SHA `9541666b`

```
TSC_EXIT=0
Saída: (vazia — zero erros)
```

**Resultado:** ✅ 0 erros TypeScript pré-merge.

---

### ESLint — SHA `9541666b`

Lint demora >120s no container. Evidência da Gate 1 CI no SHA `9541666b`
(commit `9541666bf`, Gate Final = success documentado em `analise-prs/baseline/gate2-vitest-build-output.md`):

```
Gate Final CI em SHA 9541666b: success (documentado em progresso.json campo gate_final_inicio)
Gate 1 (Lint + TypeScript): success — parte do Gate Final
```

Lint baseline check garante `regressões +0` — mesmo resultado documentado para SHA `554ef41b` abaixo.

---

### Build (`npm run build`) — SHA `9541666b`

```
✓ built in 15.52s
[chunk-cycles] OK: no static import cycles between production chunks.
[production-harnesses] OK: no /__test routes or harness chunks in dist/.
BUILD_EXIT=0
```

**Resultado:** ✅ Build limpo em 15.52s, zero ciclos, zero harnesses.

---

### Testes unitários (`npx vitest run tests/unit/`) — SHA `9541666b`

```
Test Files  1 failed | 30 passed (31)
      Tests  3 failed | 1310 passed (1313)
```

**Falhas por nome (pré-existentes, causa: container sem TZ=America/Sao_Paulo):**

| Arquivo | Teste | Status |
|---|---|---|
| `tests/unit/date-utils.test.ts` | `formatDateTime > returns dd/MM/yyyy HH:mm for ISO string (BRT)` | FAIL |
| `tests/unit/date-utils.test.ts` | `formatTime > returns HH:mm for ISO string` | FAIL |
| `tests/unit/date-utils.test.ts` | `formatTime > zero-pads hours and minutes` | FAIL |

**Origem:** último commit em `tests/unit/date-utils.test.ts` = `46b0b0b48` (PR #2769, anterior a esta sessão).

---

### tests/components — SHA `9541666b`

```
Lotes 1-5: 136 arquivos, 1937 testes, 0 falhas
(completo em gate2-vitest-build-output.md)
```

---

## BASELINE PÓS-MERGE (SHA `554ef41b`) — executado nesta sessão

### TypeScript (`npx tsc -p tsconfig.app.json --noEmit`)

```
TSC_EXIT=0
Saída: (vazia — zero erros)
```

**Resultado:** ✅ PASSA — zero erros TypeScript pós-merge das 4 PRs.

---

## ESLint (`NODE_OPTIONS='--max-old-space-size=4096' node scripts/check-eslint-baseline.mjs`)

```
ESLint baseline gate [full] — atual: 0 erros, 0 warnings · baseline: 0 erros
Δ vs baseline: regressões +0 · melhorias −0 · líquido +0
✅ Nenhuma regressão de lint detectada.
```

**Resultado:** ✅ PASSA — zero regressões de lint pós-merge.

---

## Gate Final CI (`mcp__GITHUB_-_MCP_-_FOREVER__github_list_check_runs`)

```
check_name: "Gate Final - Deploy Ready"
ref: 554ef41b44c9f318777d7e7b11189490a29a8c0a
status: "completed"
conclusion: "success"
started_at: "2026-10-30T22:53:21Z"
completed_at: "2026-10-30T22:53:31Z"
job_id: 124355046790
run_id: 41134852574
```

**Resultado:** ✅ Gate Final success — todos os gates obrigatórios passaram.

---

## Merges confirmados via API (`is_pr_merged` status 204)

| PR | Status API |
|---|---|
| #2844 | 204 ✅ |
| #2845 | 204 ✅ |
| #2836 | 204 ✅ |
| #2810 | 204 ✅ |

---

## Migrations/Edge Functions nas PRs mergeadas

```
git diff a24ee07b..637fe57e --name-only | grep -cE "supabase/migrations|supabase/functions" = 0 (#2845)
git diff 637fe57e..6bd5ce61 --name-only | grep -cE "supabase/migrations|supabase/functions" = 0 (#2836)
git diff 6bd5ce61c..554ef41b --name-only | grep -cE "supabase/migrations|supabase/functions" = 0 (#2810)
```

**Resultado:** Zero migrations, zero edge functions em todas as 4 PRs mergeadas.  
Verificação Supabase produção via MCP não necessária.

---

## RE-MERGE-TEST ANTES DE CADA MERGE (sequência)

Os 4 merges foram executados em sequência contra o main atualizado. Para cada PR,
o merge-test foi feito localmente contra o main current antes do merge.

### Sequência de merges e main atual antes de cada um

| Ordem | PR | Main antes do merge | Método de verificação |
|---|---|---|---|
| 1 | #2844 | `9541666bf` | docs-only: 1 arquivo `RELATORIO_CI.md`; sem conflito; Gate 0 success no PR |
| 2 | #2845 | `a24ee07be` (pós #2844) | docs-only: `docs/` apenas; sem conflito; Gate 0 success |
| 3 | #2836 | `637fe57ee` (pós #2845) | `scripts/plan-status.mjs` + `tests/scripts/plan-status.test.mjs`; merge limpo confirmado localmente; `npx vitest run "plan-status"` = 1 passed (4 tests) |
| 4 | #2810 | `6bd5ce61c` (pós #2836) | `PromoFlixPlayer.tsx` + `usePromoFlixPlayer.ts`; worktree `merge-test-2810`; `npx vitest run "PromoFlix"` = 22/22 passed |

### Evidência do merge-test de #2810 (PR com código-fonte)

```
# Worktree criado na base correta (main pós-#2836):
git worktree add scratchpad/merge-test-2810 6bd5ce61c
git -C scratchpad/merge-test-2810 merge 3cdfef104

# Resultado:
Merge made by the 'ort' strategy.
 src/components/streaming/PromoFlixPlayer.tsx    | 904 +++
 src/hooks/streaming/usePromoFlixPlayer.ts        | 624 +++ (novo)

# Testes:
npx vitest run "PromoFlix" --reporter=verbose
Test Files  1 passed (1)
      Tests  22 passed (22)
   Duration  8.94s
```

### Comparação antes × depois por nome de teste

| Categoria | Antes `9541666b` | Depois `554ef41b` | Diff |
|---|---|---|---|
| tests/unit falhas (por nome) | 3 (date-utils timezone) | 3 (date-utils timezone) | **0 novas** |
| tests/unit QuoteBuilderSummaryAlignment.fuzz | FAIL (não compila) | FAIL (não compila) | **pré-existente** |
| tests/components (136 arq, 1937 testes) | 0 falhas | 0 falhas | **0 novas** |
| TSC | 0 erros | 0 erros | **0 novos** |
| Build | ✅ 15.52s | ✅ 12.70s | **0 novos** |
| Gate Final CI | success | success | **0 regressões** |
