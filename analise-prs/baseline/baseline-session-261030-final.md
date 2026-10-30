# Baseline — Sessão 2026-10-30 (sessão_01RfQzo8Ean3zudG2sEN79b6)

**Data:** 2026-10-30  
**Branch this session:** `claude/chore-analise-prs-261030-1600`  
**Main HEAD ao iniciar análise:** `b92bcf876ef2fe28999d28778efaa9fa30e4064c`

---

## Estado do CI em main

### Gate Final (único required check)

| Commit | Run | Resultado |
|---|---|---|
| `cba9944d` (antecessor) | #41067473692 | ✅ SUCCESS (15 jobs, 2 skipped) |
| `b92bcf876` (main atual) | #41088401807 | `queued` (runner backlog — commit docs-only, paths-ignore ativo) |

**Conclusão:** Gate Final verde no antecessor `cba9944d`. Commit `b92bcf876` é docs-only (PENDENCIAS.md/RELATORIO_CI.md) → `paths-ignore: docs/**` ativo → gates 1/2/3 skipped normalmente.

---

## Workflows falhando em main (não-required) — P31

11 workflows com falha no HEAD `b92bcf876`, TODOS não-required:

1. **Branch Protection Sentinel** — push Lovable sem formato `(#NNN)`
2. **Uptime Monitor** — health-check exit 22, edge function desatualizada
3. **E2E Critical Flows** — `sidebar-tooltips.spec.ts` 2 testes (UI tooltip regression)
4. **E2E Personalization** — loginViaUI timeout (SUPABASE_SERVICE_ROLE_KEY ausente no runner)
5. **CI Security & Drift** — storageState.json sem sb-*-auth-token (auth-CI)
6. **E2E Magazine Header** — storageState.json sem token (auth-CI)
7. **E2E Swatch QuickView** — executed=5 < mínimo=10 (secrets E2E ausentes)
8. **Quote Builder Delivery** — 4 testes (UI tooltip regression)
9. **CI Replenishment** — loginViaUI timeout (auth-CI)
10. **Copilot Code Review** — HTTP 402 (quota Copilot esgotada)
11. **edge-functions-drift-check** — 31 funções em drift

Fonte: PR #2833 (PENDENCIAS.md P31, adm01-debug).

---

## PRs abertas analisadas esta sessão

| PR | Veredito |
|---|---|
| #2701 | DECISAO_HUMANA |
| #2731 | DECISAO_HUMANA |
| #2739 | BLOQUEADA_CONFLITO |
| #2744 | DECISAO_HUMANA |
| #2758 | DECISAO_HUMANA |
| #2799 | WAITING_CI_BOT |
| #2810 | CI_FALHOU |
| #2813 | MERGEADA (squash SHA `468ac058633a`) |
| #2821 | DECISAO_HUMANA |
| #2822 | CI_FALHOU |
| #2823 | DECISAO_HUMANA |
| #2824 | DECISAO_HUMANA |
| #2825 | CI_FALHOU |
| #2826 | MERGEADA (squash SHA `126062c1b9`) |
| #2827 | DECISAO_HUMANA |
| #2831 | DRAFT |
| #2833 | DRAFT |

**Total: 17 PRs abertas — 17 analisadas — 2 mergeadas (#2826, #2813)**

---

## Mergeadas nesta sessão

**#2826** — fix(sync): sentinel e2e pdf — squash-merge SHA `126062c1b919c1e84b70cacf96ab3fdda7494211`, Gate Final SUCCESS (run 41070816677).

**#2813** — refactor(quotes): E128 split QuoteBuilderSummaryColumn — squash-merge SHA `468ac058633a5683889d8074a413e0c420c77a02`, mergeable:true; runner backlog no momento do merge.

Demais 15 PRs abertas têm bloqueadores:
- 8 tocam `.github/workflows/` ou `supabase/migrations/` → REGRA #8
- 3 com CI falhando → CI_FALHOU
- 1 aguardando CI de bot release → WAITING_CI_BOT
- 2 em draft → DRAFT
- 1 com conflito → BLOQUEADA_CONFLITO
