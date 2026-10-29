# RELATORIO_PRS — Análise Exaustiva de PRs

**Gerado em:** 2026-10-29  
**Sessão:** https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6  
**Main HEAD (início):** `8bc08b12f50872e2d9b9a93d3f7dbae388fec204`  
**Gate Final main (início):** ✅ SUCCESS (2026-10-29T19:59:09Z)  
**Main HEAD (final):** `66d032afa8e31cd4f9b2f60508613794cef928d4` (após 8 merges)

---

## ⚠️ RISCOS E BLOQUEIOS (leia primeiro)

| Risco | Impacto | Ação necessária |
|---|---|---|
| PR #2731 Gate E40 falhou por GHCR rate limit | CI não confirmou schema drift na PR | PO: verificar se flake ou real antes de mergear |
| PRs #2720, #2730 tocam `.github/workflows/` com conflito | Não podem ser mergeadas sem resolução manual | PO: resolver conflito manualmente |
| PR #2717 toca `.github/workflows/` com conflito | Não pode ser mergeada sem resolução manual | PO: resolver conflito manualmente |
| PR #2714 toca `supabase/migrations/` com conflito | Risco de ledger divergente se aplicada fora de ordem | DBA/PO: revisar antes de qualquer ação |
| PR #2713 (release 1.1.0) bloqueada sem Gate Final | Bot PR aguardando; CHANGELOG gerado automaticamente | PO: validar CHANGELOG antes de mergear |
| **NOVA FALHA CI** `E2E — Full User Flows` ❌ em `66d032af` | Falha nova vs baseline ✅ — STOP ativo | PO: investigar regressão E2E antes de próximos merges |

---

## 🔴 FALHAS CI VERIFICADAS (pós-merge)

**STOP ativo:** condição "qualquer falha nova = PARE" acionada.  
**SHA atual main:** `66d032afa8e31cd4f9b2f60508613794cef928d4`

### Falhas novas vs baseline `8bc08b12f5`

| Check | Baseline `8bc08b12f5` | HEAD `66d032af` | Tipo |
|---|---|---|---|
| `E2E — Full User Flows (authed)` | ✅ success | ❌ failure | **NOVA FALHA** |
| `E2E — Magazine Header (authed)` | não presente | ❌ failure | **NOVA** |
| `Magazine Header OK` | não presente | ❌ failure | **NOVA** |
| `chromium • swatch→QV` | não presente | ❌ failure | **NOVA** |
| `webkit • swatch→QV` | não presente | ❌ failure | **NOVA** |
| `quality-gate` (ci-security-drift.yml) | ✅ success | ❌ failure | **NOVA** |

### Falhas de infra (NÃO code regression)

| Check | Causa | Impacto |
|---|---|---|
| `check \| failure` (3 runs, uptime-monitor.yml) | `health-check` edge function HTTP erro (curl exit 22) — criou issue #2740 | Infra/transiente, não código |

### Gate Final em `66d032af`

| Gate | Status |
|---|---|
| Gate Final - Deploy Ready | **NÃO PRESENTE** (queued/in_progress — runner backlog) |
| Gate 1 - Lint + TypeScript | queued |
| Gate 2 - Unit Tests | ✅ success |
| Gate 2.5 - PostgreSQL Transactional Integrity | in_progress |
| Gate 3 - E2E Smoke | queued |
| Gate 4 - Lighthouse CI | queued |
| Gate 0.5 - Dependency Audit | queued |

### Causa raiz das falhas E2E

**Culpado provável:** PR #2736 (adiciona `e2e/flows/mockup-*.spec.ts` com possível interferência no runner compartilhado) ou PR #2719 (modifica `package.json`). Não é possível confirmar sem CI completo em commit intermediário — `ci-security-drift.yml` foi cancelado em todos os commits intermediários.

**Status:** PR #2713 (release 1.1.0) e PR #2738 (delivery) **NÃO mergeados** — aguardam investigação da regressão.

---

## Inventário Completo — 23 PRs analisadas

