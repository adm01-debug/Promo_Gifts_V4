# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28
**Branch:** `fix/ci-workflows` (esta sessão)

---

## ✅ P0 — RESOLVIDO — Deploy Gates na main (Gate Final)

**Resolução:** Dois runs consecutivos com `conclusion: success` na main:
- Run [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) — SHA `8c81483` — **success** (fix Gate E40 + replay-safe migrations)
- Run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) — SHA `c73cb9b` — **success** (fix Calendar RDP v10)

**Causa original:** Gate E40 (`local_only=1108; remote_only=647`) era BLOQUEANTE.
**Fix:** Commit `8c81483` — migrations `20261027120000` e `20261027140000` tornadas replay-safe com guard `IF to_regclass('cron.job') IS NULL OR NOT EXISTS (...) THEN RAISE NOTICE + RETURN`.

---

## ✅ P4 — RESOLVIDO — Gate E40 Schema Drift (ledger dessincronizado)

**Workflow:** Deploy Gates (Gate Final)
**Run com falha:** [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161)
**Fix:** Commit `8c81483` na main — migrations corrigidas tornaram o Gate E40 verde.
**Runs de validação:** `40667156516` e `40662579684` ambos com `conclusion: success`.

---

## P1 — CI - Replenishment Module Quality Gate (E2E autenticado)

**Workflow:** CI que inclui testes E2E autenticados do módulo de reposição
**Run ID da última falha:** 40612760478
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478
**Status:** failure

**Erro exato (dos logs do CI):**
```
e2e/helpers/auth.ts — Timeout 75000ms exceeded.
Error: Timed out 75s waiting for expect(locator).not.toHaveURL()
Expected pattern: not matching /login/
Received string: "http://localhost:8080/login"
```

**Causa raiz:** Helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar porque os secrets de credenciais de teste não estão configurados no GitHub Actions.

**Secrets ausentes identificados nos logs:**
- `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
- `E2E_USER_PASSWORD` — senha desse usuário
- `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)

**Ação necessária do PO:**

Passo 1 — Abra a página de secrets:
```
https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions
```

Passo 2 — Crie cada secret clicando em "New repository secret":

