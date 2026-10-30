# Baseline — Sessão 2026-10-30 (sessão_01RfQzo8Ean3zudG2sEN79b6)

**Data:** 2026-10-30
**Branch this session:** `claude/eloquent-ramanujan-0yt2fo`
**Main HEAD ao iniciar análise:** `b92bcf876ef2fe28999d28778efaa9fa30e4064c`
**Main HEAD ao finalizar:** `126062c1b919c1e84b70cacf96ab3fdda7494211` (pós-merge #2826)

---

## Estado do CI em main

### Gate Final (único required check)

| Commit | Run | Resultado |
|---|---|---|
| `cba9944d` (antecessor) | #41067473692 | ✅ SUCCESS (15 jobs, 2 skipped) |
| `b92bcf876` (main início sessão) | #41088401807 | `queued` (docs-only, paths-ignore ativo) |
| `126062c1b9` (pós-merge #2826) | run pós-merge | ✅ Gate Final SUCCESS confirmado antes do merge |

**Conclusão:** Gate Final verde no antecessor `cba9944d`. Merge de #2826 validado por Gate Final run 41070816677 (SUCCESS) na branch antes do squash.

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
| #2739 | CI_FALHOU |
| #2744 | NAO_MERGEAR |
| #2758 | NAO_MERGEAR |
| #2799 | AGUARDANDO_BOT |
| #2810 | CI_FALHOU |
| #2813 | AGUARDANDO_CI |
| #2821 | DECISAO_HUMANA |
| #2822 | CI_FALHOU |
| #2823 | DECISAO_HUMANA |
| #2824 | DECISAO_HUMANA |
| #2825 | CI_FALHOU |
| #2826 | MERGEADA (squash SHA `126062c1b9`) |
| #2827 | NAO_MERGEAR |
| #2831 | DRAFT |
| #2833 | DRAFT |

**Total: 17 PRs abertas — 17 analisadas — 1 mergeada (#2826)**

---

## Mergeadas nesta sessão

**#2826** — fix(sync): sentinel e2e pdf — squash-merge SHA `126062c1b919c1e84b70cacf96ab3fdda7494211`, Gate Final SUCCESS (run 41070816677).

Demais 16 PRs abertas têm bloqueadores:
- 8 tocam `.github/workflows/` ou `supabase/migrations/` → REGRA #8
- 4 com CI falhando → CI_FALHOU
- 1 aguardando Gate Final (CI rodando) → AGUARDANDO_CI (#2813)
- 1 aguardando CI de bot release → AGUARDANDO_BOT
- 2 em draft → DRAFT
- 3 com instrução explícita de não mergear → NAO_MERGEAR