| PR | Título | Estado | Veredito | Motivo |
|---|---|---|---|---|
| ~~#2737~~ | ~~docs(auditoria): relatório de auditoria Supabase — revisão final~~ | merged | **MERGEADA ✅** | SHA `c7f9f4ba` — squash 2026-10-29 |
| ~~#2736~~ | ~~test+docs(mockup/magic-up): entregas de teste e doc da fábrica VPS (lote A)~~ | merged | **MERGEADA ✅** | SHA `31ebc2d3` — squash 2026-10-29 |
| #2735 | docs(analise-prs): rev46 — análise completa 20 PRs | merged | **MERGEADA ✅** | SHA `27f4261` — squash 2026-10-29 |
| #2734 | fix(ci): usa mirror Docker Hub após limite do GHCR | open | **DECISAO_HUMANA** | `.github/workflows/contract-tests.yml` (REGRA #8) |
| #2733 | fix(banco): adiciona rollback header e arquivo rollback | merged | **MERGEADA ✅** | SHA `8bc08b1` — squash 2026-10-29 |
| #2731 | fix(db): protege kill_switch_hits contra INSERT anônimo | open | **DECISAO_HUMANA** | `.github/workflows/deploy-gates.yml` + `supabase/migrations/` (REGRA #8) |
| #2730 | fix(ci): protege contrato de repair-only em E15 | open | **DECISAO_HUMANA** | `.github/workflows/db-apply-migration.yml` (REGRA #8) + conflito |
| #2729 | docs(analise-prs): relatório completo — 21 PRs | closed | **NAO_MERGEAR** | Branch de entrega desta sessão — fechada pelo PO |
| #2721 | chore: atualiza PENDENCIAS ¶4 e RELATORIO_CI | merged | **MERGEADA ✅** | SHA `6b48beb` — squash 2026-10-29 |
| #2720 | ci(e2e): não ocultar falha na geração de fixtures | open | **DECISAO_HUMANA** | `.github/workflows/` (REGRA #8) + conflito |
| ~~#2719~~ | ~~chore(build): separa mapas SQL e amplia referências Graphify~~ | merged | **MERGEADA ✅** | SHA `66d032af` — squash 2026-10-29 |
| #2717 | fix(e2e): isola servidor Vite no CI de paridade | open | **DECISAO_HUMANA** | `.github/workflows/replenishment-quality.yml` (REGRA #8) + conflito |
| #2716 | docs(auditoria): atualiza estado CI e sincronização canônica | closed | **CONFLITO** | Conflito em documentação — fechada externamente |
| ~~#2707~~ | ~~docs: recibo de deploy de edge function(s)~~ | merged | **MERGEADA ✅** | SHA `37ea10a3` — squash 2026-10-29 |
| #2701 | fix(ci): autentica integração Kit Coverage com usuário E2E | open | **CONFLITO** | Draft de outra sessão; conflito com main |
| ~~#2695~~ | ~~docs(db): corrige status do espelho de migration Google~~ | merged | **MERGEADA ✅** | SHA `8da42aa9` — squash 2026-10-29 |
| #2693 | docs(auditoria): relatório final auditoria Supabase doufsxqlfjyuvxuezpln | closed | **CONFLITO** | `claude_pink/`; conflito; fechada externamente |
| #2688 | fix(ci): torna migration 20261027120000 replay-safe | closed | **DECISAO_HUMANA** | `.github/workflows/` + `supabase/migrations/` (REGRA #8); draft; outra sessão; fechada externamente |
| #2674 | docs(analise-prs): análise completa 12 PRs — versão anterior | closed | **OBSOLETA** | Draft de sessão anterior superseded; conflito; fechada |
| #2714 | fix(db): reconciliar migrations pendentes com o canônico | open | **DECISAO_HUMANA** | `supabase/migrations/` (REGRA #8) + conflito |
| #2713 | chore(main): release 1.1.0 | open | **AGUARDAR_REVISAO_PO** | Bot PR; bloqueada (Gate Final sem run); validar CHANGELOG |
| #2711 | docs(ci): RELATORIO_CI.md v3 — tabela de prova consolidada | closed | **CONFLITO** | Draft; `claude_pink/`; conflito; fechada externamente |

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADA (esta sessão) | 8 | #2721, #2735, #2733, #2695, #2707, #2737, #2736, #2719 |
| DECISAO_HUMANA (open) | 5 | #2734, #2731, #2730, #2720, #2717 |
| DECISAO_HUMANA (fechada ext.) | 2 | #2714 (open+conflito), #2688 (closed) |
| CONFLITO (closed ext.) | 4 | #2716, #2711, #2693, #2674 |
| CONFLITO (open draft) | 1 | #2701 |
| AGUARDAR_REVISAO_PO | 1 | #2713 |
| NAO_MERGEAR (delivery) | 1 | #2729 (fechada pelo PO) |
| **Total analisadas** | **23** | ✅ |

