# Gate 1 — Lint + TypeScript: saída real do CI

**SHA baseline:** `8e8053b9ed85142e85809783cd3acf9a3077ecde` (main pré-merge PR #2338)  
**Check run ID:** `119907185294`  
**Workflow run:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063931/job/119907185294  
**Resultado:** `failure` (exit code 1 em Gate 1.12)  
**Período:** 2026-10-22T15:14:19Z → 2026-10-22T15:18:04Z  

---

## TypeScript (`npm run typecheck`)

```
> @adm01-debug/gifts-store@1.2.1 typecheck:full
> tsc -p tsconfig.app.json --noEmit
```

**Resultado: PASSOU** — tsc rodou de 15:14:50 a 15:15:47 sem emitir nenhum erro.

---

## ESLint (`npm run lint:baseline`)

```
ESLint baseline gate [full] — atual: 0 erros, 0 warnings · baseline: 0 erros
Δ vs baseline: regressões +0 · melhorias −0 · líquido +0
✅ Nenhuma regressão de lint detectada.
```

**Resultado: PASSOU** — zero erros de lint.

---

## Gate 1.1 — Campos críticos do tipo `Product`

```
Membros encontrados em `interface Product`: 68
✅ OK price — Preço original do produto
✅ OK sale_price — Preço de venda (pode ser opcional)
✅ OK shortDescription — Descrição curta do produto
✅ OK category_id — ID da categoria
✅ OK category_name — Nome da categoria
✅ Todos os campos críticos de `interface Product` estão presentes.
```

**Resultado: PASSOU**

---

## Gate 1.2 — Drift estrutural de `types.ts`

```
diff local: atual vs. "HEAD~1"
  + 0 objeto(s) novo(s)
  - 0 objeto(s) removido(s) (0 justificado(s) na allowlist, 0 não)
✅ check-types-inventory-drift: sem drift não justificado.
```

**Resultado: PASSOU**

---

## Gate 1.9 — Ratchets de dívida técnica

```
TODO/FIXME/HACK baseline gate — atual: 51 · baseline: 51  ✅
`as <Tipo>` baseline gate — atual: 2164 · baseline: 2164  ✅
`as unknown as` baseline gate — atual: 250 · baseline: 250  ✅
File-size baseline gate — limite: 500 linhas · acima do limite: 137 · baseline: 137  ✅
`eslint-disable` baseline gate — atual: 172 · baseline: 177  ✨ (melhoria de 5)
```

**Resultado: PASSOU**

---

## Gate 1.12 — Contract coverage ← **CAUSA DO FAILURE**

```
Edge Functions inspected: 109
  body-less (no req.json/req.text): 58
  exempt by NO_BODY_EXEMPT:         30
  in CONTRACTS registry:            68

❌ Contract coverage gap — 1 function(s) missing from CONTRACTS:
   • magazine-reader-state-read

To fix:
  1. Add a Zod schema for the function in tests/contracts/webhook-schemas.ts
  2. Register it in the CONTRACTS map
  3. OR, if the function legitimately has no body, add it to NO_BODY_EXEMPT

##[error]Process completed with exit code 1.
```

**Resultado: FALHOU** — `magazine-reader-state-read` ausente de CONTRACTS e NOT em NO_BODY_EXEMPT.

---

## Resumo

| Sub-gate | Resultado |
|---|---|
| TypeScript (tsc) | ✅ PASSOU — zero erros |
| ESLint (lint:baseline) | ✅ PASSOU — zero regressões |
| Gate 1.1 campos Product | ✅ PASSOU |
| Gate 1.2 types drift | ✅ PASSOU |
| Gate 1.9 ratchets dívida | ✅ PASSOU |
| Gate 1.12 contract coverage | ❌ FALHOU — magazine-reader-state-read |

**Falha completa de Gate 1 devida exclusivamente ao Gate 1.12.**  
TypeScript e ESLint estavam limpos no baseline.
