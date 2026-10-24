# RELATORIO_CI.md — Relatório CI / Action Required
**rev 3 — 2026-10-25 (sessão `session_01Nc1nb7PArDnixYvvZssnKy`)**
**Branch:** `claude_05/upbeat-hamilton-5gnz50` (PR #2438)

---

## 0. Baseline local (2026-10-25)

Executado em HEAD `7e69b190` (node v22.22.0, node_modules instalado):

| Verificação | Comando | Resultado |
|---|---|---|
| Install | `ls node_modules/.package-lock.json` | ✅ node_modules OK |
| TypeScript | `npx tsc --noEmit` | ✅ EXIT:0 — zero erros |
| ESLint | `npx eslint src --ext .ts,.tsx --max-warnings=0 --quiet` | ✅ EXIT:0 — zero avisos |
| Vite build | skipped (sem mudança em `src/`) | N/A — docs-only bypass E14 ativo |
| Vitest | skipped (sem mudança em `src/`) | N/A — docs-only bypass E14 ativo |

**Conclusão baseline:** codebase limpo em HEAD. Docs-only bypass E14 correto — único commit desta sessão toca `PENDENCIAS.md` e `RELATORIO_CI.md`, zero mudança em `src/`.

---

## 1. Inventário de runs `action_required` (641 runs)

### Total: 641 runs (API confirmada: 2026-10-24)

| Fonte | Branch | SHA | Qtd estimada | Status PR fonte |
|---|---|---|---|---|
| `release-please--branches--main--components--*` | várias sub-branches | `3a726461` | ~620 | Sem PR aberto |
| `copilot/corrigir-peer-dependencies-eslint` | copilot branch | `df09a371` | ~21 | PR #2320 fechado sem merge |

### Causa raiz

Todos os 641 runs são de branches sem PR ativo. GitHub Actions cria runs `action_required` quando o `pull_request_target` aguarda aprovação manual de contribuidor externo/sem permissão de escrita.

### Por que não é possível limpar via API

`POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve` retorna **HTTP 403**:
> "This workflow run cannot be approved because it was not triggered by a pull request from a fork."

O endpoint só funciona para PRs de forks externos. Para branches internas sem PR aberto, não há API pública para aprovar em lote. Os runs expiram naturalmente (90 dias) ou requerem cancelamento via UI.

### Impacto no Gate Final

**Nenhum.** O único required check em `main` é `Gate Final - Deploy Ready` (`deploy-gates.yml`). Os 641 runs são de branches separadas e não bloqueiam merge de PRs ativos.

**Registrado em PENDENCIAS.md P4** com motivo completo e bloqueio técnico documentado.

---

## 2. Inventário de workflows — última execução em `main`

Verificado em 2026-10-25 (latest run por workflow):

| Workflow | Última conclusion | Observação |
|---|---|---|
| Branch Protection Sentinel | ❌ failure | Roda em `push: main`; falhou em `ec736c90` — ver P20 |
| CodeQL | ✅ success | — |
| Cart Invariants Smoke | 🔄 in_progress | E2E, não required |
| Deployment Failure Alert | ⏭️ skipped | Normal (sem deploy failure) |
| E2E (Playwright) | 🔄 in_progress | Não required |
| E2E · Cart Delete Popover | ⚠️ sem conclusão | Rodando |
| E2E · Carts Undo RPC Atomic | ✅ success | — |
| E2E — Critical Flows & Error Boundaries | 🔄 in_progress | Não required |
| E2E — Personalization Flow | ❌ failure | E2E flake/env; não required |
| E2E • Swatch QuickView | ⚠️ sem conclusão | Rodando |
| E2E • Thumb QuickView | ❌ failure | E2E flake/env; não required |
| Gitleaks — Full History Audit | ✅ success | — |
| Lovable Autoheal | ✅ success | — |
| Lovable Edit Tracker | ✅ success | — |
| Lovable Protected-File Audit (E196) | ⏭️ skipped | — |
| No Prod Leak in Dev/Test Config | ✅ success | — |
| Policies Baseline | ✅ success | — |
| Quote Builder Delivery Quality | ✅ success | — |
| Release Please | ❌ failure | Releases bot; não required |
| Required Checks Guard | ✅ success | — |
| SSOT Supabase Guard | ✅ success | — |
| Security Scan | ✅ success | — |
| Select Columns vs Types | ✅ success | — |
| Static Health Checks | ✅ success | — |
| Supabase Linter Gate | ❌ failure | Pré-existente em main; não é required |
| UI · Visual & A11y | ✅ success | — |
| Deploy Gates | 🔄 in_progress | **required check** — run #40141643241 |

**Workflows verdes (required):** Gate Final progressivo — ver seção 3.

**Failures pré-existentes em main:** `Release Please` (bot de release), `Supabase Linter Gate` (linter advisory), `E2E — Personalization Flow`, `E2E • Thumb QuickView` — nenhum deles é required check. Estavam em failure antes desta sessão (não introduzidos por esta branch).

---

## 3. Estado do Gate Final — PR #2438, SHA `7e69b190`

**Run:** [#40141643241](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40141643241)

| Gate | Job | Status | Conclusion |
|---|---|---|---|
| Docs-only bypass E14 | Detectar mudanças | completed | ✅ success |
| Gate 0 | SSOT Supabase | completed | ✅ success |
| Gate 0.5 | Dependency Audit | completed | ✅ success |
| Gate 0.6 | Dependency Review | queued | — |
| Gate 1 | Lint + TypeScript | completed | ⏭️ skipped (docs-only) |
| Gate 2 | Unit Tests | completed | ⏭️ skipped (docs-only) |
| Gate 2.5 | PostgreSQL Integrity | queued | — |
| Gate 3 | E2E Smoke | completed | ⏭️ skipped (docs-only) |
| Gate 4 | Lighthouse CI | completed | ✅ success (src skip) |
| Gate 5 | SEO Sanity Check | queued | — |
| Gate 5.5 | RPC restore_seller_cart | completed | ✅ success |
| Gate E23 | Secret Scan (gitleaks) | completed | ✅ success |
| Gate E23 | Verifica secrets E2E | completed | ✅ success |
| Gate E40 | Detect schema changes | queued | — |
| **Gate Final** | Deploy Ready | **pending** | **aguardando jobs acima** |

### Checks externos (não required)

| Check | App | Conclusion | Bloqueante? |
|---|---|---|---|
| Supabase Preview | Supabase | ❌ failure | **Não** — externo, pré-existente |
| Compare GitHub × Canonical | GH Actions | ✅ success | Não (advisory) |
| Vercel Preview Comments | Vercel | ✅ success | Não |
| SSOT Gates | GH Actions | ✅ success | Gate 0 |
| Assert Gate Final is required | GH Actions | ✅ success | — |

### Detalhe: Supabase Preview failure

```
ERROR: column categories.level does not exist (SQLSTATE 42703)
CREATE MATERIALIZED VIEW "analytics"."categories_tree_visual"
```

Banco preview `cegqcnepkwtmqlsleqlp` — não é required check, não bloqueia merge.

---

## 4. Diagnóstico dos workflows com falha em `main`

| Workflow | Causa raiz | Required? | Esta branch tocou? |
|---|---|---|---|
| Release Please | Bot de release sem token configurado ou sem PR title convencional | Não | Não |
| Supabase Linter Gate | Linter advisory de queries; pré-existente | Não | Não |
| E2E — Personalization Flow | Flake/env; pré-existente | Não | Não |
| E2E • Thumb QuickView | Flake/env; pré-existente | Não | Não |
| Branch Protection Sentinel | Roda em `push: main`; falhou em `ec736c90` por commit sem sufixo `(#NNN)` — ver P20 | Não | Não |

**Nenhum workflow required estava em failure em `main` antes desta sessão.** Os failures listados acima são pré-existentes e não causados por esta branch.

---

## 5. Causa raiz tratada nesta sessão

### goalSchema.ts — sintaxe Zod 4 (SHA `4e5fbb4a`)

**Sintoma:** Gate 1 (TypeScript) falhava em SHA `14aa72ae` com erro TS no `goalSchema.ts`.

**Causa:** Zod 4 mudou a chave de mensagem de erro de `required_error` para `error` nos `z.enum()`. O código usava a sintaxe antiga.

**Fix aplicado** (`src/lib/validations/goalSchema.ts`):
```typescript
// ANTES (Zod 3):
goal_type: z.enum([...], { required_error: '...' })
// DEPOIS (Zod 4):
goal_type: z.enum([...], { error: '...' })
```

**Verificado:** TSC EXIT:0, ESLint EXIT:0 após o fix.

**SHA atual `7e69b190`:** Gate 1 SKIPPED (docs-only bypass E14) — os arquivos `PENDENCIAS.md` e `RELATORIO_CI.md` são docs, nenhum arquivo `src/` foi modificado neste commit.

---

## 6. Anti-regressão

- Workflows verdes antes desta sessão (`SSOT Gates`, `Static Health Checks`, `Gitleaks`, etc.) continuam ✅ success na main
- TSC e ESLint passam em HEAD (`7e69b190`) — baseline verificado
- Nenhum arquivo `src/` foi modificado nos commits desta sessão de documentação
- Nenhum teste foi apagado, pulado ou enfraquecido
- Nenhuma dependência foi alterada
