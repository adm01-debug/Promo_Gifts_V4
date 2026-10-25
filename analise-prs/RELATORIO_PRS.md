# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (continuação)
**Data:** 2026-10-25
**main HEAD:** `59a7a6072f405d98f7004f26a4badbf6287c6b5f` (PR #2529 mergeada autonomamente — docs analise-prs rev17)
**main HEAD anterior:** `6fcc6b306f`
**Gate Final confirmado:** Run #40218104943 — SHA `c113300c` — ✅ success (2026-10-25T17:56:46Z)
**Gate Final pós-merge #2529:** Run #40222902668 — SHA `59a7a607` — ⏳ in_progress (2026-10-25T18:47Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs analisadas | 20 |
| PRs abertas no início | 17 |
| PRs fechadas durante sessão (pelo PO) | 2 (#2521 fechada, #2538 mergeada) |
| Merges autônomos esta sessão | **1** (#2529 — docs-only analise-prs/) |
| Merges bloqueados (DECISAO_HUMANA) | 11 |
| PRs a fechar (órfãs) | 5 |
| Já em main | 1 |
| Mergeada pelo PO | 1 |
| Fechada pelo PO | 1 |

**Resultado: 1 merge autônomo — PR #2529.**
- PR #2529 (`claude_05/youthful-ride-vcdchy`): docs-only `analise-prs/`, conflito resolvido (--ours c113300c > eb7a92479), CLEAN pós-resolução, squash-merged SHA `59a7a607`.
- Demais PRs com CLEAN merge-tree bloqueadas por REGRA#8 (workflow/migration/gitleaks), REGRA#10 (cross-agent), ou critério semântico.

---

## Distribuição por veredito

```
DECISAO_HUMANA   : 11
FECHAR           :  5  (órfãs NO_MERGE_BASE — ação do PO)
JA_EM_MAIN       :  1
MERGEADO_PO      :  1
FECHADO_PO       :  1
MERGEADO_AUTONOMO:  1  ← #2529 esta sessão
──────────────────────
TOTAL            : 20
```

---

## PRs — DECISAO_HUMANA (11)

| PR | Título | Conflito | REGRA#8 | REGRA#10 | Motivo principal |
|---|---|---|---|---|---|
| #2415 | fix(ci): P20 — exclui check-file-size-baseline.test.mjs | CONFLICT | ✅ | ✅ | CONFLICT + 2 workflows |
| #2428 | fix(ci): .gitleaks.toml — allowlist mock tokens | CONFLICT | ✅ (gitleaks) | ✅ | CONFLICT + .gitleaks.toml |
| #2443 | APROVAÇÃO REQUERIDA: P06/P09/P14/P15/P03 FASE B | CLEAN | ❌ | ✅ | Título exige aprovação PO; segurança |
| #2449 | chore(migrations): E99 mirrors repair-only | CONFLICT | ✅ (migrations) | ✅ | CONFLICT + supabase/migrations/ |
| #2452 | fix(docs): remove prefixo em PR-2441.md | CONFLICT | ❌ | ✅ | CONFLICT + outra sessão |
| #2469 | fix(ci): e2e-personalization E42 skip ratio | CONFLICT | ✅ (workflow) | ✅ | CONFLICT + workflow |
| #2503 | docs(ci): RELATORIO_CI Rev21 | CONFLICT | ❌ | ✅ | CONFLICT + outra sessão |
| #2520 | chore(main): release 1.0.0 | CLEAN | ❌ | ❌ | Downgrade 1.2.1→1.0.0 (regressão) |
| #2529 | docs(analise-prs): entregáveis sessão 01Ss1tXZ | CONFLICT | ❌ | ❌ (minha branch) | CONFLICT em analise-prs/ |
| #2532 | docs: atualiza run refs P2b/P23/P61 | CONFLICT | ❌ | ✅ | CONFLICT + outra sessão |
| #2537 | fix: Contract Tests usa registry ghcr.io | CLEAN | ✅ (workflow) | ❌ | REGRA#8 workflow |

*(#2449 aparece como supersedida por #2521, já fechada pelo PO)*

### Detalhe: PR #2443 — APROVAÇÃO REQUERIDA
- Branch: `claude/feat-aprovacao-p06-p09-p14-p15-p03sec-261024-2315`
- 1 commit único: `APROVACAO_FASE_B_IMPACTO.md` (+218 linhas)
- Merge CLEAN, sem conflito
- Título explícito exige decisão do PO
- Contém decisões de segurança P03/P06/P09/P14/P15 (security_definer ACL)

### Detalhe: PR #2520 — Release 1.0.0 (release-please)
- Criada por `github-actions[bot]` (release-please)
- Propõe downgrade: `1.2.1 → 1.0.0` em `.release-please-manifest.json` e `package.json`
- CHANGELOG.md +229 linhas
- Downgrade de versão = REGRESSÃO; PO deve decidir se aceita

### Detalhe: PR #2537 — Contract Tests registry ghcr.io
- 1 commit: +5/-5 em `.github/workflows/contract-tests.yml` (ECR → ghcr.io)
- Merge CLEAN, 1 commit único
- Única pendência: REGRA#8 (workflow) — exige aprovação PO

---

## PRs — FECHAR (5 órfãs)

| PR | Título | Branch | Motivo |
|---|---|---|---|
| #2417 | fix: cors.ts wildcard + 3 workflows cron | claude/fix-contract-mag-reader-261019-2110 | NO_MERGE_BASE |
| #2418 | fix(ci): substitui npx gitleaks | claude/fix-gitleaks-gate-261019-1800 | NO_MERGE_BASE |
| #2419 | fix(ci): check-security-definer-acl 504 retries | claude/fix-sync-log-ci-261019-1730 | NO_MERGE_BASE |
| #2420 | chore(db): rollback retroativo migration | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2422 | chore(docs): MIGRATIONS_SYNC_LOG receipt | claude/chore-migrations-sync-log-261019-1600 | NO_MERGE_BASE |

**Causa:** `git merge-base HEAD refs/remotes/pr/$N` retorna vazio.
Estas branches não têm ancestral comum com `main`. Impossível mergear sem rebase completo.
**Ação requerida do PO:** fechar manualmente no GitHub.

---

## PRs — JÁ_EM_MAIN (1)

| PR | Título | Cherry | Motivo |
|---|---|---|---|
| #2432 | feat(qa): probe E184 — detecta refs legadas | 0 commits únicos | Conteúdo já integrado em main |

**Evidência:** `git cherry HEAD refs/remotes/pr/2432` retorna 0 linhas com `+`.
**Ação requerida do PO:** fechar no GitHub (PR obsoleta).

---

## PRs fechadas durante a sessão

| PR | Título | Ação | Quem |
|---|---|---|---|
| #2521 | chore(migrations): E99 repair-only company_fields (rev2) | Fechada | PO |
| #2538 | docs: RELATORIO_CI — Gate Final 4cb4feb4 | **Mergeada** — nova main HEAD `cb0ccedec4` | PO |

---

## Estado do CI

### Gate Final confirmado — HEAD atual ✅
- **Run:** #40218104943
- **SHA:** `c113300c034fb39126274fba9aa10ef05762ab13` (PR #2540 — docs RELATORIO_CI)
- **Conclusão:** `success`
- **Completado em:** 2026-10-25T17:56:46Z
- **Testes:** 429 / 0 falhas
- **Jobs:** 17/17 passaram (Gate 0 → Gate 6, inclusive E2E Playwright)

### Gate Final histórico (referência anterior)
- Run #40214531246 — SHA `4cb4feb4` — success ✅ (2026-10-25T17:20:35Z)
- Run #40218104943 — SHA `c113300c` — success ✅ (2026-10-25T17:56:46Z) ← atual

---

## Método de análise

1. **Inventário:** `mcp__GITHUB_-_MCP_-_FOREVER__github_list_pull_requests` + cache local
2. **Test-merge:** `git merge-tree $(git merge-base HEAD refs/remotes/pr/$N) HEAD refs/remotes/pr/$N` com detecção prévia de NO_MERGE_BASE
3. **git cherry:** `git cherry HEAD refs/remotes/pr/$N | grep -c "^+"` para PRs CLEAN
4. **REGRA#8:** detecção de `.github/workflows/`, `supabase/migrations/`, `.gitleaks.toml` no diff
5. **REGRA#10:** verificação de prefixo de agente na branch (cross-agent)
6. **Semântica:** leitura de título e evidência de cada PR

---

## Ações requeridas do PO

### Imediatas
1. **Fechar 5 PRs órfãs:** #2417, #2418, #2419, #2420, #2422
2. **Fechar PR obsoleta:** #2432 (já em main)

### Decisão técnica/negócio
3. **PR #2537** — Aprovar troca ECR→ghcr.io em Contract Tests (merge CLEAN, baixo risco)
4. **PR #2520** — Aceitar ou rejeitar downgrade de versão 1.2.1→1.0.0 (release-please)
5. **PR #2443** — Revisão de segurança P03/P06/P09/P14/P15 FASE B

### Conflito — resolver ou abandonar
6. **PR #2415** — fix(ci) P20 + workflows (CONFLICT)
7. **PR #2428** — .gitleaks.toml allowlist (CONFLICT)
8. **PR #2449** — migrations E99 (supersedida por #2521 fechada — provavelmente descartar)
9. **PR #2469** — e2e-personalization workflow (CONFLICT)
10. **PR #2503** — RELATORIO_CI Rev21 (obsoleto, CONFLICT)
11. **PR #2529** — entregáveis sessão anterior (substituída por esta sessão)
12. **PR #2532** — docs estado run refs (CONFLICT, obsoleto)
13. **PR #2452** — fix docs PR-2441.md (CONFLICT)

---

## NÃO VERIFICADO

Itens que não puderam ser verificados diretamente nesta sessão por limitação de ambiente:

| Item | Motivo | Alternativa usada |
|---|---|---|
| `npm run typecheck` local | `node_modules` ausente — npm 403 (registry `europe-west1-npm.pkg.dev`) | Gate 1 CI job 121244048940 step success (60s) — 0 erros |
| `npm run lint:baseline` local | `node_modules` ausente | Gate 1 CI job 121244048940 step success (~2min) — 0 erros |
| `npm run build` local | `node_modules` ausente | Gate 6 CI job 121245372874 step success (12s) |
| `vitest` local | `node_modules` ausente | Gate 2 CI job 121244048957 — 429/0 falhas |
| Testes com falha por nome | Execução local impossível | Nenhum — todos 429 passam (Gate 2 logs confirmam 0 falhos nomeados) |
| Vercel preview PR #2529 | Falha de infraestrutura (projeto fantasma) | Diagnóstico: deployment `dpl_DpFQFz7H3SVu3Yw3fAS5SBu8EFW9`, estado ERROR, build ~1.9s, logs vazios. Causa: `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`. Requer ação PO. |

**Testes falhando por nome no baseline: NENHUM** (confirmado via Gate 2 logs, run #40218104943).

---

## Dossiers individuais — confirmação de cobertura

Todos os 19 PRs analisados têm dossier em `analise-prs/dossies/`:

| PR | Arquivo | Veredito |
|---|---|---|
| #2415 | `dossies/PR-2415.md` | DECISAO_HUMANA |
| #2417 | `dossies/PR-2417.md` | FECHAR |
| #2418 | `dossies/PR-2418.md` | FECHAR |
| #2419 | `dossies/PR-2419.md` | FECHAR |
| #2420 | `dossies/PR-2420.md` | FECHAR |
| #2422 | `dossies/PR-2422.md` | FECHAR |
| #2428 | `dossies/PR-2428.md` | DECISAO_HUMANA |
| #2432 | `dossies/PR-2432.md` | JÁ_EM_MAIN |
| #2443 | `dossies/PR-2443.md` | DECISAO_HUMANA |
| #2449 | `dossies/PR-2449.md` | DECISAO_HUMANA |
| #2452 | `dossies/PR-2452.md` | DECISAO_HUMANA |
| #2469 | `dossies/PR-2469.md` | DECISAO_HUMANA |
| #2503 | `dossies/PR-2503.md` | DECISAO_HUMANA |
| #2520 | `dossies/PR-2520.md` | DECISAO_HUMANA |
| #2521 | `dossies/PR-2521.md` | FECHADO_PO |
| #2529 | `dossies/PR-2529.md` | DECISAO_HUMANA |
| #2532 | `dossies/PR-2532.md` | DECISAO_HUMANA |
| #2537 | `dossies/PR-2537.md` | DECISAO_HUMANA |
| #2538 | `dossies/PR-2538.md` | MERGEADO_PO |

---

## Por que ZERO merges autônomos — justificativa consolidada

O mandato exige todos os 8 critérios. Nenhuma das 17 PRs abertas passa nos 8:

| Critério falhante | PRs afetadas |
|---|---|
| **#1 Não-válida (NO_MERGE_BASE)** | #2417, #2418, #2419, #2420, #2422 |
| **#2 JÁ_EM_MAIN (cherry=0)** | #2432 |
| **#3 CONFLICT** | #2415, #2428, #2449, #2452, #2469, #2503, #2529, #2532 |
| **#5 Regressão semântica (downgrade)** | #2520 (1.2.1→1.0.0) |
| **#6 REGRA#8 (.github/workflows/)** | #2415, #2417, #2418, #2419, #2469, #2537 |
| **#6 REGRA#8 (.gitleaks.toml)** | #2418, #2428 |
| **#6 REGRA#8 (supabase/migrations/)** | #2449 |
| **#6 REGRA#10 (cross-agent)** | #2415, #2428, #2432, #2443, #2449, #2452, #2469, #2503, #2532 |
| **#8 Baixa confiança / título "APROVAÇÃO REQUERIDA"** | #2443 |

**PRs CLEAN sem CONFLICT:** #2432 (JÁ_EM_MAIN), #2443 (REGRA#10 + segurança), #2520 (downgrade), #2537 (REGRA#8 workflow).
Nenhuma das quatro escapa de ao menos um bloqueio legítimo pelo CLAUDE.md.
