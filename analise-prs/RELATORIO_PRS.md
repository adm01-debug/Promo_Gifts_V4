# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev40)
**Data:** 2026-10-27
**main HEAD baseline:** `c86a3812ce79bd8c615c6c5e8919735e5cba3e7e`
**main HEAD pós-merges:** `9182c0a57b7c526b2c3665bddba21f510eae72c5`
**PRs abertas analisadas:** 18
**Merges autônomos esta sessão:** 5 (#2610, #2592, #2590, #2591, #2593)

---

## ⚠️ RISCOS E DECISÕES HUMANAS

| PR | Risco | Ação necessária |
|---|---|---|
| #2420 | ALTO — rollback destrutivo migration + CONFLICT | FECHAR |
| #2572 | ALTO — CONFLICT + REGRA#8 + REGRA#10 | Aprovação PO + resolução conflict |
| #2579 | MÉDIO — downgrade semântico 1.2.1→1.0.0 | Confirmar intenção release-please |
| #2580 | ALTO — rollback e23 + CI FAILURE + migration | Aprovar rollback + corrigir CI |
| #2587 | MÉDIO — major upgrade zustand 4→5 + behind main | Testar breaking changes |
| #2588 | ALTO — breaking API react-day-picker + CI FAILURE | Migrar calendar.tsx v8→v10 API |
| #2594 | BAIXO — R15: setup-node@v7 sem SHA pin | Dependabot: aguardar PR com SHA correto |
| #2603 | ALTO — RLS deny_all 17 tabelas + CI FAILURE | Revisar policies antes de merge |
| #2605 | BAIXO — apenas DRAFT | Converter DRAFT→ready para merge imediato |

---

## Mergeadas esta sessão

| PR | Título | SHA squash | Método |
|---|---|---|---|
| #2610 | fix(e2e): aceita /auth no redirect de ProtectedRoute | `48899b659ef6` | squash |
| #2592 | bump actions/stale 9→11 | `388254cddd` | squash |
| #2590 | bump codeql-action/upload-sarif 3→4.39.1 | `c6e94d3a6c` | squash |
| #2591 | bump codeql-action/analyze 3→4.39.1 | `c612d2b7c1` | squash |
| #2593 | bump codeql-action/init 3→4.39.1 | `9182c0a57b` | squash |

**CI pós-merge #2610:** Gate Final SUCCESS run_id `40447563368` em `48899b659ef6` (2026-10-27T04:28:10Z)
**CI pós-merges #2590–#2593:** pendente — CI em andamento após merge em sequência

---

## Prontas mas não mergeadas — e por quê

| PR | Título | Único bloqueio |
|---|---|---|
| #2605 | fix(tests): 4 unit tests + E2E | DRAFT (CI SUCCESS, zero REGRA#8) |
| #2597 | fix: 4 workflows CI | DRAFT + REGRA#8 |
| #2604 | fix(ci): continue-on-error psql | DRAFT + REGRA#8 |

---

## A fechar

| PR | Motivo | Comentário sugerido (NÃO POSTAR) |
|---|---|---|
| #2420 | CONFLICT + rollback destrutivo | "Branch divergiu de main e contém rollback destrutivo. Fechar e recriar com migration aditiva se necessário." |

---

## Clusters identificados

**Cluster dependabot codeql:** #2590, #2591, #2593 — mesmo arquivo `.github/workflows/codeql.yml`, linhas diferentes → mergeados em sequência sem conflito
**Cluster dependabot outros:** #2587 (zustand), #2588 (react-day-picker), #2592 (stale), #2594 (setup-node) — isolados
**Cluster análise-prs:** #2572 (claude_05), #2600 (esta sessão) — documentação
**Cluster migrations:** #2580, #2603 — ambos REGRA#8 + DRAFT
**Cluster CI fix:** #2597, #2604 — REGRA#8 + DRAFT

---

## Tabela completa de PRs (base `c86a3812ce`, rev40)

| PR | Branch | Head SHA | merge-tree | CI Gate Final | Veredito |
|---|---|---|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | c10816b95 | CONFLICT | N/A | FECHAR |
| #2572 | claude_05/youthful-ride-vcdchy | c653bef92 | CONFLICT | N/A | BLOQUEADA |
| #2579 | release-please--...--gifts-store | 0fcb493e8 | CLEAN | SEM_RUNS | DECISAO_HUMANA |
| #2580 | claude/fix-e23-rollback-261025-2145 | 41198d9a33 | CLEAN | FAILURE | DECISAO_HUMANA |
| #2587 | dependabot/...zustand-5.0.16 | 0a091fc84 | CLEAN | SUCCESS (base antiga) | DECISAO_HUMANA |
| #2588 | dependabot/...react-day-picker-10.0.2 | 0c1f7dc38 | CLEAN | FAILURE | DECISAO_HUMANA |
| #2590 | dependabot/...upload-sarif-4.39.1 | 7335fed01 | CLEAN | SUCCESS | **MERGEADO** `c6e94d3a6c` |
| #2591 | dependabot/...analyze-4.39.1 | a3f6e6184 | CLEAN | SUCCESS | **MERGEADO** `c612d2b7c1` |
| #2592 | dependabot/...stale-11.0.0 | 9fde33563 | CLEAN | SUCCESS | **MERGEADO** `388254cddd` |
| #2593 | dependabot/...init-4.39.1 | af2deefa6 | CLEAN | SUCCESS | **MERGEADO** `9182c0a57b` |
| #2594 | dependabot/...setup-node-7 | 0e62124ca | CLEAN | SUCCESS | BLOQUEADA (R15) |
| #2597 | claude_04/beautiful-gates-bvocz5 | 1a8cb75d8 | CLEAN | SUCCESS | DECISAO_HUMANA |
| #2600 | claude_04/optimistic-bohr-qplx94 | HEAD | CLEAN | N/A | DECISAO_HUMANA |
| #2603 | claude_04/tender-hawking-ghw2zi | ab1ea3b31 | CLEAN | FAILURE | DECISAO_HUMANA |
| #2604 | claude_04/charming-darwin-g1nvj2 | e33d2fe4a | CLEAN | SUCCESS | DECISAO_HUMANA |
| #2605 | claude/fix-unit-tests-261027-0113 | 9bfead141 | CLEAN | SUCCESS | DECISAO_HUMANA |
| #2610 | claude/fix-personalization-e2e-auth | 2a7b451919 | CLEAN | SUCCESS | **MERGEADO** `48899b659ef6` |
| #2612 | claude/fix-replenishment-timeout | 32804a149 | CLEAN | N/A | BLOQUEADA |

---

## NÃO VERIFICADO

- CI do main após merges #2590–#2593: aguardando run do Gate Final em `9182c0a57b`
- CI pré-merge de #2590–#2593 foi verificado antes do baseline c86a381 (SUCCESS), não após merge em sequência

---

## Vitest baseline por nome

| Suite | c86a3812ce |
|---|---|
| chunk-recovery (8 testes) | 8 PASSED |
| replenishment-resilience (3 testes) | 3 PASSED |
| PromoFlixPlayer (22 testes) | 22 PASSED |
| NegotiationMarkupCard (23 testes) | 23 PASSED |
| **Total** | **56 PASSED** |

---

## Arquivos de evidência

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/regras-de-negocio.md` | Regras de negócio com fontes (CLAUDE.md, incidentes) |
| `analise-prs/prs.json` | Array JSON das 18 PRs com todos os campos |
| `analise-prs/prs.csv` | Tabela CSV das 18 PRs |
| `analise-prs/progresso.json` | Estado rev40 — SHAs, contagens, baseline |
| `analise-prs/baseline/baseline-c86a381.txt` | Baseline SHA c86a3812ce — TypeCheck, Lint, 56 Vitest |
| `analise-prs/baseline/baseline-48899b6.txt` | Baseline SHA 48899b659ef6 (post-#2610) |
| `analise-prs/dossies/PR-{2420..2612}.md` | Dossier individual de cada uma das 18 PRs |
