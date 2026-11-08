# Relatório de PRs — Promo Gifts V4

> Gerado automaticamente. Fonte de verdade: `progresso.json`.

---

## Sessão 2026-11-08 (session_01Ss1tXZ4cAbxBvdmu95uNPz) — 0 PRs mergeadas

### Estado do main no início da sessão
- SHA: `1d3dafae93722b7e19f426bcf63701a80ab4b148`
- Gate Final: SUCCESS (run #42494087701, 429 vitest tests, 0 failures)
- TypeScript: EXIT:0

### PRs abertas analisadas: 18 (= total aberto no início da sessão)

| PR | Draft | Mergeable | CI | Governance | Veredito | Motivo |
|----|-------|-----------|-----|-----------|---------|--------|
| [#3127](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3127) | false | CONFLICTING | FAILURE | .github/workflows/ | DECISAO_HUMANA | REGRA#8 workflows |
| [#3129](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3129) | false | CONFLICTING | FAILURE | .github/workflows/ | DECISAO_HUMANA | REGRA#8 workflows |
| [#3137](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3137) | false | CONFLICTING | FAILURE | .github/workflows/ | DECISAO_HUMANA | REGRA#8 workflows |
| [#3144](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3144) | false | CONFLICTING | FAILURE | workflows+migrations | DECISAO_HUMANA | REGRA#8 dupla |
| [#3148](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3148) | true | CONFLICTING | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations + DRAFT |
| [#3150](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3150) | false | CONFLICTING | FAILURE | .github/workflows/ | DECISAO_HUMANA | REGRA#8 workflows |
| [#3160](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3160) | true | CONFLICTING | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations + DRAFT |
| [#3179](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3179) | true | MERGEABLE | FAILURE | migrations+rollbacks | DECISAO_HUMANA | REGRA#8 DDL + DRAFT |
| [#3202](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3202) | true | CONFLICTING | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations + DRAFT |
| [#3203](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3203) | false | CONFLICTING | FAILURE | nenhum | NAO_MERGEAVEL | CONFLICTING + CI=FAILURE |
| [#3205](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3205) | false | MERGEABLE | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations |
| [#3210](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3210) | false | MERGEABLE | FAILURE | nenhum | NAO_MERGEAVEL | CI=FAILURE (release-please) |
| [#3212](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3212) | false | MERGEABLE | FAILURE | nenhum | NAO_MERGEAVEL | CI=FAILURE (bot deploy log) |
| [#3214](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3214) | true | CONFLICTING | FAILURE | workflows+rollbacks | DECISAO_HUMANA | REGRA#8 dupla + DRAFT (branch agente) |
| [#3215](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3215) | false | MERGEABLE | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations |
| [#3216](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3216) | true | CONFLICTING | FAILURE | supabase/migrations/ | DECISAO_HUMANA | REGRA#8 migrations + DRAFT |
| [#3217](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3217) | **true** | MERGEABLE | **SUCCESS** | nenhum | DECISAO_HUMANA | Único bloqueio: DRAFT |
| [#3220](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3220) | true | MERGEABLE | FAILURE | workflows+migrations | DECISAO_HUMANA | REGRA#8 dupla + DRAFT |

### Contagem por veredito
- DECISAO_HUMANA: **15**
- NAO_MERGEAVEL: **3**
- MERGEADA_AGENTE: **0**

### Destaque: PR #3217 (mais próxima de merge autônomo)
- CI=SUCCESS, MERGEABLE, docs-only (`auditoria-supabase/`)
- **Único bloqueio:** isDraft=true
- Se o PO publicar (convert to ready), merge autônomo na próxima sessão

---

## Evidência de análise — Sessão 2026-11-08

### Método aplicado nesta sessão
1. `git fetch origin refs/pull/<N>/head:pr-tmp-<N>` para todos os 18 PRs
2. `git cherry -v <main-sha> pr-tmp-<N>` — commits novos por PR
3. `git diff <main>...pr-tmp-<N> --stat` — arquivos alterados por PR
4. `git diff <main>...pr-tmp-<N> --name-only | grep -E '\.github/workflows|supabase/migrations/[0-9]|supabase/rollbacks/[0-9]|\.gitleaks'` — governance check
5. GraphQL query para draft/mergeable/CI de todos os 18 PRs

### Resultados diretos (transcript principal — sem subagente)

```
PR #3127: 3 commits, 15 files, .github/workflows/e2e-flows.yml etc → DECISAO_HUMANA
PR #3129: 2 commits, 8 files,  .github/workflows/ → DECISAO_HUMANA
PR #3137: 3 commits, 11 files, .github/workflows/ + .github/scripts/ → DECISAO_HUMANA
PR #3144: 3 commits, 10 files, .github/workflows/ + supabase/migrations/ → DECISAO_HUMANA
PR #3148: 1 commit,  11 files, supabase/migrations/ → DECISAO_HUMANA
PR #3150: 3 commits, 17 files, .github/workflows/ → DECISAO_HUMANA
PR #3160: 3 commits, 4 files,  supabase/migrations/20261101150000 → DECISAO_HUMANA
PR #3179: 1 commit,  2 files,  supabase/migrations/+rollbacks/ → DECISAO_HUMANA
PR #3202: 3 commits, 4 files,  supabase/migrations/20261108001500 → DECISAO_HUMANA
PR #3203: 5 commits, 132 files, 0 governance → NAO_MERGEAVEL (CONFLICTING)
PR #3205: 3 commits, 4 files,  supabase/migrations/20261108132000 → DECISAO_HUMANA
PR #3210: 2 commits, 6 files,  package.json 1.8.1→1.9.0 → NAO_MERGEAVEL (CI=FAILURE)
PR #3212: 1 commit,  1 file,   EDGE_FUNCTIONS_DEPLOY_LOG.md → NAO_MERGEAVEL (CI=FAILURE)
PR #3214: 10+ commits, 124 files, .github/workflows/ + rollbacks/ → DECISAO_HUMANA
PR #3215: 3 commits, 1 file,   supabase/migrations/20261108001500 → DECISAO_HUMANA
PR #3216: 2 commits, 4 files,  supabase/migrations/20261108001500 → DECISAO_HUMANA
PR #3217: 1 commit,  2 files,  auditoria-supabase/ (docs-only, CI=SUCCESS, DRAFT) → DECISAO_HUMANA
PR #3220: 4 commits, 7 files,  .github/workflows/ + supabase/migrations/ → DECISAO_HUMANA
```

---

## Sessão 2026-10-31 (bed6ac4e) — 8 PRs mergeadas

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

---

## Histórico de sessões anteriores

> Sessões 1-3 (2026-10-29/30) mergearam 13 PRs: #2695, #2707, #2719, #2720, #2721, #2730, #2733, #2735, #2736, #2737, #2741, #2742, #2757.
>
> Sessões 4-5 mergearam 3 PRs: #3017 (`5a35a743`), #3020 (`0a8a17f9`), #3201 (`1d3dafae`).

### Total de merges em todas as sessões: **24**

---

## Bloqueios aguardando PO

- **PRs 3127, 3129, 3137, 3144, 3150, 3214, 3220** — Workflows CI aguardam revisão humana
- **PRs 3148, 3160, 3179, 3202, 3205, 3215, 3216, 3220** — Migrations DDL aguardam `db-apply-migration.yml`
- **PR #3217** — Docs auditoria, CI=SUCCESS, MERGEABLE — aguarda PO publicar (convert from draft)
