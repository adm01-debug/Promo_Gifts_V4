# Baseline — Sessão session_01VXkRxWq5ZUCmvuNx5e2TGX (continuação desta sessão)
**Atualizado em:** 2026-11-09T13:30:00Z
**main HEAD:** `16f4af23df235c2f68b534692d8287ee20eb83c1` (PR #3342 mergeada — fix as-assertions baseline)
**Commit anterior (pré-sessão):** `c113300c034fb39126274fba9aa10ef05762ab13`

## Gate Final — estado atual
- **Run #42612471759** — SHA `16f4af23` — conclusion=**FAILURE** ❌ (2026-11-09T12:01:46Z)
- **Job falhando:** "Gate 1 - Lint + TypeScript" (job #129147531657)
- **Step falhando:** "Gate 1.9 — Dívida técnica (ratchets TODO / as / file-size / eslint-disable)" (step 14)
- **Sub-check falhando:** file-size baseline (`check-file-size-baseline.mjs`)
- **Gate 1.9 as-assertions:** PASSOU ✅ (2146 = 2146 após #3342)
- **Gate 6 (Build):** SKIPPED → Gate Final reporta como FAILURE (Gate Final requer success para push não-docs-only)

## Falhas por nome (baseline para comparação de regressão)

### Gate 1.9 — file-size baseline
```
❌ Regressão de tamanho de arquivo — 3 ocorrência(s):
  src/components/kit-builder/KitAIPromptDialog.tsx: 598 linhas — cresceu 21 linhas (baseline: 577)
  src/hooks/kit-builder/useKitBuilder.ts: 774 linhas — cresceu 13 linhas (baseline: 761)
  src/hooks/kit-builder/useKitBuilderPageState.ts: 563 linhas — cresceu 10 linhas (baseline: 553)
```

**Script que falha:** `node scripts/check-file-size-baseline.mjs`
**Gate 1.9 as-assertions:** PASSOU (2146 = 2146 ✅) — corrigido via PR #3342
**Outros ratchets (TODO/FIXME/HACK):** baseline OK — atual 51 = baseline 51 ✅

### Gate 6 — Build
- `R_BUILD: skipped` — `DOCS_ONLY: false` — Gate Final requer `success` para push de main não-docs-only
- Mesmo comportamento observado na sessão anterior (PRE-EXISTENTE)

## Diagnóstico
**Gate 1.9 file-size é bloqueio PRÉ-EXISTENTE em main** — 3 arquivos do Kit Builder cresceram antes desta sessão quando features do Kit Builder foram mergeadas. A falha estava mascarada pelo exit precoce do as-assertions check; após PR #3342 corrigir as-assertions, file-size tornou-se visível.

**Gate 6 skip** também pré-existente no contexto de merge de docs-only: a push de merge de docs-only skipa o build, mas o Gate Final em modo push-normal requer success.

**Implicação para merges:**
- PRs docs-only (E14): Gate 1 e Gate 6 são SKIPPED — Gate Final pode ser SUCCESS ✅
- PRs com código: Gate 1.9 file-size vai falhar até que `check-file-size-baseline.mjs` seja atualizado com `--update`

**STATUS: MERGES PAUSADOS** — per mandato "Qualquer falha nova = PARE todos os merges e avise com SHA e PR"

## Histórico de merges desta sessão
| PR | SHA de merge | Tipo | Gate Final na PR | Supabase |
|---|---|---|---|---|
| #3337 | `6933eb6122d2ccf333d533d4441891b8d918479b` | docs-only E14 | SUCCESS ✅ | ZERO impacto |
| #3340 | `5a3f679e7b32c652696d955a7c90f867db79abe7` | docs-only E14 | SUCCESS ✅ | ZERO impacto |
| #3342 | `16f4af23df235c2f68b534692d8287ee20eb83c1` | fix ci ratchet | SUCCESS ✅ (pre-merge) | ZERO impacto |

## Worktrees
Nenhum worktree de teste criado nesta sessão. Operações somente-leitura via GitHub MCP.
