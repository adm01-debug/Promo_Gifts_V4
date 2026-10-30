# Baseline — Estado do main

**SHA inicial:** `8bc08b12f50872e2d9b9a93d3f7dbae388fec204`  
**SHA final:** `66d032afa8e31cd4f9b2f60508613794cef928d4`  
**Data:** 2026-10-29  
**Sessão:** https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6

## Gate Final (SHA inicial `8bc08b12f5`)

**Status:** ✅ SUCCESS  
**Workflow run:** deploy-gates.yml  
**Concluído em:** 2026-10-29T19:59:09Z  
**Duração:** ~8 min

## Gates individuais (SHA inicial `8bc08b12f5`)

| Gate | Status |
|---|---|
| Gate 0 — SSOT (`doufsxqlfjyuvxuezpln`) | ✅ |
| Gate 0.5 — npm audit | ✅ |
| Gate 1 — Lint + TypeScript | ✅ |
| Gate 1.1 — Campos críticos Product | ✅ |
| Gate 1.2 — Drift types.ts | ✅ |
| Gate 1.3 — Contratos migration | ✅ |
| Gate 1.13.2 — Anon-insert rate guard | ✅ |
| Gate E23 — Secrets check | ✅ |
| Gate 2 — Testes unitários (vitest) | ✅ |
| Gate 2.5 — Integridade transacional PostgreSQL | ✅ |
| Gate 3 — E2E Smoke (Playwright) | ✅ |
| Gate 5 — SEO sanity | ✅ |
| Gate 5.5 — RPC restore_seller_cart | ✅ |
| Gate 6 — Build Vite | ✅ |
| Gate E40 — Schema Drift Check | ⚠️ flaky (GHCR toomanyrequests) |

## Nota sobre Gate E40

O Gate E40 (Schema Drift Check) tem falhas intermitentes por `toomanyrequests` no GHCR ao fazer `docker pull` da imagem Supabase Postgres. Esta falha é de infraestrutura (runner externo), não de código. O Gate Final em main passa mesmo com E40 flaky porque o Gate E40 é advisory na agregação principal (`deploy-gates.yml`). PR #2734 foi criada exatamente para corrigir isso substituindo GHCR por mirror Docker Hub.

## Merges desta sessão (8 total)

| PR | Título | SHA merge | Método | Gate Final |
|---|---|---|---|---|
| #2721 | chore: atualiza PENDENCIAS §4 e RELATORIO_CI | `6b48beb` | squash | ✅ |
| #2735 | docs(analise-prs): rev46 — análise completa 20 PRs | `27f4261` | squash | ✅ |
| #2733 | fix(banco): adiciona rollback header e arquivo rollback | `8bc08b1` | squash | ✅ |
| #2695 | docs(db): corrige status do espelho de migration Google | `8da42aa9` | squash | ✅ |
| #2707 | docs: recibo de deploy de edge function(s) — run 40747468580 | `37ea10a3` | squash | pendente |
| #2737 | docs(auditoria): relatório de auditoria Supabase — revisão final | `c7f9f4ba` | squash | pendente |
| #2736 | test+docs(mockup/magic-up): entregas de teste e doc da fábrica VPS (lote A) | `31ebc2d3` | squash | pendente |
| #2719 | chore(build): separa mapas SQL e amplia referências Graphify | `66d032af` | squash | pendente |

## SHA final do main

`66d032afa8e31cd4f9b2f60508613794cef928d4`

Gate Final neste SHA: pendente (CI em execução no GitHub Actions após os 8 merges).
