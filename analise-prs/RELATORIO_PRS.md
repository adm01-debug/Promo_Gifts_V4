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

| PR | Merge Local | Já Impl. | Veredito | Motivo |
|----|-------------|----------|----------|--------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (3 arquivos) + conflito em e2e helpers e playwright.config.ts |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (8 arquivos) — todos conflitos em governance |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — .github/workflows/ (8 arquivos) + conflito em package.json |
| [#3144](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3144) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — workflows + migrations + rollbacks + conflito em 2 arquivos não-governance |
| [#3148](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3148) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT + conflito em MIGRATIONS_SYNC_LOG.md |
| [#3150](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3150) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — workflows + migrations (3) + rollbacks (3) + conflitos em 4 arquivos não-governance |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT + conflito em PENDENCIAS.md e RELATORIO_CI.md |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | clean | NÃO | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT |
| [#3202](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3202) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT + conflito em PENDENCIAS.md e RELATORIO_CI.md |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | 7_conflicts | NÃO | NAO_MERGEAVEL | 7 conflitos reais (baselines JSON, scripts críticos, cors-snapshot) + CI=FAILURE |
| [#3205](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3205) | clean | NÃO | DECISAO_HUMANA | REGRA#8 — migrations |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | clean | NÃO | NAO_MERGEAVEL | Gate Final não rodou (required check ausente) + Supabase Preview FAILURE |
| [#3212](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3212) | clean | NÃO | NAO_MERGEAVEL | Gate Final não rodou (required check ausente) |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — workflows + migrations (3) + DRAFT + CONFLICTING (GitHub) |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | clean | NÃO | DECISAO_HUMANA | REGRA#8 — migrations |
| [#3216](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3216) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — migrations + DRAFT + CONFLICTING + conflito em 3 arquivos |
| [#3217](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3217) | clean | NÃO | DECISAO_HUMANA | isDraft=true (única pendência; Gate Final=SUCCESS) |
| [#3220](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3220) | conflict | NÃO | DECISAO_HUMANA | REGRA#8 — .github/workflows/ + CONFLICTING + conflito em PENDENCIAS.md e RELATORIO_CI.md |

### Contagem por veredito

| Veredito | Quantidade |
|----------|-----------|
| DECISAO_HUMANA | 15 |
| NAO_MERGEAVEL | 3 |
| MERGEADA | 0 |

### PRs mergeadas nesta sessão

Nenhuma. Zero PRs qualificaram para merge autônomo.

### Correção de dados vs. sessão anterior

**merge_local corrigido** em 10 PRs (antes marcadas como "clean" incorretamente):
- **3127, 3129, 3137** → `conflict` (conflitos em governance + não-governance files)
- **3144, 3148** → `conflict` (conflitos em scripts de migration e sync log)
- **3150** → `conflict` (6 conflitos: 2 governance + 4 não-governance incluindo drift-baseline.mjs)
- **3160, 3202** → `conflict` (PENDENCIAS.md e RELATORIO_CI.md)
- **3214** → `conflict` (GitHub CONFLICTING — PR de 128 arquivos)
- **3216, 3220** → `conflict` (PENDENCIAS.md, RELATORIO_CI.md, e outros)

**Já implementada:** TODAS as 18 PRs têm commits com prefixo `+` no git cherry → nenhuma está em main.

### Decisões humanas necessárias

**15 PRs aguardam o PO** — motivos por categoria:

**REGRA#8 — .github/workflows/ (5 PRs):**
- [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) — estabiliza E2E (3 workflow files + conflito em e2e helpers)
- [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) — reduz pressão runners (8 workflow files, todos conflitos em governance)
- [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) — impede falso negativo detector E2E (8 workflow files + package.json)
- [#3220](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3220) — corrige Sentinel Regra 6 (CONFLICTING, envolve `scripts/sentinel-check.sh` protegido)

**REGRA#8 — supabase/migrations/ (6 PRs):**
- [#3144](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3144) — reconcilia ledger (conflito em allowlist e sync log)
- [#3150](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3150) — libera migrations pendentes (conflito em drift-baseline.mjs — script crítico)
- [#3205](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3205) — reversiona migration e2e_cleanup (merge clean)
- [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) — adiciona rollback header migration (merge clean, 1 linha de comentário)
- [#3216](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3216) — CONFLICTING + DRAFT (possivelmente superseded por #3215)
- [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) — CRON-001 (DRAFT + CONFLICTING + 128 arquivos)

**REGRA#8 + DRAFT (4 PRs):**
- [#3148](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3148) — CRM bridge (DRAFT + migration + conflito em sync log)
- [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) — DB E15 (DRAFT + 27 commits + conflitos em tracking docs)
- [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) — preflight db-apply-migration (DRAFT, merge clean)
- [#3202](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3202) — RELATORIO §33 (DRAFT + conflitos em tracking docs)

**Quase-aprovada (1 PR):**
- [#3217](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3217) — docs auditoria; Gate Final=SUCCESS; merge local=clean; 0 arquivos governance; ÚNICO bloqueio: isDraft=true. PO pode publicar o draft e esta PR pode ser mergeada autonomamente na próxima sessão.

### PRs não mergeáveis (3)

- **[#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203)** — 7 conflitos reais em arquivos não-governance: `.any-type-baseline.json`, `.cart-header-fuzz.json`, `.migration-refs-baseline.json`, `docs/DB_FRONTEND_COVERAGE.md`, `scripts/gen-internal-schema.mjs`, `scripts/kit-ai-enrichment.js`, `supabase/functions/_shared/cors-snapshot.json`. Risco alto de reverter lógica de scripts críticos e baselines do CI. CI=FAILURE.
- **[#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210)** — bot release 1.9.0; Gate Final nunca disparou; Supabase Preview FAILURE (`column categories.level does not exist` — pré-existente no main).
- **[#3212](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3212)** — bot edge-deploy receipt (1 linha, documental); Gate Final nunca disparou; Supabase Preview CANCELLED (infra capacity). Gate Final ausente impede merge mesmo sendo PR trivial.

---

## Histórico de sessões anteriores

> Sessão 2026-10-31 (bed6ac4e): 8 PRs mergeadas — #2875,#2876,#2864,#2848,#2849,#2857,#2862,#2834. main após sessão: `33ef0cda2dceefd29ec25d5ae4d35cf651abb6c8`.
> Sessões 2026-10-29/2026-10-30: 13 PRs — #2695,#2707,#2719,#2720,#2721,#2730,#2733,#2735,#2736,#2737,#2741,#2742,#2757.
