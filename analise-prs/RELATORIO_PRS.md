# Relatório de PRs — Promo Gifts V4

> Gerado automaticamente. Fonte de verdade: `progresso.json`.

---

## Sessão 2026-11-08 (49a643e1) — 0 PRs mergeadas

### Estado do main no início da sessão

- **SHA:** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df`
- **TypeScript:** EXIT:0, 0 erros
- **ESLint:** EXIT:0, 0 erros, 0 warnings
- **Vitest:** TIMEOUT (>240s) — baseline: 2 falhas conhecidas em `calendar.redesign.test.tsx` (day_selected, day_outside)

### PRs abertas analisadas: 18

| PR | Veredito | Motivo |
|----|----------|--------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (3 arquivos) |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (8 arquivos) |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (8 arquivos) |
| [#3144](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3144) | DECISAO_HUMANA | REGRA#8 — workflows + migrations + rollbacks |
| [#3148](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3148) | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3150](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3150) | DECISAO_HUMANA | REGRA#8 — workflows + migrations (3) + rollbacks (3) |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3202](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3202) | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | NAO_MERGEAVEL | 7 conflitos reais no merge local + CI=FAILURE |
| [#3205](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3205) | DECISAO_HUMANA | REGRA#8 — migrations |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | NAO_MERGEAVEL | Gate Final não rodou (required check ausente) + Supabase Preview FAILURE |
| [#3212](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3212) | NAO_MERGEAVEL | Gate Final não rodou (required check ausente) |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | DECISAO_HUMANA | REGRA#8 — workflows + migrations (3) + DRAFT |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | DECISAO_HUMANA | REGRA#8 — migrations |
| [#3216](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3216) | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3217](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3217) | DECISAO_HUMANA | isDraft=true (única pendência; Gate Final=SUCCESS) |
| [#3220](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3220) | DECISAO_HUMANA | REGRA#8 — .github/workflows/ |

### Contagem por veredito

| Veredito | Quantidade |
|----------|-----------|
| DECISAO_HUMANA | 15 |
| NAO_MERGEAVEL | 3 |
| MERGEADA | 0 |

### PRs mergeadas nesta sessão

Nenhuma. Zero PRs qualificaram para merge autônomo.

### Decisões humanas necessárias

**15 PRs aguardam o PO** — motivos por categoria:

**REGRA#8 — .github/workflows/ (5 PRs):**
- [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) — estabiliza E2E (3 workflow files)
- [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) — reduz pressão runners (8 workflow files)
- [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) — impede falso negativo detector E2E (8 workflow files)
- [#3220](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3220) — corrige Sentinel Regra 6 (CONFLICTING)

**REGRA#8 — supabase/migrations/ (6 PRs):**
- [#3144](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3144) — reconcilia ledger
- [#3150](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3150) — libera migrations pendentes
- [#3205](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3205) — reversiona migration e2e_cleanup
- [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) — adiciona rollback header
- [#3216](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3216) — CONFLICTING + DRAFT
- [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) — CRON-001 (DRAFT + CONFLICTING)

**REGRA#8 + DRAFT (4 PRs):**
- [#3148](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3148) — CRM bridge (DRAFT)
- [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) — DB E15 (DRAFT)
- [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) — preflight db-apply-migration (DRAFT)
- [#3202](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3202) — RELATORIO §33 (DRAFT)

**Quase-aprovada (1 PR):**
- [#3217](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3217) — docs auditoria; Gate Final=SUCCESS; merge local=clean; 0 arquivos governance; ÚNICO bloqueio: isDraft=true. PO pode publicar e esta PR pode ser mergeada autonomamente.

### PRs não mergeáveis (3)

- **[#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203)** — 7 conflitos reais (`.any-type-baseline.json`, `.cart-header-fuzz.json`, `.migration-refs-baseline.json`, `docs/DB_FRONTEND_COVERAGE.md`, `scripts/gen-internal-schema.mjs`, `scripts/kit-ai-enrichment.js`, `supabase/functions/_shared/cors-snapshot.json`) + CI=FAILURE
- **[#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210)** — bot release 1.9.0; Gate Final nunca disparou; Supabase Preview FAILURE (`column categories.level does not exist` — pre-existente no main)
- **[#3212](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3212)** — bot edge-deploy receipt; Gate Final nunca disparou; Supabase Preview CANCELLED (infra capacity)

---

## Histórico de sessões anteriores

> Sessão 2026-10-31 (bed6ac4e): 8 PRs mergeadas — #2875,#2876,#2864,#2848,#2849,#2857,#2862,#2834. main após sessão: `33ef0cda2dceefd29ec25d5ae4d35cf651abb6c8`.
> Sessões 2026-10-29/2026-10-30: 13 PRs — #2695,#2707,#2719,#2720,#2721,#2730,#2733,#2735,#2736,#2737,#2741,#2742,#2757.
