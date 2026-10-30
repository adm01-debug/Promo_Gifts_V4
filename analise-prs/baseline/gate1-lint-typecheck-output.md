# Gate 1 — Lint + TypeScript — Output Verbatim (GitHub Actions API)

**Fonte:** GitHub Actions API — job_id `119907185294`, run_id `39757063931`
**SHA analisado:** `8e8053b9ed85142e85809783cd3acf9a3077ecde` (main antes do merge de PR #2338)
**Job name:** `Gate 1 — Lint + TypeScript`
**Workflow:** `deploy-gates.yml` (ID `282456033`)
**Conclusão do job:** `failure`
**Data:** 2026-10-22T09:39 UTC
**Captura:** saída verbatim recuperada via `mcp__GITHUB_-_MCP_-_FOREVER__github_get_job_logs` — não editada

---

## TypeScript — saída verbatim

```
> @adm01-debug/gifts-store@1.2.1 typecheck:full
> tsc -p tsconfig.app.json --noEmit
```

*(sem erros — saída vazia após o comando)*

---

## ESLint — saída verbatim

```
> @adm01-debug/gifts-store@1.2.1 lint:baseline
> npm run lint:config && node scripts/check-eslint-baseline.mjs

> @adm01-debug/gifts-store@1.2.1 lint:config
> node scripts/check-eslint-config-parses.mjs

  ok eslint.config.js — parseia e exporta 11 blocos de config
ESLint baseline gate [full] — atual: 0 erros, 0 warnings · baseline: 0 erros
Δ vs baseline: regressões +0 · melhorias −0 · líquido +0
✅ Nenhuma regressão de lint detectada.
```

---

## Gate 1.1 — Campos críticos do tipo `Product` — saída verbatim

```
🔍 Verificando campos críticos de `interface Product` em src/types/product-catalog.ts...
Membros encontrados em `interface Product`: 68
✅ OK price — Preço original do produto
✅ OK sale_price — Preço de venda (pode ser opcional)
✅ OK shortDescription — Descrição curta do produto
✅ OK category_id — ID da categoria
✅ OK category_name — Nome da categoria
✅ Todos os campos críticos de `interface Product` estão presentes.
```

---

## Gate 1.2 — Drift estrutural de `types.ts` — saída verbatim

```
diff local: atual vs. "HEAD~1"
  + 0 objeto(s) novo(s)
  - 0 objeto(s) removido(s) (0 justificado(s) na allowlist, 0 não)
ℹ️  diff ao vivo pulado: Não solicitado (use --live).
✅ check-types-inventory-drift: sem drift não justificado.
```

---

## Gate 1.3 — Contratos de migration — saída verbatim

```
✅ Nenhuma NOVA referência quebrada. (481 entrada(s) legadas na baseline.)
Supabase reference catalog contract
  1365 literal(is) canônico(s) · 74 despacho(s) dinâmico(s) · 483 classificado(s) fora do PostgREST canônico
⚠️ 106 ocorrência(s) legada(s) reconhecida(s) pelo catálogo temporário.
✅ Nenhuma referência canônica nova ou despacho dinâmico novo passou sem contrato.
✅ Contrato de nomes/versões de migrations novas aprovado.
   baseline: 2975 arquivos + 0 reconciliados; novas: 0; colisões legadas preservadas: 0.
```

---

## Gate 1.4 — Visual baselines — saída verbatim

```
✅ Todas as 6 specs protegidas têm baselines commitados (projeto: chromium-public).
```

---

## Gate 1.5 — Sem "Salvar Alterações" — saída verbatim

```
✅ Nenhuma ocorrência de "Salvar Alterações" nos fluxos de rascunho.
```

---

## Gate 1.9 — Ratchets de dívida técnica — saída verbatim

```
TODO/FIXME/HACK baseline gate — atual: 51 · baseline: 51
✅ TODO/FIXME/HACK baseline gate: nenhuma regressão detectada.
`as <Tipo>` baseline gate — atual: 2164 · baseline: 2164
✅ `as <Tipo>` baseline gate: nenhuma regressão detectada.
`as unknown as` baseline gate — atual: 250 · baseline: 250
✅ `as unknown as` baseline gate: nenhuma regressão detectada.
File-size baseline gate — limite: 500 linhas · acima do limite: 137 · baseline: 137
✅ Nenhuma regressão de tamanho de arquivo detectada.
`eslint-disable` baseline gate — atual: 172 · baseline: 177
✨ Drift positivo: 5 ocorrência(s) eliminada(s). Considere rodar com --update.
✅ `eslint-disable` baseline gate: nenhuma regressão detectada.
```

---

## Gate 1.9.1 — console.* baseline — saída verbatim

```
✅ console.* baseline gate: 22 arquivos no baseline, 0 regressões.
```

---

## Gate 1.9.2 — Boundary cross-domain — saída verbatim

```
✅ boundary gate: 11 violações históricas no baseline, 0 novas.
```

---

## Gate 1.12 — Contract Coverage — FALHOU — saída verbatim

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

Este foi o **único gate com falha** em todo o job de Gate 1.

---

## Resumo

- **TypeScript:** ✅ PASSOU (zero erros) — verbatim: saída vazia após `tsc -p tsconfig.app.json --noEmit`
- **ESLint:** ✅ PASSOU (zero erros, zero warnings) — verbatim: `Nenhuma regressão de lint detectada.`
- **Gate 1.1:** ✅ PASSOU — verbatim: todos os 5 campos críticos presentes em `interface Product` (68 membros)
- **Gate 1.2:** ✅ PASSOU — verbatim: `sem drift não justificado`
- **Gate 1.3:** ✅ PASSOU — verbatim: `Nenhuma referência canônica nova`
- **Gate 1.4:** ✅ PASSOU — verbatim: `6 specs protegidas têm baselines commitados`
- **Gate 1.5:** ✅ PASSOU — verbatim: `Nenhuma ocorrência de "Salvar Alterações"`
- **Gate 1.9:** ✅ PASSOU — verbatim: ratchets sem regressão, drift positivo em `eslint-disable`
- **Gate 1.9.1:** ✅ PASSOU — verbatim: `22 arquivos no baseline, 0 regressões`
- **Gate 1.9.2:** ✅ PASSOU — verbatim: `11 violações históricas no baseline, 0 novas`
- **Gate 1.12:** ❌ FALHOU — verbatim: `magazine-reader-state-read` ausente do mapa `CONTRACTS` — exit code 1

A única causa de falha do CI neste SHA era Gate 1.12, corrigida por PR #2338.
