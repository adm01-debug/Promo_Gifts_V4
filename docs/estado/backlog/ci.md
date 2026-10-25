# Backlog CI / PRs abertas — O1 (2026-10-25)

Fonte: runs do `main` via API (run IDs na tabela), `PENDENCIAS.md`, `analise-prs/RELATORIO_PRS.md`, `estado/workflows_main_416192e7.md`.
Base de leitura: main `7d3bd4ba` (runs `4022…`/`4022 3579…`). Os runs de `7d3bd4ba` ainda estavam em andamento na coleta; a coluna "última conclusão" usa o último run concluído e não cancelado de cada workflow.

## 1. Workflows do main

| Workflow | Última conclusão (SHA) | Run | Estado |
|---|---|---|---|
| Branch Protection Sentinel | success (7d3bd4ba) | 40223579865 | OK |
| CodeQL | success (59a7a607) | 40222902632 | OK |
| Deploy Gates | success (59a7a607) | 40222902668 | OK |
| E2E · Carts Undo RPC Atomic | success (59a7a607) | 40222902639 | OK |
| Gitleaks — Full History Audit | success (7d3bd4ba) | 40223579854 | OK |
| Lovable Autoheal / Edit Tracker | success (7d3bd4ba) | 40223579869 / 40223579971 | OK |
| Lovable Protected-File Audit (E196) | skipped (7d3bd4ba) | 40223579898 | OK (skip esperado) |
| No Prod Leak in Dev/Test Config | success (7d3bd4ba) | 40223579879 | OK |
| Policies Baseline | success (7d3bd4ba) | 40223579823 | OK |
| Quote Builder Delivery Quality | success (7d3bd4ba) | 40223579795 | OK |
| Release Please | success (7d3bd4ba) | 40223579822 | OK |
| Required Checks Guard | success (7d3bd4ba) | 40223579794 | OK |
| SSOT Supabase Guard | success (7d3bd4ba) | 40223579907 | OK |
| Security Scan | success (7d3bd4ba) | 40223579871 | OK |
| Select Columns vs Types | success (7d3bd4ba) | 40223579792 | OK |
| Static Health Checks | success (7d3bd4ba) | 40223579969 | OK |
| Supabase Linter Gate | success (7d3bd4ba) | 40223579893 | OK (era CI-001, resolvido pela #2524) |
| UI · Visual & A11y | success (7d3bd4ba) | 40223579827 | OK |
| Uptime Monitor | success (d8b4f130) | 40222306428 | OK (falhou 40198289694, transitório) |
| Quote Number Hardening — Verify | success (d8b4f130) | 40221363818 | OK |
| Deployment Failure Alert | skipped | 40223618484 | OK (skip esperado) |
| E2E — Critical Flows & Error Boundaries | **failure** (59a7a607) | 40222902596 | CI-002 |
| Cart Invariants Smoke | **failure** (6fcc6b30) | 40222336547 | CI-003 |
| E2E — Personalization Flow | failure (d8b4f130), success (c113300c), depois cancelado | 40221193598 / 40218104854 | CI-004 |
| E2E • Swatch QuickView | failure (c113300c), depois cancelado | 40218104729 | CI-005 |
| E2E · Cart Delete Popover | failure (cb0ccede), depois cancelado | 40216887166 | CI-005 |
| CI Security & Drift Checks | failure (c113300c), depois cancelado | 40218104748 | CI-006 |
| E2E • Thumb QuickView | só cancelado nas últimas 7 runs | 40222902531 | CI-005 |
| E2E (Playwright) | sem conclusão (pending/cancelled) | 40222902658 | CI-005 |
| Running Copilot Code Review | failure | 40222342261 | CI-007 |

## 2. Itens

| ID | Sev | Camada | Item | Evidência | Dependência |
|---|---|---|---|---|---|
| CI-001 | — | workflow | Supabase Linter Gate vermelho por HTTP 5xx da Management API | RESOLVIDO: PR #2524 (d74b33fb); run 40223579893 success | — |
| CI-002 | Alta | e2e/app | `27-admin-critical-routes.spec.ts:40` falha em 7 de 10 rotas admin (conteúdo vazio, `chromium-authed`); falha em todos os runs de main desde 10:11Z. `PENDENCIAS` P16 diz "sem credenciais E2E", mas os secrets `E2E_USER_EMAIL/PASSWORD` e `E2E_ADMIN_*` existem e 6 testes do mesmo job passam. Hipótese NÃO VERIFICADA: guard `AdminRoute`/`DevRoute` mantém spinner (usuário E2E sem MFA/AAL2 ou sem papel dev). Screenshot/`error-context.md` do artifact não acessíveis neste ambiente (blob bloqueado pelo proxy). | job 121258132799; `src/components/layout/AdminRoute.tsx`, `DevRoute.tsx` | Papel/MFA do usuário E2E (dado de produção) |
| CI-003 | Alta | e2e/dados | Cart Invariants: 6 shards falham com `[E108]` (sem 2–3 carrinhos no fixture) e `add-to-cart-btn` ausente | PENDENCIAS P2b; run 40222336547 | Seed de dados de teste (escrita no banco) |
| CI-004 | Média | e2e | Personalization intermitente (success em c113300c, failure antes/depois) | runs 40218104854, 40221193598 | CI-005 (throughput) |
| CI-005 | Alta | infra CI | Runs de Swatch, Thumb, Cart Delete, Playwright, Security&Drift terminam `cancelled`: `The runner has received a shutdown signal` nos jobs e pushes quase contínuos em main (7 merges em ~6h, grupos de concurrency com `pending` substituído pelo seguinte). Sem conclusão utilizável há ≥6 commits; também falham por dados (catalog/kit-builder/cart-delete expiram esperando elementos, mesmo padrão de CI-002/003). | runs 40218104729, 40216887166, 40218104748 | Janela sem merges em main; causa comum de dados (CI-003) |
| CI-006 | Alta | e2e/dados | CI Security & Drift: `Run E2E Critical Tests — specs autenticados`, 10 falhas `catalog.spec.ts`/`kit-builder.spec.ts` (timeout 120s esperando `wizard-step-box`) | job 121249894635 | Mesma causa de dados |
| CI-007 | Baixa | externo | Running Copilot Code Review falha em push direto (bot sem PR). Não é required check | PENDENCIAS P15 | — |
| CI-008 | Média | workflow | Contract Tests: ECR Public estourou limite de dados → PR #2537 troca para ghcr.io | PR #2537 | Aprovação PO (regra 8: workflow) |

Causa-raiz comum provável de CI-002/003/005/006 (NÃO VERIFICADA): o app de CI lê Supabase sem dados utilizáveis (catálogo/carrinhos/papel do usuário E2E). Confirmar exige abrir o artifact Playwright (traces) ou rodar a suíte com as credenciais; nenhum dos dois está disponível nesta sessão.

## 3. PRs abertas (veredito do dossiê)

| PR | Título | Veredito | Motivo |
|---|---|---|---|
| #2537 | Contract Tests registry ghcr.io | AGUARDANDO APROVAÇÃO | CLEAN; muda workflow (regra 8) |
| #2520 | release-please 1.0.0 | DECISÃO HUMANA (rejeitar recomendado) | Downgrade 1.2.1→1.0.0 |
| #2443 | Aprovação P06/P09/P14/P15/P03 | DECISÃO HUMANA | DDL de segurança em produção |
| #2415 | P20 exclui teste do Vitest | DECISÃO HUMANA | CONFLICT + workflows |
| #2428 | .gitleaks.toml allowlist | DECISÃO HUMANA | CONFLICT + config segurança |
| #2449 | E99 mirrors | DECISÃO HUMANA (descartar: supersedida por #2521) | CONFLICT + migrations |
| #2469 | e2e-personalization E42 skip | DECISÃO HUMANA | CONFLICT + workflow |
| #2503 | RELATORIO_CI Rev21 | FECHAR (obsoleta) | CONFLICT, conteúdo superado |
| #2532 | docs run refs | FECHAR (obsoleta) | CONFLICT |
| #2452 | docs PR-2441 | FECHAR (obsoleta) | CONFLICT |
| #2417 #2418 #2419 #2420 #2422 | órfãs NO_MERGE_BASE | FECHAR | dossiês `analise-prs/dossies/` |
| #2432 | probe E184 | FECHAR | 0 commits únicos (`git cherry`) |

Fonte do veredito: `analise-prs/RELATORIO_PRS.md` linhas 50-60, 88-106, 150-166, 193-199. Fechar PR é ação visível: fica para decisão na lista AGUARDANDO APROVAÇÃO.
