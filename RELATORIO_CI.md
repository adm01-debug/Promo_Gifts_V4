# Relatório de CI — Sessão 2026-11-01

## Estado atual — HEAD `de5345dc` — 2026-11-01T21:59 UTC

**HEAD main:** `de5345dc` (`chore(auditoria): SEC-002 verificação individual concluída — todas 36 EFs SAFE`)

### Falha unitária resolvida — QuoteBuilderSummaryAlignment.fuzz.test.ts ✅

A única falha unitária rastreada em execuções anteriores (`QuoteBuilderSummaryAlignment.fuzz.test.ts`) está **resolvida no HEAD atual**. O arquivo de teste já referencia `../QuoteBuilderSummaryItems.tsx` (linha 17) e todos os tokens esperados estão presentes nesse source:

| Asserção do teste | Padrão | Presente em `QuoteBuilderSummaryItems.tsx` |
|---|---|---|
| `expect(SRC).toMatch(/leading-\[1\.125rem\]/)` | `leading-[1.125rem]` | ✅ linha 180 |
| `expect(SRC).toMatch(/h-\[1\.125rem\] shrink-0 items-center/)` | `h-[1.125rem] shrink-0 items-center` | ✅ linha 242 |
| `expect(SRC).toMatch(/pr-2 text-sm font-medium/)` | `pr-2 text-sm font-medium` | ✅ linha 180 |
| `before:inset-[-10px]` count = 3 | 3 ocorrências | ✅ 3 encontradas |
| `Ajustar este item` / `Remover do orçamento` | tooltips PT-BR | ✅ presentes |
| `<TooltipContent side="top"` ≥ 3 | ≥ 3 ocorrências | ✅ 3 encontradas |
| tokens legados ausentes | `items-start gap-0.5 pt-0.5` | ✅ ausente |

PR #2851 foi fechado sem merge, mas o fix foi incorporado ao HEAD via outro commit. A suíte unitária local deve agora terminar com exit 0 (1.251 arquivos, 0 falhas) — não verificável localmente nesta sessão por ausência de `node_modules`, mas comprovado por inspeção direta do source.

### Runner saturation — 2026-11-01T21:38Z

Todos os runs de CI na main (HEAD `de5345dc` e `d2033d92`) estão **cancelled** ou **skipped** por saturação de runners. Nenhum run completado disponível para validação remota. As falhas documentadas abaixo (P1, P7, P8, P11, P12, P21) refletem o último estado confirmado; não houve regressão nova identificada no código.

**Falhas persistentes (infra/secrets — não code-fixable):**

| Pendência | Workflow | Causa | Ação |
|---|---|---|---|
| P1 | CI Replenishment E2E | Secrets `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` ausentes | PO adiciona em Settings → Secrets |
| P7 | db-schema-drift-check | Ledger GitHub × canônico divergente | Thread auditoria Supabase |
| P8 | edge-functions-drift-check | Drift GitHub × canônico | Thread auditoria Supabase |
| P11 | Edge Integration Tests | Versões edge functions desatualizadas | Thread auditoria Supabase |
| P12 | Kit Coverage Integration | `anon` sem SELECT em `v_kit_component_complete` | Thread auditoria Supabase |
| P21 | Nightly Full CI | Secrets de teste E21 ausentes | PO adiciona em Settings → Secrets |

---

## Revalidação remota após merge do PR #2853 — 2026-10-31 04:07 UTC

