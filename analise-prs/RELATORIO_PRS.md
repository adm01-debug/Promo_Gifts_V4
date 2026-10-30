# Relatório Completo de PRs — Sessão 2026-10-30

**Sessão:** `session_01RfQzo8Ean3zudG2sEN79b6`
**Branch de trabalho:** `claude/chore-analise-prs-261030-1600`
**Main HEAD baseline:** `468ac058633a5683889d8074a413e0c420c77a02` (pós-merge #2813)
**Main HEAD atual:** `126062c1b919c1e84b70cacf96ab3fdda7494211` (pós-merge #2826)
**Última atualização:** 2026-10-30T19:30Z

---

## Baseline de Testes (Gate 2)

**21 testes falham em main — todos pré-existentes e ambientais (fetch failed Supabase)**

Evidência: Gate 2 SUCCESS em run `#40420603513` no GitHub Actions (os mesmos 21 testes falham no CI também, confirmando que são ambientais, não regressões introduzidas por código).

Testes falhando (21):
- CartStatusSelect.emptyCart (1)
- CloudStatusBanner (9)
- date-utils (3)
- magazineService.shapeDrift (1)
- MockupProductSelector (7)

Causa: `fetch failed` por ausência de `SUPABASE_URL`/`SUPABASE_ANON_KEY` no ambiente de container da sessão — não há banco de testes conectado.

---

## Gate Final — Estado em Main

| Run | SHA | Resultado |
|---|---|---|
| `#41106866772` | `3bfc9dc5fa84` (atual) | ✅ SUCCESS |
| `#41070816677` | pós-merge #2826 | ✅ SUCCESS |
| `#40420603513` | baseline anterior | ✅ SUCCESS (Gate 2: 21 falhas ambientais conhecidas) |

**Produção:** Supabase `doufsxqlfjyuvxuezpln` — 0 erros HTTP 5xx nas últimas 4h (verificado via `query_logs` MCP nesta sessão).

---

## PRs Mergeadas Nesta Sessão

### #2826 — fix(ci): sentinel SHA allowlist + E2E PDF Dialog skip
- **SHA squash-merge:** `126062c1b919c1e84b70cacf96ab3fdda7494211`
- **Intenção:** Corrige allowlist de SHA no sentinel e pula dialog de PDF em E2E
- **Arquivos:** `scripts/sentinel-check.sh`, `e2e/quote-builder-delivery.spec.ts` (confirmado via `list_pr_files`)
- **Gate Final pré-merge:** SUCCESS run `#41070816677` (verificado via `get_workflow_run`)
- **Regressão:** NÃO — zero arquivos `.github/workflows/` no diff real (verificado)
- **Regra de negócio:** CORRETA — sentinel allowlist é manutenção legítima

### #2813 — refactor(quotes): E128 split QuoteBuilderSummaryColumn
- **SHA squash-merge:** `468ac058633a5683889d8074a413e0c420c77a02`
- **Intenção:** Divide QuoteBuilderSummaryColumn.tsx (~1.200 linhas) em componentes menores (E128)
- **Arquivos:** componentes de quotes (confirmado via `list_pr_files`)
- **Gate Final:** `mergeable=true` no momento do merge; runner backlog no CI; Gate verde em run subsequente
- **Regressão:** NÃO — refactor estrutural puro sem mudança de comportamento
- **Regra de negócio:** CORRETA — alinhada ao objetivo E128 de modularização

---

## PRs Abertas — 16 PRs, 0 Elegíveis para Merge

### #2701 — fix(ci): autentica integração Kit Coverage com usuário E2E
- **Branch:** `claude/fix-p12-grant-kit-view-261028-173`
- **Análise:** `mergeable_state=dirty` (conflito ativo confirmado via `get_pull_request`)
- **Gate Final:** UNKNOWN — CI nunca disparou por conflito
- **Regressão:** N/A — conflito impede análise
- **Regra de negócio:** não avaliável
- **VEREDITO: BLOQUEADA_CONFLITO**
- **Evidência:** `get_pull_request #2701` retornou `mergeable_state=dirty`

---

### #2731 — fix(db): protege kill_switch_hits contra INSERT anônimo sem rate guard
- **Branch:** `fix/p200-e049-rate-guard`
- **Intenção:** Adiciona trigger de rate guard para `kill_switch_hits` (E049)
- **Arquivos tocados:** `.github/workflows/deploy-gates.yml` (REGRA #8) + `supabase/migrations/20261029160339_*.sql` (REGRA #8)
- **Regressão CRÍTICA:** adição de `--require-live` em Gate 1.13.2 sem trigger em produção → bloquearia todos os merges futuros
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `list_pr_files #2731` mostra `deploy-gates.yml` + migration; leitura do diff confirma `--require-live`

---

### #2739 — fix(mockup): gerador — medidas, timeout 30s, lote parcial
- **Branch:** `fix/mockup-improvements`
- **Intenção:** Melhorias em `useMockupGenerator.ts` (timeout, medidas, lote parcial)
- **Gate Final:** FAILURE — Gate 1.9 file-size ratchet: `useMockupGenerator.ts` 894 linhas > 893 baseline (run `#41067609025`)
- **Regressão:** NÃO (mudança funcional, não regressão) — mas CI falhou por gate de tamanho
- **VEREDITO: CI_FALHOU**
- **Evidência:** `get_run_failure_summary` run `#41067609025` confirma Gate 1.9 failing

---

### #2744 — [NÃO MESCLAR sem OK do dono] fix(edge): limites e tempo do Magazine
- **Estado:** DRAFT=true
- **Título:** contém explicitamente "[NÃO MESCLAR sem OK do dono]"
- **Arquivos:** `supabase/functions/` (edge function — REGRA #8)
- **VEREDITO: DRAFT**
- **Evidência:** `get_pull_request #2744` retornou `draft=true`

---

### #2758 — fix(a11y): restaura foco visível no histórico de imagens
- **Branch:** `fix/a11y-focus-visible`
- **Intenção:** Restaura `focus-visible` em `AdImageResult.tsx`
- **Arquivos:** `src/components/magic-up/AdImageResult.tsx` (sem workflows)
- **Gate Final:** UNKNOWN
- **Bloqueador:** Body do PR contém instrução explícita de revisão humana antes do merge
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `get_pull_request #2758` body confirma restrição explícita

---

### #2799 — chore(main): release 1.4.0
- **Branch:** `release-please--branches--main`
- **Autor:** `github-actions[bot]`
- **Gate Final:** NEVER_FIRES — PRs de bot não disparam Gate Final automaticamente
- **VEREDITO: WAITING_CI_BOT**
- **Evidência:** `list_check_runs #2799` mostra 0 runs do Gate Final; autor = `github-actions[bot]`

---

### #2810 — feat(e128): split PromoFlixPlayer.tsx 1512→699 linhas + usePromoFlixPlayer
- **Branch:** `feat/promo-flix-split`
- **Intenção:** Divide PromoFlixPlayer.tsx em componente + hook (E128)
- **Gate Final:** FAILURE — Gate 1.9 file-size ratchet: `usePromoFlixPlayer.ts` 624 linhas > 500 limite (run `#41078748068`)
- **VEREDITO: CI_FALHOU**
- **Evidência:** `get_run_failure_summary` run `#41078748068` confirma Gate 1.9 failing

---

### #2821 — fix(ci): registra status HTTP no monitor de uptime
- **Branch:** `fix/uptime-probe-script`
- **Intenção:** Extrai bash inline para `scripts/uptime-probe.sh` e registra status HTTP
- **Arquivos:** `.github/workflows/uptime-monitor.yml` (REGRA #8)
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `list_pr_files #2821` confirma `uptime-monitor.yml`

---

### #2822 — fix(types): sincroniza idempotency_key de notificações
- **Branch:** `fix/idempotency-key-types`
- **Intenção:** Sincroniza campo `idempotency_key` em `src/integrations/supabase/types.ts`
- **Gate Final:** FAILURE — Gate 1.3 baseline desatualizado (run `#41070173501`)
- **VEREDITO: CI_FALHOU**
- **Evidência:** `get_run_failure_summary` run `#41070173501` confirma Gate 1.3 failing

---

### #2823 — fix(db): reconciliar migrations pendentes com o canônico
- **Branch:** `fix/migrations-reconcile`
- **Intenção:** Reconcilia migrations fora do ledger
- **Arquivos:** `supabase/migrations/` (REGRA #8)
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `list_pr_files #2823` confirma `supabase/migrations/`

---

### #2824 — fix(e2e): isola servidor Vite no CI de paridade
- **Branch:** `fix/vite-ci-isolation`
- **Intenção:** Isola porta do servidor Vite no CI de paridade
- **Arquivos:** `.github/workflows/replenishment-quality.yml` (REGRA #8)
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `list_pr_files #2824` confirma workflow tocado

---

### #2825 — chore(audit): fixa Graphify e atualiza estado CI
- **Branch:** `chore/audit-graphify`
- **Intenção:** Atualiza Graphify e documentação de CI
- **Gate Final:** FAILURE — Gate 1.3 baseline desatualizado (run `#41070810245`)
- **VEREDITO: CI_FALHOU**
- **Evidência:** `get_run_failure_summary` run `#41070810245` confirma Gate 1.3 failing

---

### #2827 — fix(ci): corrige erros TypeScript e persistência do tour
- **Branch:** `codex/fix-typescript-kit-tour` (Codex agent)
- **Intenção:** Corrige erros TypeScript em conexões e persistência do tour de kits
- **Arquivos:** sem `.github/workflows/` ou migrations
- **Bloqueadores:** REGRA #10 (cross-agent: Codex branch) + body "Não mesclar nesta etapa"
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `get_pull_request #2827` confirma branch `codex/` + body restriction

---

### #2831 — docs(analise-prs): atualiza veredictos PRs 2799-2828
- **Branch:** `claude/eloquent-ramanujan-0yt2fo`
- **Estado:** DRAFT=true
- **Nota:** branch conflitada com 52 commits — substituída pela branch desta sessão
- **VEREDITO: DRAFT**
- **Evidência:** `get_pull_request #2831` retornou `draft=true`

---

### #2833 — docs(ci): registra P31 — inventário de 11 workflows falhando
- **Estado:** DRAFT=true
- **Arquivos:** `PENDENCIAS.md`, `RELATORIO_CI.md`
- **VEREDITO: DRAFT**
- **Evidência:** `get_pull_request #2833` retornou `draft=true`

---

### #2834 — docs(analise): evidência baseline vitest — sessão 2026-10-30
- **Branch:** `claude/fix-relatorio-baseline-vitest-261030-1745` (outra sessão Claude)
- **Estado:** DRAFT=true
- **Arquivos:** 1 arquivo docs only (`analise-prs/baseline/failing-tests-by-name.md`)
- **VEREDITO: DRAFT**
- **Evidência:** `get_pull_request #2834` retornou `draft=true`; branch de outra sessão

---

### #2836 — fix: improve plan-status honesty and criterion-based receipts
- **Branch:** `codex/plan-status-honesty-20261030` (Codex agent)
- **Intenção:** Refatora `plan-status.mjs` para distinguir etapas verificadas de apenas marcadas com checkmark
- **Arquivos:** `docs/plans/PLANO_*.md`, `docs/plans/PLANO_*_EVIDENCIAS.json`, `scripts/plan-status.mjs`, `tests/scripts/plan-status.test.mjs` (nenhum em `.github/workflows/` ou migrations — verificado via `list_pr_files`)
- **Gate Final:** UNKNOWN (`mergeable_state=behind`)
- **Bloqueadores:** REGRA #10 (cross-agent: Codex branch) + body "aguarda os checks e revisão"
- **VEREDITO: DECISAO_HUMANA**
- **Evidência:** `list_pr_files #2836` (4 arquivos, nenhum em paths protegidos) + `get_pull_request #2836` confirma branch `codex/` e body restriction

---

## PR Fechada (não contada como aberta)

### #2838 — (fechada sem merge)
- **Estado:** `closed`, `merged=false`, `closed_at=2026-10-30T18:29:42Z`
- **VEREDITO: FECHADA**
- **Evidência:** `get_pull_request #2838` confirmou `state=closed`

---

## Sumário

| Categoria | PRs | Contagem |
|---|---|---|
| Mergeadas (sessão anterior, verificadas aqui) | #2813, #2826 | 2 |
| BLOQUEADA_CONFLITO | #2701 | 1 |
| DECISAO_HUMANA | #2731, #2758, #2821, #2823, #2824, #2827, #2836 | 7 |
| CI_FALHOU | #2739, #2810, #2822, #2825 | 4 |
| DRAFT | #2744, #2831, #2833, #2834 | 4 |
| WAITING_CI_BOT | #2799 | 1 |
| FECHADA (não aberta) | #2838 | 1 |
| **Total analisadas** | | **20** |
| **Elegíveis para merge nesta passagem** | | **0** |

---

## Verificação de Produção

- Supabase `doufsxqlfjyuvxuezpln`: `query_logs` retornou `[]` (0 erros 5xx nas últimas 4h)
- Gate Final em main: run `#41106866772` → `completed/success` em SHA `3bfc9dc5fa84`
- Testes pré-existentes falhando: 21 (todos ambientais `fetch failed Supabase`, não regressões deste trabalho)
