# Comparação CI: baseline pré-merge vs. pós-merge PR #2338

## SHAs

| Ponto | SHA | Data |
|---|---|---|
| **Baseline** (pré-merge) | `8e8053b9ed85142e85809783cd3acf9a3077ecde` | 2026-10-22 |
| **Pós-merge PR #2338** | `57017ba78eb68c6c72dba336f9c081c4519619c4` | 2026-10-22 |

---

## Gate 1 — Lint + TypeScript

| Item | Baseline `8e8053b9` | Pós-merge `57017ba7` |
|---|---|---|
| TypeScript (tsc) | ✅ zero erros | ✅ zero erros |
| ESLint | ✅ 0 regressões | ✅ 0 anotações |
| Gate 1.12 contract | ❌ magazine-reader-state-read ausente | ✅ corrigido (adicionado a NO_BODY_EXEMPT) |
| **Conclusão Gate 1** | **failure** | **success** |

**Fontes:**
- Baseline check run ID `119907185294`: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39757063931/job/119907185294
- Pós-merge check run ID `120040620633`: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39839609893/job/120040620633

---

## Gate Final — Deploy Ready

| Item | Baseline `8e8053b9` | Pós-merge `57017ba7` |
|---|---|---|
| Total checks | 88 | verificado via API |
| Failures | 26 (incl. Gate 1, Gate 0.5, 5 E2E, cart-invariants, Migrations×Canonical) | Gate Final: **success** |
| Cancelled | 7 | — |
| Gate Final | **failure** | **success** |

**Falhas pré-existentes no baseline que NÃO são do PR #2338:**
- Gate 0.5 (npm audit — CVEs em deps de terceiros, sem relação com PR #2338)
- E2E Error Boundaries, Full User Flows, Personalization Journey (infra/timeout)
- cart-invariants (E108 — 9 testes, erro de integração pré-existente)
- Migrations x Canonical (ECR rate limit)

**O que PR #2338 corrigiu:**
- Gate 1.12 (`magazine-reader-state-read` adicionado a `NO_BODY_EXEMPT`)
- 5 workflows em failure (Gate Final — Deploy Ready passou após merge)

---

## Nenhuma falha nova introduzida

O merge do PR #2338 não introduziu nenhum erro novo:
- Gate 1 passou de `failure` → `success` (Gate 1.12 corrigido)
- Gate Final passou de `failure` → `success`
- Sem novas anotações em Gate 1 pós-merge (annotations_count: 0)

As falhas remanescentes pós-merge (E2E, cart-invariants, Gate 0.5) são
pré-existentes, documentadas em `checks-main-8e8053b9.json` e não introduzidas
pela PR #2338.

---

## Evidência Supabase (pós-merge)

Consulta via MCP Supabase (`doufsxqlfjyuvxuezpln`) no período
2026-10-22T19:00:00Z → 2026-10-22T20:00:00Z:

```json
{"result": []}
```

Nenhum erro novo nos logs de edge functions após o merge.