| Secret | Valor |
|---|---|
| `E2E_USER_EMAIL` | email de um usuário de teste ativo no projeto Supabase `doufsxqlfjyuvxuezpln` |
| `E2E_USER_PASSWORD` | senha desse usuário (deve conseguir fazer login em produção) |
| `VITE_SUPABASE_URL` | `https://doufsxqlfjyuvxuezpln.supabase.co` (se não existir como Actions Variable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do projeto `doufsxqlfjyuvxuezpln` |

Passo 3 — Verifique se o usuário de teste existe:
No Supabase Dashboard → Authentication → Users → filtre por email do usuário de teste. Se não existir, crie um usuário com email+senha.

Passo 4 — Re-run do workflow:
```
https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478
```
Clique em "Re-run all jobs".

**Impacto:** Testes E2E do módulo de reposição ficam 100% skipped (false-green) enquanto o auth falhar.

---

## P2 — E2E — Critical Flows & Error Boundaries (E2E autenticado + tooltip timing)

**Workflow:** E2E — Critical Flows & Error Boundaries
**Run ID da última falha:** 40745678499
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499
**Status:** failure

**Erros exatos (dos logs do CI):**
```
1. check-playwright-min-executed.mjs: apenas 1/10 testes executados; 90% skipped por requireAuth
2. e2e/flows/sidebar-tooltips.spec.ts:60:
   expect(tooltip).toBeVisible({ timeout: 2000 })
   → tooltip não aparece em 2s após hover
```

**Causa principal:** Mesma do P1. O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha por ausência dos secrets E2E, causando skip em cascata.

**Ação necessária do PO:**
- Passo 1: Resolver P1 primeiro (configurar os 4 secrets acima).
- Passo 2 — Re-run após P1 estar resolvido: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499
- Passo 3 — Se o tooltip ainda falhar: o timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## ✅ P3 — RESOLVIDO — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel
**Run ID da falha original:** 40615509825
**Run ID da falha recorrente (PR #2699):** [40728685711](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40728685711) — SHA `6b2cc72` — ❌ failure
**Run de confirmação (PR #2703):** [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) — SHA `c7bc0ba6` — ✅ **success**
**Status:** ✅ RESOLVIDO — padrão sistêmico corrigido

**Histórico:**
- ✅ SHA `e4a326e` (run 40680415509) — success
- ✅ SHA `2cee272b` (run 40702858343) — success
- ❌ SHA `6b2cc72` (run 40728685711) — **failure** — squash merge PR #2699 sem `(#2699)` no commit title
- ✅ SHA `c7bc0ba6` (run 40739341755) — **success** — squash merge PR #2703 com `(#2703)` no commit title

**Causa raiz (resolvida):** A ferramenta `github_merge_pull_request` do MCP GITHUB-FOREVER não inclui automaticamente `(#NNN)` no commit title. Corrigido passando `commit_title` terminando em `(#NNN)` explicitamente em toda chamada:
```json
{
  "commit_title": "docs: descrição do PR (#2703)",
  "merge_method": "squash"
}
```

**Ação necessária do PO:** Nenhuma — padrão sistêmico corrigido. Futuros merges via MCP devem sempre incluir `(#NNN)` no `commit_title`.

---

## ✅ P5 — RESOLVIDO — CI Security & Drift Checks (Calendar RDP v10)

**Workflow:** CI Security & Drift Checks
**Run ID da última falha:** 40615509752
**Run de validação:** [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435) — ✅ **success** (2026-10-28)
**Status:** ✅ RESOLVIDO

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix:** Commit `c73cb9b` na main — 3 arquivos de teste corrigidos. Validado no run [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435): Gate 2 Unit Tests ✅ success.

**Ação necessária do PO:** Nenhuma — resolvido.

---

## P6 — E2E · undo (falhas pré-existentes no main)

**Workflow:** E2E · undo
**Run ID da última falha:** 40667936090
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090
**Status:** failure — pré-existente (3+ runs consecutivos falhando na main antes desta sessão)

**Erros exatos:**
```
1. [chromium-authed] › e2e/flows/04p-quotes-expiration-column.spec.ts:149
   Error: status presente em primeiro acesso
   expect(iStatus).toBeGreaterThanOrEqual(0) → recebeu -1
   (coluna "status" não encontrada na lista de IDs de colunas)

2. [chromium-authed] › e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:150
   Error: expect(count).toBe(0) → recebeu 1
   (click após 500ms ainda aciona onUndo — timing flake/regressão)
```

**Ação necessária do PO:**
- Investigar `04p-quotes-expiration-column.spec.ts`: verificar se coluna "status" foi removida ou reordenada na UI de orçamentos
- Investigar `04r-undo-toast-a11y-keyboard.spec.ts:150`: aumentar timeout do timer ou corrigir race condition no undo toast

---

## ✅ P7 — RESOLVIDO — `db-schema-drift-check` (ledger e schema canônico)

**Última validação:** [run 40876229387](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40876229387), workflow_dispatch no HEAD `0ada518ed41535d46a61b0ff45856648598867c7` — `conclusion: success`.

**Evidências dos steps:**
- `Ledger parity (repo x canonical)`: `[migration-ledger][ok] 1901 versões alinhadas.`
- `Schema drift check (baseline + replay x remote)`: sem drift de schema; 26 funções iguais ao replay, com apenas ruído de comentário de coluna no dump.
- O workflow também concluiu os checks de event triggers e cron jobs.

Esta execução substitui o diagnóstico histórico do run `40708395880` (1.108 versões locais e 648 remotas reportadas pelo código antigo). A validação foi somente leitura; nenhuma migration, reparo de ledger ou alteração de schema foi aplicada ao Supabase canônico.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check
**Run ID da última falha:** 40744782349
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40744782349
**Status:** failure

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
```

**Causa raiz:** Uma ou mais edge functions no Supabase `doufsxqlfjyuvxuezpln` divergem do código em `supabase/functions/` no GitHub (deploy direto fora do workflow, conforme REGRA #8 corolário).

**Ação necessária do PO:**
- Verificar artefato `drift-report.csv` no run 40744782349 para identificar quais funções divergem
- Para drift de conteúdo: `supabase functions download <slug>` + commit + PR
- Para orphan no canônico: deletar via dashboard + registrar no repo
- Após reconciliar: disparar `deploy-edge-functions.yml` via `workflow_dispatch`

---

## ✅ P9 — RESOLVIDO — E2E — Personalization Flow

**Workflow:** E2E — Personalization Flow
**Run ID da última falha:** 40662579633
**Run de validação:** [40745678737](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678737) — ✅ **success** (2026-10-28)
**Status:** ✅ RESOLVIDO

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.

**Ação necessária do PO:** Nenhuma — resolvido no run 40745678737.

---

## P10 — E2E • Swatch QuickView (secrets E2E + dados de produto ausentes)

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)
**Run ID da última falha:** 40662579393
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393
**Status:** failure

**Erros exatos:**
```
firefox: check-playwright-min-executed → min. de testes não atingido (auth falhou)
webkit: expect(picker).not.toBeNull()
        "nenhum produto com color_swatches V2 em ${route.path}"
        at e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts:103
```

**Causa raiz (dois problemas):**
1. Firefox/chromium: autenticação E2E falhou — mesma causa P1 (secrets ausentes)
2. Webkit: picker V2 retorna null — produtos com `color_swatches V2` podem não existir em produção ou seletor mudou

**Ação necessária do PO:**
- Resolver P1 primeiro (secrets E2E)
- Investigar webkit: verificar se existem produtos com `color_swatches` V2 em produção e se o seletor está correto

---

## P11 — Edge Integration Tests — All Functions (11 testes falhando)

**Workflow:** Edge Integration Tests — All Functions
**Run ID da última falha:** 40746330314
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40746330314
**Status:** failure — ❌ BLOCKED PO — requer deploy das versões atuais

**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Causa raiz (determinada — versões deployadas desatualizadas no Supabase):**

As 3 edge functions afetadas têm código **correto no repositório** (confirmado em 2026-10-28 via `github_get_content`):
- `generate-mockup` (SHA `09af62394a`) — já tem `try/catch` em `JSON.parse` do body
- `verify-2fa-token` (SHA `a58240e50786`) — já tem `try/catch` em `JSON.parse` do body
- `validate-access` (SHA `14ce2379c053`) — já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`, validação JWT completa e rejeição de tokens inválidos

**O deploy no Supabase está desatualizado.** As versões em produção são antigas (sem esses tratamentos), causando:
1. `generate-mockup` + `verify-2fa-token` em produção: timeout 30s ao receber JSON inválido (versão antiga sem try/catch → worker trava)
2. `validate-access` em produção: retorna HTTP 200 para todos os inputs, incluindo body inválido e tokens ausentes/expirados (versão antiga sem validação)

**NÃO é bug de código** — a correção já está commitada no repo. O problema é que o deploy não foi feito com as versões atuais.

**Ação necessária do PO:**
- Disparar `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml`
- Aprovar o gate `environment: production` quando solicitado
- Funções a redeployar: `generate-mockup`, `verify-2fa-token`, `validate-access`

---

## P12 — Kit Coverage — Integration (cobertura insuficiente na view)

**Workflow:** Kit Coverage — Integration
**Run ID da última falha:** 40874620158 (SHA `6bcc383e438390a44d7538db9c3b0b82f4c0926f`)
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40874620158
**Status:** failure — autenticação e consultas passaram; a cobertura dos dados reais continua abaixo do mínimo.

**Resultado observado:** autenticação e as duas consultas ao Supabase passaram. A terceira asserção falhou com `Cobertura 56% < threshold 70%` para o kit descoberto dinamicamente.

**Causa confirmada para a permissão:** nenhuma migration de GRANT faltava. Consulta somente leitura a `pg_catalog`/`has_table_privilege` confirmou SELECT para `authenticated` e `service_role`, e ausência para `anon`, tanto em `public.v_kit_component_complete` quanto em `public.product_kit_components`. O teste usava o cliente sem sessão autenticada. A correção de código autentica o usuário E2E e não abre acesso anônimo.

**Gate C25:** corrigido no commit `353d99d31`; a exceção vale somente para o workflow, job autenticado e comando de integração específicos. Os 23 testes do contrato passaram localmente. O run [Deploy Gates #40868363085](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40868363085) terminou com `conclusion: success`, incluindo lint/typecheck, testes unitários, E2E Smoke e build.

**Gap restante — contrato/qualidade da view e fixture:**
- A definição canônica consultada em `pg_get_viewdef` não projeta `component_description`, `primary_image_url`, `images` e `supplier_component_code`, campos que o teste inclui na métrica. A entrada `v_kit_component_complete` em `src/integrations/supabase/types.ts` também omite esses quatro campos, portanto os tipos locais refletem a view remota; o gap está entre o contrato do teste (view como superset da tabela base) e a projeção real.
- Recontagem somente leitura no Supabase canônico, usando a mesma lista de 15 campos e o mesmo arredondamento do teste: 5 de 978 kits ativos com componentes atingem 70% na tabela base; a média por kit é 52,7%. A seleção dinâmica sem ordenação escolhe um kit qualquer, por isso a falha não é reprodutível. A execução atual no SHA `6bcc383e4` repetiu 56% para o kit selecionado: [run #40874620158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40874620158).
- A definição de `v_kit_component_complete` não foi encontrada nas migrations versionadas fora de arquivos de backup/ledger; sua origem e o contrato pretendido ainda precisam ser reconciliados antes de propor DDL. Não alterar a view nem mascarar a divergência ajustando o threshold.
- O teste não deve reduzir o threshold nem conceder SELECT a `anon` para mascarar o problema.

**Estado do PR #2701:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701 — draft. A branch foi atualizada com a `main` de 2026-10-28 e o conflito documental foi reconciliado; ainda não deve ser mesclada enquanto a integração de cobertura estiver vermelha. Commits `353d99d31`, `cb4b745c6` e `6bcc383e4` estão publicados no branch do PR, que incorpora a `main` atual e já não tem conflito documental. O dispatch mais recente falhou somente na cobertura descrita acima; as duas primeiras asserções passaram no run #40874620158.

**Próximo passo:** revisar e aprovar o contrato esperado da view e definir fixture estável que atenda à métrica. Se for aprovada uma mudança de schema, versionar uma migration não destrutiva, validar pelo fluxo obrigatório E15 e atualizar os tipos; não aplicar DDL diretamente via MCP/dashboard. Nenhum GRANT a `anon`, DDL, migration ou dado operacional foi alterado nesta correção.

---

## P13 — Vercel deployment failure (projeto fantasma)

**Status:** failure em commits desta branch

**Erro:**
```
Vercel: Deployment has failed
description: "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW --logs"
```

**Causa raiz provável:** Projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado em 2026-09-15 — incidente documentado na REGRA #11 do CLAUDE.md.

**Ação necessária do PO:**
- Verificar se o projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` ainda existe em https://vercel.com/juca1 e deletá-lo
- Confirmar que `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` (projeto canônico)

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8 e P11 requerem investigação independente. P12 requer decisão sobre o contrato da view e uma fixture de integração determinística; o último run falhou em 56% contra o mínimo de 70%. P13 requer investigação do projeto Vercel informado.*
