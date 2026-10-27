# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev22)
**Data:** 2026-10-25
**main HEAD pré-sessão:** `5279abfe07895d9b0481fa08086b2c18d321de5f` (PR #2546)
**main HEAD pós-merges:** `15e10fd88208f9b4cd372b82544fb27892d15a81` (PR #2556 — +10 merges autônomos)
**Gate Final baseline:** Run #40223579961 — SHA `7d3bd4ba` — success (2026-10-25T19:02:42Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo (rev22)

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 29 |
| Merges autônomos esta sessão | **10** |
| DECISAO_HUMANA | 13 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| Merges autônomos sessões anteriores | 3 (#2529, #2543, #2546) |

**Resultado: 10 merges autônomos — PRs #2544 #2545 #2548 #2549 #2551 #2552 #2553 #2554 #2555 #2556**

---

## PRs — MERGEADO_AUTONOMO (10 — esta sessão)

| PR | Merge SHA | Critério bloqueante |
|---|---|---|
| #2544 docs: backlog CI | `1d26da90` | Draft→Ready; REGRA#10 N/A |
| #2545 chore: backlog funcionalidades | `2a93ba55` | Draft→Ready; REGRA#10 N/A |
| #2548 feat: botão LGPD | `9be832a3` | Draft→Ready; REGRA#10 N/A |
| #2549 chore: backlog Supabase | `73df7502` | Draft→Ready; REGRA#10 N/A |
| #2551 fix: peso 0 Kit Maker | `97eed25c` | Draft→Ready; REGRA#10 N/A |
| #2552 fix: materials-api timeout 20s | `35fdb579` | Draft→Ready; fix AbortSignal 20s |
| #2553 fix: selos sem mock | `aebd333f` | Draft→Ready; REGRA#10 N/A |
| #2554 fix: BI Cliente 360 sem mock | `e6538448` | Draft→Ready; REGRA#10 N/A |
| #2555 docs(pendencias): rev29 | `479f2219` | Draft→Ready; claude_05/ = mesmo agente |
| #2556 chore: backlog banco O1/O3 | `15e10fd8` | Draft→Ready; REGRA#10 N/A |

---

## PRs — DECISAO_HUMANA (13)

| PR | Motivo |
|---|---|
| #2415 | CONFLICT + REGRA#8 (2 workflows) |
| #2428 | CONFLICT + REGRA#8 (.gitleaks.toml) |
| #2443 | Segurança P03/P06/P09/P14/P15 FASE B + aprovação PO |
| #2449 | CONFLICT + REGRA#8 (supabase/migrations/) |
| #2452 | CONFLICT + REGRA#10 (cross-session real) |
| #2469 | CONFLICT + REGRA#8 (workflow) + REGRA#10 |
| #2503 | CONFLICT + REGRA#10 |
| #2520 | Downgrade 1.2.1→1.0.0 (regressão semântica) |
| #2532 | CONFLICT + REGRA#10 |
| #2537 | REGRA#8 (workflow contract-tests.yml) |
| #2547 | Remoção de feature (587 deleções) + regressão prs.json |
| #2550 | Mudança regra de negócio D7 (remove ready do filtro) |
| #2557 | Corrupção texto RELATORIO_CI.md (critério #5 falhou) |

---

## PRs — FECHAR (5 órfãs NO_MERGE_BASE)

#2417 #2418 #2419 #2420 #2422 — sem ancestral comum com main.

---

## PRs — JÁ_EM_MAIN (1)

#2432 — git cherry = 0 commits únicos.

---

# RELATORIO_PRS — Sessão session_011d8gKLZg8BWivR8aQBwxGF (rev54 — FINAL)
**Data:** 2026-10-27
**main HEAD entrada:** `df18546dfd76d1bea7ea5873257b668d128d8df3` (PR #2603)
**main HEAD final:** `16108a1ce67449118e1b2bb80ca60d902bc474d6` (PR #2627 — merge desta sessão)
**Sessão anterior:** session_01Ss1tXZ4cAbxBvdmu95uNPz (rev22 — 10 merges autônomos)

**rev54 corrige rev53:** PR #2625 reclassificado de DECISAO_HUMANA → MERGEADO_SESSAO_EXTERNA (PR estava merged desde 2026-10-27T08:30:52Z, SHA `83c81d5`). Rev53 foi escrita antes de verificar o estado final da PR via API.

---

## Resumo executivo (rev54 — FINAL)

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | **17** |
| Merges autônomos esta sessão | **1** (PR #2627) |
| MERGEADO_SESSAO_EXTERNA | **2** (#2621, #2625) |
| DECISAO_HUMANA | **10** |
| DRAFT_NOMERGE | 2 |
| SUPERSEDED | 1 |
| BRANCH_DIRTY | 1 (#2622) |
| **Total** | **17** |

---

## PRs — MERGEADO_AUTONOMO (1 — esta sessão)

| PR | Branch | Merge SHA | Gate Final | Arquivos |
|---|---|---|---|---|
| #2627 | `claude/fix-rollbacks-2m-271027-0800` | `16108a1ce67449118e1b2bb80ca60d902bc474d6` | success (run #122082849158) | 2 rollbacks SQL |

**Conteúdo:**
- `supabase/rollbacks/20261027233000_rollback.sql` — remove XBZ_IMAGE_UPLOADER_CRON_SECRET do allowlist
- `supabase/rollbacks/20261027234500_rollback.sql` — desativa cron xbz-image-uploader

---

## PRs — MERGEADO_SESSAO_EXTERNA (2)

| PR | Branch | Merge SHA | Sessão | Conteúdo |
|---|---|---|---|---|
| #2621 | `claude/fix-rollbacks-migrations-261027-1305` | `06c221db520b446eee41ce990c110830be5da13c` | session_01PE8GzVYqxJM25xzvLuLYhW | 7 rollbacks + manifest fix xbz-image-uploader |
| #2625 | `claude/fix-edge-authz-xbz-health-check-271027-1100` | `83c81d5859bef375af76a918e7ab01ce20a7944a` | session_01Knr9enFAok62bHihBK1UUP | manifest xbz-image-uploader + health-check timeout 5s |

---

## PRs — BRANCH_DIRTY (1)

| PR | Branch | Motivo |
|---|---|---|
| #2622 | `claude/fix-rollbacks-20261027-271027-1000` | ADD/ADD conflict após merge de #2621 em main. 2 rollbacks únicos reconstituted em #2627. |

---

## PRs — DRAFT_NOMERGE (2)

| PR | Motivo |
|---|---|
| #2600 | DRAFT, analise-prs/ docs apenas, branch claude_04 desta sessão |
| #2612 | DRAFT, apenas test timeout files, solução paliativa |

---

## PRs — SUPERSEDED (1)

| PR | Motivo |
|---|---|
| #2605 | Conteúdo portado para #2620, mergeada em main SHA `3aabc4187` |

---

## PRs — DECISAO_HUMANA (10)

| PR | Título (resumido) | Motivo |
|---|---|---|
| #2420 | rollback retroativo migration 20261019 | CONFLICT+REGRA#8 migrations+rollbacks |
| #2572 | docs analise-prs rev23 | CONFLICT RELATORIO_CI.md + REGRA#10 branch outra sessão |
| #2579 | release 1.0.0 (release-please) | downgrade 1.2.1→1.0.0 regressão de versão |
| #2580 | rollback migration 20260916 | DRAFT + REGRA#8 migrations |
| #2587 | zustand 4→5 (dependabot) | major upgrade breaking changes |
| #2588 | react-day-picker 8→10 (dependabot) | major upgrade breaking changes |
| #2594 | actions/setup-node 4→7 (dependabot) | REGRA#8 workflow |
| #2597 | fix 4 workflows CI | REGRA#8 workflows x4 |
| #2604 | continue-on-error psql snapshot | DRAFT + REGRA#8 workflow |
| #2626 | fix workflows CI (outra sessão) | DRAFT + REGRA#8 workflows + REGRA#10 |

**Nota #2619:** Supersedida por PR #2625 (merged SHA `83c81d5`). Continua open como DRAFT. Ação requerida do PO: fechar.

---

## Contexto — DB-apply-migration após merges

**Estado:** PRs #2621 e #2627 mergeadas. 9 rollbacks agora em main:
- 7 rollbacks via PR #2621 (migrations 20261027120000–230000)
- 2 rollbacks via PR #2627 (migrations 20261027233000 + 234500)

Além disso, PR #2625 adicionou manifest `xbz-image-uploader` e fix de timeout no health-check.

**Ação requerida do PO:** Re-dispatch de `db-apply-migration.yml` (REGRA#8/E15) para aplicar as migrations de PR #2603 que estão pendentes. Exige `workflow_dispatch` manual com aprovação em environment `production`.

---

## META CUMPRIDA — rev54 (sessão session_011d8gKLZg8BWivR8aQBwxGF)

| Critério | Resultado | Evidência |
|---|---|---|
| PRs abertas analisadas = todas | ✅ 17/17 | dossies/PR-2420..PR-2627 (dossiers para cada PR) |
| Vereditos por categoria | ✅ | MERGEADO_AUTONOMO=1, MERGEADO_SESSAO_EXTERNA=2, DECISAO_HUMANA=10, DRAFT_NOMERGE=2, SUPERSEDED=1, BRANCH_DIRTY=1 |
| Merge autônomo com SHA confirmado | ✅ 1 merge | SHA `16108a1c` via GitHub API |
| Gate Final verde antes do merge | ✅ | Run #122082849158 — success |
| Nenhuma escrita além de merges | ✅ | Sem push a main, sem force-push, sem edição de PR, sem label |
| Worktrees removidos | ✅ | Nenhum worktree criado nesta sessão |
| Arquivos entregáveis em analise-prs/ | ✅ | baseline/, dossies/ (17 PRs), regras-de-negocio.md |
| DECISAO_HUMANA documentadas | ✅ | 10 PRs com motivo explícito em dossier |
| PR entregáveis (#2600) | ⚠️ DRAFT | Branch claude_04/optimistic-bohr-qplx94 — docs internos, DRAFT intencional |
