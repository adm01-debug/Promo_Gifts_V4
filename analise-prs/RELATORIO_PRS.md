# Relatório de PRs — Promo Gifts V4

> Gerado automaticamente. Fonte de verdade: `progresso.json`.

---

## Sessão 2026-10-31 (bed6ac4e) — 8 PRs mergeadas

### PRs mergeadas nesta sessão

| PR | SHA squash | Título | Gate CI |
|----|-----------|--------|---------|
| [#2875](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2875) | `bbf69b31` | fix(ci): Gate E23 — etapa E007 | SUCCESS |
| [#2876](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2876) | `e277bf7b` | feat(recibos): E002-E010 evidências Onda 0 | PRÉ-EXISTENTES |
| [#2864](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2864) | `0efdc5fd` | fix(kit): KitBuilderLegacyRedirect preserva search+hash | PRÉ-EXISTENTES |
| [#2848](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2848) | `5ec5ce77` | docs(governance): AGENTS.md + CLAUDE.md | PRÉ-EXISTENTES |
| [#2849](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2849) | `3f336c4f` | fix(security): remove exceção scripts/.* do gitleaks | PRÉ-EXISTENTES |
| [#2857](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2857) | `c952a06a` | test(quotes): corrige caminho E128 fuzz | SUCCESS |
| [#2862](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2862) | `f1700964` | test(e2e): estabiliza colunas orçamentos | SUCCESS |
| [#2834](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2834) | `33ef0cda` | docs(ci): evidence vitest baseline | PRÉ-EXISTENTES |

**main após sessão:** `33ef0cda2dceefd29ec25d5ae4d35cf651abb6c8`

**Falhas pré-existentes confirmadas no main (não bloqueiam merge):**
- Gate 0.5 (Dependency Audit): falha universal — run `41229634388`
- Gate Final: cascata de Gate 0.5
- swatch→QV E2E chromium/firefox/webkit: runs `41211444545`, `41211401618`
- list-url-state-restore E2E: run `41229634283`

### Vereditos das 31 PRs analisadas nesta sessão

| PR | Veredito | Motivo |
|----|----------|--------|
| [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) | DECISAO_HUMANA | REGRA #8 — .github/workflows/ |
| [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) | DECISAO_HUMANA | REGRA #8 — DDL migrations |
| [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717) | DECISAO_HUMANA | REGRA #8 — .github/workflows/ |
| [#2731](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2731) | DECISAO_HUMANA | REGRA #8 — workflow + migration |
| [#2739](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2739) | DECISAO_HUMANA | Gate 1.9 nova regressão (ratchet dívida técnica) |
| [#2744](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2744) | DECISAO_HUMANA | Draft + título NÃO MESCLAR |
| [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758) | DECISAO_HUMANA | PR vazia — 0 arquivos alterados |
| [#2821](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2821) | DECISAO_HUMANA | REGRA #8 — .github/workflows/ |
| [#2822](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2822) | DECISAO_HUMANA | Gate 1.3 stale — baseline desatualizado |
| [#2823](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2823) | DECISAO_HUMANA | REGRA #8 — DDL migration |
| [#2824](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2824) | DECISAO_HUMANA | REGRA #8 — .github/workflows/ + CONFLICTING |
| [#2825](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2825) | DECISAO_HUMANA | CONFLICTING com main |
| [#2827](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2827) | DECISAO_HUMANA | CONFLICTING + body "Não mesclar" |
| [#2831](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2831) | DECISAO_HUMANA | CONFLICTING |
| [#2834](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2834) | MERGEADA | docs(ci) — squash `33ef0cda` |
| [#2839](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2839) | DECISAO_HUMANA | CONFLICTING |
| [#2846](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2846) | DECISAO_HUMANA | CONFLICTING |
| [#2847](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2847) | DECISAO_HUMANA | CONFLICTING |
| [#2848](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2848) | MERGEADA | docs(governance) — squash `5ec5ce77` |
| [#2849](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2849) | MERGEADA | fix(security) — squash `3f336c4f` |
| [#2850](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2850) | DECISAO_HUMANA | E2E run cancelado por timeout — CI inconclusivo |
| [#2851](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2851) | DECISAO_HUMANA | Mesmo arquivo que #2857 (já mergeada) — conflitará |
| [#2852](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2852) | DECISAO_HUMANA | CONFLICTING |
| [#2854](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2854) | DECISAO_HUMANA | CONFLICTING |
| [#2855](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2855) | DECISAO_HUMANA | CONFLICTING |
| [#2856](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2856) | DECISAO_HUMANA | CONFLICTING |
| [#2857](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2857) | MERGEADA | test(quotes) — squash `c952a06a` |
| [#2858](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2858) | BLOQUEADO | REGRA #8 — .github/workflows/ |
| [#2859](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2859) | BLOQUEADO | REGRA #8 — .github/workflows/ |
| [#2860](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2860) | DECISAO_HUMANA | CONFLICTING |
| [#2862](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2862) | MERGEADA | test(e2e) — squash `f1700964` |
| [#2864](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2864) | MERGEADA | fix(kit) — squash `0efdc5fd` |
| [#2871](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2871) | AGUARDA_PO | REGRA #8 — DDL migration produção |
| [#2873](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2873) | AGUARDA_PO | Auditoria — revisão humana |
| [#2875](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2875) | MERGEADA | fix(ci) — squash `bbf69b31` |
| [#2876](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2876) | MERGEADA | feat(recibos) — squash `e277bf7b` |

### Bloqueios aguardando PO

- **E001** — Rotar `service_role` hardcoded no painel Supabase
- **E005** — Remover `bypass_actors` no ruleset 16764622
- **E006** — Remover branch protection clássica + ruleset 24121385
- **[#2871](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2871)** — Aplicar DDL `stock_notes` via `db-apply-migration.yml`
- **[#2858](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2858), [#2859](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2859), [#2821](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2821)** — Workflows CI aguardam revisão humana

---

## Histórico de sessões anteriores

> Sessões anteriores (2026-10-29 / 2026-10-30) mergearam 13 PRs — #2695, #2707, #2719, #2720, #2721, #2730, #2733, #2735, #2736, #2737, #2741, #2742, #2757. Ver commits `8da42aa9` → `0ca54ff1`.
