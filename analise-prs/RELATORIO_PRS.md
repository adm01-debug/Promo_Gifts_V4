# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (continuação)
**Data:** 2026-10-25
**main HEAD:** `c113300c034fb39126274fba9aa10ef05762ab13` (PR #2540 mergeada pelo PO — docs RELATORIO_CI)
**main HEAD anterior:** `cb0ccedec41c38fe79cbd2585216e4cbe3155ccd`
**Gate Final confirmado:** Run #40218104943 — SHA `c113300c` — ✅ success (2026-10-25T17:56:46Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs analisadas | 19 |
| PRs abertas no início | 17 |
| PRs fechadas durante sessão (pelo PO) | 2 (#2521 fechada, #2538 mergeada) |
| Merges autônomos esta sessão | **0** |
| Merges bloqueados (DECISAO_HUMANA) | 12 |
| PRs a fechar (órfãs) | 5 |
| Já em main | 1 |
| Mergeada pelo PO | 1 |
| Fechada pelo PO | 1 |

**Resultado: ZERO merges autônomos.**
Todas as PRs com CLEAN merge-tree foram bloqueadas por REGRA#8 (workflow/migration/gitleaks),
REGRA#10 (cross-agent), ou critério semântico (downgrade de versão, título "APROVAÇÃO REQUERIDA",
ou conteúdo já em main).

---

## Distribuição por veredito

```
DECISAO_HUMANA : 12
FECHAR         :  5  (órfãs NO_MERGE_BASE — ação do PO)
JA_EM_MAIN     :  1
MERGEADO_PO    :  1
FECHADO_PO     :  1
─────────────────────
TOTAL          : 20
```

---

## PRs — DECISAO_HUMANA (12)

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