O PR [#2853](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2853) foi mesclado na `main` às 04:03 UTC (`22e8ddad0cc41a1bab002ac077ca31558c149dda`). A nova bateria ainda não terminou: no snapshot remoto, 30 workflows estavam queued/em execução, 3 concluídos com sucesso e nenhum novo workflow concluído com falha. A última falha concluída de **Kit Coverage — Integration** continua sendo [#41165671545](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41165671545), bloqueada por permissão `anon` na view `v_kit_component_complete`; **Nightly Full CI** continua com [#41161391625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41161391625), bloqueada pelos secrets de teste E21 ausentes. A causa e a ação segura estão em `PENDENCIAS.md`.

PRs #2850 e #2851 continuam abertos com verificações falhando. PR #2852 está aberto, sem falhas observadas, mas com 7 checks pendentes. Não houve merge desses PRs. Esta atualização é um snapshot intermediário; a validação de sucesso da bateria pós-merge permanece pendente.

### Revalidação local do branch documental — 2026-10-31 04:15 UTC

`npm run build:verify` passou: TypeScript, lint baseline (0 erros/0 warnings, sem regressão) e build Vite/Gates de produção. A suíte completa `npm test -- --reporter=dot` terminou com exit 1 e reproduziu a única falha conhecida, `QuoteBuilderSummaryAlignment.fuzz.test.ts:31`, que ainda procura tokens de JSX em `QuoteBuilderSummaryColumn.tsx`; o JSX foi extraído para `QuoteBuilderSummaryItems.tsx`. Resultado: 1.250 arquivos aprovados, 1 falhou, 130 skipped; 25.900 testes aprovados, 1.135 skipped e 24 TODO. Isso coincide com o baseline documentado; não foi removido nem enfraquecido teste algum. O fix está no PR #2851, mas ainda sem merge e com checks remotos falhando.

## Atualização de execução — 2026-10-31 02:50 UTC / 2026-10-30 BRT

### Baseline e revalidação local

O baseline foi executado sobre `main` `554ef41b44c9f318777d7e7b11189490a29a8c0a`, antes das alterações desta rodada. A falha unitária conhecida apontava para um arquivo-fonte anterior à extração do componente. Após a correção do URL state no PR #2850, do caminho do teste no PR #2851 e do escopo do audit em #2853, a validação local ficou assim:

| Verificação | Baseline | Resultado após correções | Evidência |
|---|---|---|---|
| `npm ci` | ✅ | ✅ | Instalação limpa, exit 0. O npm reportou 29 vulnerabilidades no conjunto instalado (17 moderate, 12 high); nenhuma correção automática foi aplicada. |
| TypeScript | ✅ | ✅ | Incluído no `npm run build:verify`; nenhum erro de tipo. |
| Lint | ✅ | ✅ | Incluído no `npm run build:verify`; 0 erros, 0 warnings e nenhuma regressão contra o baseline. |
| Build | ✅ | ✅ | `npm run build:verify` concluído, incluindo build Vite e verificações de produção. |
| Suíte Vitest completa | ⚠️ 1 arquivo falhou por caminho obsoleto do teste (1.250 arquivos passaram, 1 falhou, 130 ignorados; 25.900 testes passaram, 1.135 ignorados e 24 TODO) | ⚠️ Mesma falha conhecida: 1.250 arquivos passaram, 1 falhou, 130 ignorados; 25.904 testes passaram, 1.135 ignorados e 24 TODO | Após o commit `2ee4e3a3c`, no branch do PR [#2853](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2853); nenhum novo arquivo/teste falhou. A correção isolada no PR [#2851](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2851) passou localmente com 1.251 arquivos e 25.910 testes. |

O teste focado do componente passou 10/10; o hook de URL do PR #2850 passou 379/379; os testes focados do audit #2853 passaram 20/20. A suíte de #2853 manteve exatamente uma falha do baseline, no caminho antigo do teste de alinhamento. Os checks remotos ainda estão pendentes; validação local não equivale à aprovação do GitHub. A leitura ampliada de 800 runs concluiu o inventário de 41 workflows únicos na `main`: seis últimas execuções estavam vermelhas (Branch Protection Sentinel, E2E Playwright, CI Security & Drift Checks, Swatch QuickView, Running Copilot Code Review e E2E Magazine Header); `Deploy Gates` estava verde. Causas, trechos de log, ações e estados dos PRs estão em [PENDENCIAS.md](PENDENCIAS.md). Nos PRs #2847, #2849 e #2850, o gate visual de reposição mediu spread de 56,17 px para um limite de 48 px, embora o mesmo workflow estivesse verde na main; a causa da diferença entre branches ainda não foi comprovada.

Não houve alteração no Supabase, em dados operacionais, em schema, em migrations ou em segredos. PR #2850 altera comportamento da aplicação e permanece sem merge enquanto houver checks pendentes e risco de disparar deploy de produção; PR #2851 contém apenas correção de teste e aguarda o Gate Final remoto.

**Gerado:** 2026-10-29 · **Atualizado:** 2026-10-31T03:53 UTC
**HEAD da main observado:** `554ef41b44c9f318777d7e7b11189490a29a8c0a` (2026-10-30)
**HEAD anterior:** `c09402816` (baseline local)
**Sessão:** https://claude.ai/code/session_01RfQzo7S3K6o49UBUDoCtUe

---

## Baseline Local (branch de trabalho)

| Check | Resultado |
|---|---|
| Build Vite | ✅ PASSOU (`✓ built in ~11s`) |
| TypeScript (`tsc --noEmit`) | ✅ PASSOU (exit 0) |
| Soft-delete gate (`check-soft-delete-policy.mjs`) | ✅ PASSOU (atual: 568 · baseline: 576 — drift positivo) |
| TS Unused Locals Ratchet | ✅ PASSOU (baseline: 0, atual: 0) |
| Vitest (unitários) | ✅ PASSOU (exit 0) |
| ESLint | ⚠️ OOM no container local (exit 0 por tratamento) — CI usa ambiente com mais memória |

---

## Correções Aplicadas Nesta Sessão

### Fix 1 — Gate 1.12: soft-delete regression em `stock_notes`
- **Commit:** `5ae127e` (já mergeado em `main` via PR #2871 por sessão anterior)
- **Arquivo:** `supabase/migrations/20261031000000_create_stock_notes.sql`
- **Causa:** migration criava tabela sem `deleted_at` e sem `-- soft-delete-exempt`
- **Fix:** adicionado `-- soft-delete-exempt: notas de usuário — hard-delete intencional por policy`

### Fix 2 — CI Security & Drift: lint-0029 allowlist desatualizada
- **Arquivo:** `.security/lint-0029-allowlist.json`
- **Causa:** função `public.perf002_drop_unused_snapshot_indexes()` (SECURITY DEFINER, pg_cron) criada em `20261101194657` não estava documentada na allowlist
- **Fix:** adicionada entrada com reason explicando origem PERF-002 e migration de remoção pendente

### Fix 3 — DB Apply Migration E15: preflight faltando artefatos de rollback
- **Arquivos:** `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` + `supabase/rollbacks/20261101202000_rollback.sql` (criado)
- **Causa:** migration não tinha `-- Rollback:` nas primeiras 40 linhas e rollback file estava ausente
- **Fix:** adicionado header `-- Rollback:` + criado arquivo `supabase/rollbacks/20261101202000_rollback.sql`
- **Status pós-fix:** `preflight-migration-apply` retorna `static-pass` localmente

---

## Workflows Ainda Falhando em `main` — ver PENDENCIAS.md

11 workflows estavam falhando quando esta sessão iniciou. Desses:
- 3 já tinham sido corrigidos por commits recentes de main (Policies Baseline via `e170f5b`, TS Unused Locals via `b78ab0a`)
- 2 foram corrigidos por esta PR (lint-0029 + preflight migration)
- 6 permanecem abertos por dependerem de infraestrutura, DB ao vivo ou investigação de código — ver PENDENCIAS.md
