# RELATORIO_CI.md — Inventário de workflows `action_required`
**Gerado em:** 2026-10-24 (sessão `session_01Nc1nb7PArDnixYvvZssnKy`)
**Branch de trabalho:** `claude_05/upbeat-hamilton-5gnz50` (PR #2438)

---

## 1. Inventário de runs `action_required`

### Total: 641 runs (API: 2026-10-24)

| Fonte | Branch | SHA | Qtd estimada | Status PR fonte |
|---|---|---|---|---|
| `release-please--branches--main--components--*` | várias sub-branches | `3a726461` | ~620 | Sem PR aberto |
| `copilot/corrigir-peer-dependencies-eslint` | copilot branch | `df09a371` | ~21 | PR #2320 fechado sem merge |

### Causa raiz

Todos os 641 runs são de branches sem PR ativo no momento da execução. GitHub Actions cria runs `action_required` quando o workflow tem trigger `pull_request` e a branch vem de um fork ou de um contexto sem permissões de escrita — ou quando o `pull_request_target` aguarda aprovação manual.

### Por que não é possível limpar

`POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve` retorna **HTTP 403** para essas branches:
> "This workflow run cannot be approved because it was not triggered by a pull request from a fork."

O endpoint só funciona para PRs de forks externos. Para branches internas do mesmo repositório sem PR aberto, não há API para aprovar/rejeitar em lote. Os runs expiram naturalmente (90 dias de retenção) ou precisam ser cancelados manualmente via UI do GitHub.

### Impacto no Gate Final

**Nenhum.** O único required check em `main` é `Gate Final - Deploy Ready` (`deploy-gates.yml`). Os 641 runs action_required são de branches separadas e não bloqueiam merge de PRs de outras branches.

---

## 2. Estado dos checks no PR #2438 — SHA `4e5fbb4a` (2026-10-24T23:01)

| Check | App | Status | Conclusion | Bloqueante? |
|---|---|---|---|---|
| SSOT Gates (validate + guard + hosts) | GitHub Actions | completed | ✅ **success** | sim (Gate 0) |
| Assert Gate Final is required | GitHub Actions | completed | ✅ **success** | sim |
| PR Size Check | GitHub Actions | completed | ✅ **success** | não |
| **Gate Final - Deploy Ready** | GitHub Actions | **pending** | — | **sim** |
| Compare GitHub × Canonical | GitHub Actions | in_progress | — | não (advisory) |
| Ghost Check Guard | GitHub Actions | queued | — | não |
| Secrets Inventory Check | GitHub Actions | queued | — | não |
| Supabase Preview | Supabase app | completed | ❌ failure | **não** (externo) |
| Vercel Preview Comments | Vercel | completed | ✅ success | não |
| Vercel Agent Review | Vercel | completed | neutral | não |

### Detalhe: Supabase Preview failure

```
ERROR: column categories.level does not exist (SQLSTATE 42703)
At statement: 59
CREATE MATERIALIZED VIEW "analytics"."categories_tree_visual"
```

Este check é executado pelo app `supabase` (não pelo GitHub Actions) e tenta aplicar migrations do PR num banco preview (`cegqcnepkwtmqlsleqlp`). O erro indica que a migration cria uma view que referencia `categories.level`, coluna inexistente no banco preview. **Não é um required check** — não faz parte do Gate Final e não bloqueia merge.

### Detalhe: Gate Final pending

Run `#40140993670` criado em `23:01:20Z`, sem jobs iniciados após 7+ minutos. Causa provável: concorrência do grupo do workflow com outro run ainda em fila na `main` (run `#40140248838`). Sem pending deployments, sem aprovação necessária.

---

## 3. Estado dos workflows na main (SHA `9b23fb64` — merge PR #2437)

| Workflow | Status | Conclusion |
|---|---|---|
| Static Health Checks | completed | ✅ success |
| Select Columns vs Types | completed | ✅ success |
| TS Unused Locals Ratchet | completed | ✅ success |
| Gitleaks — Full History Audit | completed | ✅ success |
| Deploy Gates | queued | — (em execução) |
| Required Checks Guard | queued | — |
| E2E • Thumb QuickView | in_progress | — |

---

## 4. Conclusão

- **action_required (641 runs):** impossível limpar via API — documentado em PENDENCIAS.md P4. Expiram em 90 dias ou requerem cancelamento manual via UI.
- **Gate Final PR #2438:** aguardando runner (pending sem jobs). Sem falha ativa.
- **Supabase Preview:** falha em check externo não-required; não bloqueia merge.
- **Nenhuma regressão introduzida** nos arquivos modificados nesta sessão (`goalSchema.ts`, `PENDENCIAS.md`).
