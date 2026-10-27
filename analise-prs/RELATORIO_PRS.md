# RELATORIO_PRS.md — Análise Exaustiva de PRs Abertas
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (fork f0ceb220)
**Rev:** 84
**Data:** 2026-10-27T19:30Z (Gate Final 2fafe8ed confirmado SUCCESS — run 40563196038)
**Branch de entrega:** `claude_04/optimistic-bohr-qplx94` (PR #2600 — NUNCA MERGEAR)

---

## ⚠️ RISCOS E DECISÕES HUMANAS PENDENTES

**6 PRs exigem decisão do PO antes de qualquer ação:**

| PR | Título resumido | Risco principal |
|---|---|---|
| #2420 | DRAFT: Edge func + migrations + RLS | DDL em produção — REGRA#8 |
| #2579 | chore(main): release 1.0.0 | Release-please: downgrade de versão + `blocked` vs main |
| #2580 | DRAFT: rollback header + migration 20260916 | Rollback de migration em produção — REGRA#8 |
| #2588 | bump react-day-picker 8.10.2 → 10.0.2 | Breaking API v8→v10 (major bump) |
| #2622 | DRAFT: migration + RLS | DDL em produção — REGRA#8 |
| #2646 | DRAFT: migration | DDL em produção — REGRA#8 |

---

## ⚠️ NÃO VERIFICADO (verificação impossível nesta sessão)

- **Produção `doufsxqlfjyuvxuezpln`:** ERR_PROXY_TUNNEL durante toda a sessão. Nenhum acesso ao Supabase MCP (mcp.supabase.com). Todas as afirmações sobre estado de produção são baseadas em evidências indiretas (CI, logs de PR).
- **Deploy Lovable:** merge no main = redeploy automático via Lovable. Estado do deploy não verificável nesta sessão (ERR_PROXY_TUNNEL).

## ✅ GATE FINAL — main HEAD `2fafe8ed` (SUCCESS confirmado)

Gate Final no SHA `2fafe8edfaa246221a4b427d5728512ba9ff199e` — **CONFIRMADO SUCCESS**.
Run `40563196038`, started 2026-10-27T18:47:16Z, completed 2026-10-27T18:54:40Z.

- **Gate 0.5 (qs advisory):** ✅ RESOLVIDO via PR #2656 mergeada 2026-10-27T18:04Z (SHA `ac0fe476`)
- **Gate Final em `ac0fe476`** (PR #2656 — qs fix): SUCCESS ✅ (Gate 0.5 resolvido)
- **Gate Final em `2fafe8ed`** (PR #2658 — integration tests): ✅ **SUCCESS** (run 40563196038, 2026-10-27T18:54:40Z)

---

## RESUMO EXECUTIVO

**Total PRs analisadas nesta sessão: 16**
- 12 PRs abertas ao final da análise
- 4 PRs mergeadas durante a sessão por outra sessão (session_01Knr9enFAok62bHihBK1UUP)

**Contagem por veredito:**

| Veredito | Count | PRs |
|---|---|---|
| MERGEADA_SESSAO_EXTERNA | 4 | #2654, #2655, #2656, #2658 |
| DECISAO_PO | 6 | #2420, #2579, #2580, #2588, #2622, #2646 |
| BLOQUEADA/SUPERSEDED | 4 | #2572, #2605, #2645, #2653 |
| DRAFT_NOMERGE | 1 | #2631 |
| NUNCA_MERGEAR | 1 | #2600 (delivery branch) |

**Merges autônomos por esta sessão: 0**
*(Nenhuma PR atingiu os 8 critérios simultâneos: ou era DRAFT, ou supabase/migrations REGRA#8, ou conflito+REGRA#10, ou superseded. PRs #2654, #2655, #2656 e #2658 foram mergeadas por session_01Knr9enFAok62bHihBK1UUP independentemente.)*

---

## MAIN HEAD — EVOLUÇÃO

| SHA | Origem | Gate Final |
|---|---|---|
| `16ad57c66e` | PR #2587 (zustand bump) — baseline | SUCCESS (run 122342656953, 17:08:33Z) |
| `4c7ecb260d` | PR #2654 (CORS gate) | SUCCESS (run 40549508170, 17:26:23Z) ✅ |
| `a0560fdc62` | PR #2655 (pendingDeploy) | FAILURE ❌ Gate 0.5 qs advisory (run 40551464429, 17:42:15Z) |
| `ac0fe476` | PR #2656 (qs allowlist) — Gate 0.5 fix | SUCCESS ✅ (qs advisory resolvido) |
| `2fafe8ed` | PR #2658 (integration tests timeout) — HEAD atual | ✅ SUCCESS (run 40563196038, 18:54:40Z) |

---

## CLUSTER 1 — MERGEADAS EXTERNAMENTE

### PR #2654 — fix(ci): xbz-image-uploader → SERVER_ONLY_ALLOWLIST (CORS gate)
- **Branch:** `claude/fix-cors-allowlist-xbz-image-uploader-261027-1700`
- **Sessão autora:** session_01Knr9enFAok62bHihBK1UUP
- **merged_at:** 2026-10-27T17:19:34Z
- **merge_commit_sha:** `4c7ecb260da691b5cd436700380b818d0d936961`
- **Gate Final:** SUCCESS ✅ (run 40549508170, 17:26:23Z)
- **Produção:** NÃO VERIFICADO (ERR_PROXY_TUNNEL)
- **Veredito:** MERGEADA_SESSAO_EXTERNA

### PR #2655 — fix(tests): xbz-image-uploader descriptor pendingDeploy=true
- **Branch:** `claude/fix-edge-integration-tests-261027-1730`
- **Sessão autora:** session_01Knr9enFAok62bHihBK1UUP
- **merged_at:** 2026-10-27T17:31:48Z
- **merge_commit_sha:** `a0560fdc62744c6bf4ba182914cc76dec06aecb1`
- **Gate Final:** ❌ FAILURE (run 40551464429, 17:42:15Z) — Gate 0.5 qs advisory (não causado por #2655)
- **Produção:** NÃO VERIFICADO (ERR_PROXY_TUNNEL)
- **Veredito:** MERGEADA_SESSAO_EXTERNA

### PR #2656 — fix(ci): adiciona qs ao allowlist do gate de dependências (GHSA-6pq8-jhm2-2vcw)
- **Branch:** `claude/fix-dep-audit-qs-261027-1748`
- **Sessão autora:** session_01Knr9enFAok62bHihBK1UUP
- **merged_at:** 2026-10-27T18:04Z
- **merge_commit_sha:** `ac0fe4760792a9d0526d6ea6f014ca2a58da8ddb`
- **Gate Final:** SUCCESS ✅ (Gate 0.5 qs advisory resolvido)
- **Impacto:** Restaurou Gate Final após FAILURE em `a0560fdc62`
- **Produção:** NÃO VERIFICADO (ERR_PROXY_TUNNEL)
- **Veredito:** MERGEADA_SESSAO_EXTERNA

### PR #2658 — fix(test): tolera timeout de waitFor nos integration tests de reposição
- **Sessão autora:** session_01Knr9enFAok62bHihBK1UUP
- **merged_at:** 2026-10-27T18:47Z
- **merge_commit_sha:** `2fafe8edfaa246221a4b427d5728512ba9ff199e` (= novo main HEAD)
- **Gate Final:** ✅ SUCCESS (run 40563196038, 2026-10-27T18:54:40Z)
- **Produção:** NÃO VERIFICADO (ERR_PROXY_TUNNEL)
- **Veredito:** MERGEADA_SESSAO_EXTERNA

---

## CLUSTER 2 — DECISÃO DO PO OBRIGATÓRIA

### PR #2420 — DRAFT: edge function + migrations + RLS
- **Estado:** DRAFT, `mergeable_state: "unknown"`
- **Bloqueadores:** DRAFT + supabase/migrations/ + REGRA#8 (DDL em produção)
- **Veredito:** DECISAO_PO

### PR #2579 — chore(main): release 1.0.0 (release-please)
- **Estado:** open, `mergeable_state: "blocked"` (desatualizada vs main)
- **Bloqueadores:** release-please; risco de downgrade de versão 1.2.1→1.0.0; `blocked` vs main
- **Veredito:** DECISAO_PO

### PR #2580 — fix(banco): rollback header e arquivo rollback migration 20260916
- **Estado:** DRAFT, `mergeable_state: "behind"`, supabase/migrations/ + supabase/rollbacks/
- **Bloqueadores:** DRAFT + REGRA#8 (rollback de migration em produção)
- **Veredito:** DECISAO_PO

### PR #2588 — chore(deps): bump react-day-picker 8.10.2 → 10.0.2
- **Estado:** open, `mergeable_state: "behind"`
- **Bloqueadores:** breaking API major bump (v8→v10 — componentes precisam migrar)
- **Veredito:** DECISAO_PO

### PR #2622 — DRAFT: migration + RLS (policies)
- **Estado:** DRAFT, `mergeable_state: "unknown"`, supabase/migrations/
- **Bloqueadores:** DRAFT + REGRA#8 (DDL em produção + RLS)
- **Veredito:** DECISAO_PO

### PR #2646 — DRAFT: migration
- **Estado:** open, `mergeable_state: "behind"`, supabase/migrations/
- **Bloqueadores:** REGRA#8 (DDL em produção) + REGRA#10 (branch de session_01PE8GzVYqxJM25xzvLuLYhW)
- **Veredito:** DECISAO_PO

---

## CLUSTER 3 — BLOQUEADAS / SUPERSEDED

### PR #2572 — docs/ci/feature: outra sessão, branch com conflito
- **Estado:** open, `mergeable_state: "dirty"` — conflito
- **Bloqueadores:** REGRA#10 (branch de outra sessão — somente leitura); conflito ativo
- **Veredito:** BLOQUEADA

### PR #2605 — docs/config: conteúdo superseded por #2620
- **Estado:** open, `mergeable_state: "dirty"` — conflito
- **Bloqueadores:** conteúdo já em main via #2620; conflito; REGRA#10
- **Veredito:** BLOQUEADA/SUPERSEDED

### PR #2645 — docs: recibo E15 20261027140000 — conflito ADD/ADD
- **Estado:** open, `mergeable_state: "dirty"` — conflito em `supabase/MIGRATIONS_SYNC_LOG.md`
- **Bloqueadores:** conteúdo já em main via #2652; conflito; REGRA#10 (sessão session_01PE8GzVYqxJM25xzvLuLYhW)
- **Ação PO:** FECHAR manualmente
- **Veredito:** BLOQUEADA/SUPERSEDED

### PR #2653 — docs(analise-prs): inventário 17 PRs — outra sessão, conflito
- **Estado:** open, `mergeable_state: "dirty"` — conflito
- **Bloqueadores:** REGRA#10 (branch `claude/quirky-keller-owezvt` de session_012WyySbh2tj8vhRQLBf3mHo); conteúdo superseded pela análise desta sessão (48 PRs)
- **Ação PO:** FECHAR manualmente
- **Veredito:** BLOQUEADA

---

## CLUSTER 4 — DRAFT SEM MERGE (não conflitantes, mas não prontos)

### PR #2631 — chore: atualiza PENDENCIAS §4 e RELATORIO_CI
- **Estado:** DRAFT, `mergeable_state: "unknown"`
- **Bloqueadores:** DRAFT + REGRA#10 (branch de session_014RkohRYagi3sPiL8jtgot4)
- **Conteúdo:** apenas docs — válido quando removido DRAFT
- **Veredito:** DRAFT_NOMERGE

---

## CLUSTER 5 — NUNCA MERGEAR

### PR #2600 — docs(analise-prs): entrega desta sessão
- **Branch:** `claude_04/optimistic-bohr-qplx94`
- **Estado:** DRAFT — esta é a PR de entrega desta sessão
- **Regra:** NUNCA MERGEAR — é o container dos artefatos de análise
- **Veredito:** NUNCA_MERGEAR

---

## BASELINE DE CI

- **SHA baseline:** `16ad57c66e` (antes desta sessão)
- **Gate Final baseline:** SUCCESS (run 122342656953, 2026-10-27T17:08:33Z)
- **ESLint:** 0 erros novos confirmado por CI (execução local timeout >60s)
- **TypeScript:** TSC exit:0 (confirmado por Gate 1 success no baseline)
- **Falhas pré-existentes (não desta sessão):** `check`, `Supabase Preview`, `audit`, `Verify push to main matches accepted patterns`

---

## ARQUIVOS DE EVIDÊNCIA

```
analise-prs/
├── RELATORIO_PRS.md           (este arquivo — rev84)
├── baseline/
│   ├── eslint-count.txt       (baseline ESLint via CI)
│   ├── typecheck-errors.txt   (baseline TSC exit:0)
│   └── failing-tests-by-name.txt  (falhas pré-existentes)
├── dossies/
│   ├── PR-2420.md
│   ├── PR-2572.md
│   ├── PR-2579.md
│   ├── PR-2580.md
│   ├── PR-2588.md
│   ├── PR-2600.md
│   ├── PR-2605.md
│   ├── PR-2622.md
│   ├── PR-2631.md
│   ├── PR-2645.md
│   ├── PR-2646.md
│   ├── PR-2653.md
│   ├── PR-2654.md             (MERGEADA_SESSAO_EXTERNA)
│   ├── PR-2655.md             (MERGEADA_SESSAO_EXTERNA)
│   ├── PR-2656.md             (atualizado: MERGEADA_SESSAO_EXTERNA — Gate 0.5 fix)
│   └── PR-2658.md             (atualizado rev84: Gate Final SUCCESS confirmado)
└── prs.csv  (prs.json: não atualizado nesta revisão — requer rebuild)
```

---

## META CUMPRIDA

- **Total PRs analisadas nesta sessão:** 16 (12 open ao final + 4 mergeadas durante a sessão)
- **PRs open ao final:** 12 (#2420, #2572, #2579, #2580, #2588, #2600, #2605, #2622, #2631, #2645, #2646, #2653)
- **Total = analisadas:** 16 = 16 ✅
- **Merges autônomos por esta sessão:** 0
- **Merges externos durante a sessão:**
  - PR #2654 → SHA `4c7ecb260d` — Gate Final SUCCESS ✅
  - PR #2655 → SHA `a0560fdc62` — Gate Final ❌ FAILURE (Gate 0.5 qs advisory — não causado por #2655)
  - PR #2656 → SHA `ac0fe476` — Gate Final SUCCESS ✅ (Gate 0.5 resolvido)
  - PR #2658 → SHA `2fafe8ed` — Gate Final ✅ **SUCCESS** (run 40563196038, 18:54:40Z)
- **PRs bloqueadas por REGRA#10 (conflito em branch de outra sessão):** #2572, #2605, #2645, #2653 — escrita proibida
- **Gate Final main HEAD atual (`2fafe8ed`):** ✅ **SUCCESS** (run 40563196038, 2026-10-27T18:54:40Z)
- **Outras escritas no GitHub:** nenhuma (além do push ao delivery branch)
- **Worktrees:** nenhum worktree criado nesta sessão
- **Produção:** NÃO VERIFICADO (ERR_PROXY_TUNNEL toda a sessão)
