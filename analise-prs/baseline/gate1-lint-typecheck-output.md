# Gate 1 — Lint + TypeScript — Output Real

**SHA analisado:** `8e8053b9ed85142e85809783cd3acf9a3077ecde` (main antes do merge de PR #2338)
**Run ID:** `39757063931`
**Job ID:** `119907185294`
**Job name:** `Gate 1 — Lint + TypeScript`
**Workflow:** `deploy-gates.yml` (ID `282456033`)
**Conclusão do job:** `failure`
**Data:** 2026-10-22T09:39 UTC

---

## Step 5 — TypeScript (npm run typecheck)

**Conclusão:** `success`
**Duração:** ~45 s

```
> promo-gifts-v4@0.0.0 typecheck
> tsc --noEmit

(sem erros — saída vazia)
```

Zero erros de TypeScript.

---

## Step 6 — ESLint (npm run lint:baseline)

**Conclusão:** `success`
**Duração:** ~30 s

```
> promo-gifts-v4@0.0.0 lint:baseline
> eslint src --ext .ts,.tsx --max-warnings 0

(sem avisos nem erros — saída vazia)
```

Zero erros ou warnings de ESLint.

---

## Gates 1.1–1.11 — Todos passaram

| Gate | Descrição | Resultado |
|------|-----------|-----------|
| 1.1 | Campos críticos do tipo `Product` | ✅ PASS |
| 1.2 | Drift estrutural de `types.ts` | ✅ PASS |
| 1.3 | Contratos de migration (preflight) | ✅ PASS |
| 1.4 | Visual baselines commitados | ✅ PASS |
| 1.5 | Sem "Salvar Alterações" em fluxos de rascunho | ✅ PASS |
| 1.6 | Bundle size dentro dos limites | ✅ PASS |
| 1.7 | TSC ratchet file guard | ✅ PASS |
| 1.8 | Detect accidentally base64-encoded files | ✅ PASS |
| 1.9 | Dívida técnica ratchets | ✅ PASS (detalhes abaixo) |
| 1.9.1 | console.* baseline | ✅ PASS |
| 1.9.2 | Boundary cross-domain | ✅ PASS |
| 1.10 | indexed-access ratchet | ✅ PASS |
| 1.11 | Workflow contracts check-workflow-contracts --gate | ✅ PASS |

---

## Gate 1.12 — Contract Coverage — FALHOU

**Conclusão:** `failure`
**Exit code:** 1

```
Verificando cobertura de contratos de webhook...

❌ Contract coverage gap — 1 function(s) missing from CONTRACTS:
   • magazine-reader-state-read

Funções listadas em edge-functions/ mas ausentes do mapa CONTRACTS em
tests/contracts/webhook-schemas.ts:
  - magazine-reader-state-read

Para corrigir: adicionar entrada no mapa CONTRACTS ou
declarar em NO_BODY_EXEMPT se a função não recebe body.
```

Este foi o **único gate com falha** em todo o job de Gate 1.

---

## Detalhe dos ratchets de dívida técnica (Gate 1.9)

Verificados no step Gate 1.9:

| Ratchet | Atual | Baseline | Status |
|---------|-------|----------|--------|
| TODO/FIXME/HACK | 51 | 51 | ✅ |
| `as <Tipo>` (double-cast) | 2164 | 2164 | ✅ |
| `as unknown as` | 250 | 250 | ✅ |
| file-size (arquivos acima do limite) | 137 | 137 | ✅ |
| `eslint-disable` | 172 | 177 | ✅ drift positivo (5 eliminadas) |

Gate 1.9.1 — console.*: 22 arquivos, 0 regressões ✅  
Gate 1.9.2 — boundary: 11 violações históricas pré-existentes, 0 novas ✅

---

## Resumo

- **TypeScript:** ✅ PASSOU (zero erros)
- **ESLint:** ✅ PASSOU (zero erros, zero warnings)
- **Gates 1.1–1.11:** ✅ todos passaram
- **Gate 1.12:** ❌ FALHOU — `magazine-reader-state-read` ausente do mapa `CONTRACTS`
- **Gates 1.13+:** ✅ todos passaram (jobs separados, todos com conclusão `success`)

A única causa de falha do CI neste SHA era Gate 1.12, corrigida por PR #2338.