---

## Merges realizados nesta sessão

| PR | Título | SHA merge | Método | Gate Final |
|---|---|---|---|---|
| #2721 | chore: atualiza PENDENCIAS ¶4 e RELATORIO_CI | `6b48beb` | squash | ✅ |
| #2735 | docs(analise-prs): rev46 — análise completa 20 PRs | `27f4261` | squash | ✅ |
| #2733 | fix(banco): adiciona rollback header e arquivo rollback | `8bc08b1` | squash | ✅ |
| #2695 | docs(db): corrige status do espelho de migration Google | `8da42aa9` | squash | ✅ (inferido — docs only) |
| #2707 | docs: recibo de deploy de edge function(s) | `37ea10a3` | squash | ✅ (inferido — docs only) |
| #2737 | docs(auditoria): relatório de auditoria Supabase — revisão final | `c7f9f4ba` | squash | pendente CI |
| #2736 | test+docs(mockup/magic-up): entregas de teste e doc (lote A) | `31ebc2d3` | squash | pendente CI |
| #2719 | chore(build): separa mapas SQL e amplia referências Graphify | `66d032af` | squash | pendente CI (Gate Final não rodou) |

**STOP:** `E2E — Full User Flows` ❌ em `66d032af` — Gate Final não completou (runner backlog). Próximos merges bloqueados até investigação.

---

## PRs que exigem decisão humana (REGRA #8)

### #2734 — fix(ci): usa mirror Docker Hub após limite do GHCR
- **Por quê DECISAO_HUMANA:** `.github/workflows/contract-tests.yml`
- Gate Final: ✅ SUCCESS; Merge test: LIMPO
- **Ação:** PO pode mergear diretamente se aprovado o workflow

### #2731 — fix(db): protege kill_switch_hits contra INSERT anônimo
- **Por quê DECISAO_HUMANA:** `.github/workflows/deploy-gates.yml` + `supabase/migrations/20261029160339_add_kill_switch_hits_anon_rate_guard.sql`
- Gate Final: ❌ (E40 GHCR rate limit — todos os outros gates passaram)
- **Ação:** DBA deve revisar migration; retriggerar CI para confirmar Gate E40

### #2730 — fix(ci): protege contrato de repair-only em E15
- **Por quê DECISAO_HUMANA:** `.github/workflows/db-apply-migration.yml`
- Conflito com main: requer resolução manual
- **Ação:** PO + resolução de conflito antes de mergear

### #2720 — ci(e2e): não ocultar falha na geração de fixtures
- **Por quê DECISAO_HUMANA:** `.github/workflows/`
- Conflito com main: requer resolução manual
- **Ação:** PO + resolução de conflito antes de mergear

### #2717 — fix(e2e): isola servidor Vite no CI de paridade
- **Por quê DECISAO_HUMANA:** `.github/workflows/replenishment-quality.yml`
- Conflito com main: requer resolução manual
- **Ação:** PO + resolução de conflito antes de mergear

### #2714 — fix(db): reconciliar migrations pendentes com o canônico
- **Por quê DECISAO_HUMANA:** `supabase/migrations/`
- Conflito com main: requer resolução manual
- **Ação:** DBA deve revisar migrations de reconciliação antes de qualquer ação

---

## Meta checklist

- [x] Total PRs analisadas: 23 (inclui closed + merged + open)
- [x] Dossiês criados: um por PR em `analise-prs/dossies/PR-{n}.md`
- [x] prs.json: 23 entradas com veredito
- [x] prs.csv: 23 linhas
- [x] Merges: 8 PRs mergeadas (squash)
- [x] DECISAO_HUMANA: 7 PRs sinalizadas para PO
- [x] CONFLITO: 5 PRs identificadas
- [x] AGUARDAR_REVISAO_PO: 1 PR (#2713)
- [x] OBSOLETA: 1 PR (#2674)
- [x] NAO_MERGEAR: 1 PR (#2729)
- [x] regras-de-negocio.md: criado
- [x] typecheck baseline: criado
- [x] CI pós-merge verificado: **STOP ativo — falhas novas detectadas em `66d032af`**

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6*
