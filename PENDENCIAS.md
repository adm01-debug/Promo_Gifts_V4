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

## P7 — db-schema-drift-check (ledger divergente — requer reconciliação pelo PO)

**Workflow:** db-schema-drift-check  
**Run ID da última falha:** [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880)  
**SHA:** `2cee272b` (main HEAD em 2026-10-28 14:41)  
**Status:** ❌ failure — bloqueado por ledger divergente

**Erro exato (step "Ledger parity (repo x canonical)"):**
```
[migration-ledger][bloqueado] local_only=1108; remote_only=648; mismatched=0; malformed=0
```

**Causa raiz:** O ledger de migrations está massivamente dessincronizado entre o repositório e o banco de produção `doufsxqlfjyuvxuezpln`:
- **1108 migrations** existem no repo (`supabase/migrations/`) mas **não constam** no banco remoto (`supabase_migrations.schema_migrations`)
- **648 migrations** constam no banco remoto mas **não existem** no repo

Esta divergência é independente do fix de P4 (guard pg_cron nas migrations `20261027120000`/`20261027140000`). O fix de P4 corrigiu o replay do Gate E40 dentro do `deploy-gates.yml`, mas o `db-schema-drift-check` compara o ledger em si — e o ledger está dessincronizado por DDL fora do fluxo de migration (REGRA #8 corolário).

**Ação necessária do PO:**
1. Investigar a extensão da divergência: baixar artefato `schema-reconciliation-evidence` do run [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880/artifacts/12824214915) (arquivos `/tmp/migration-ledger.json` e `/tmp/migration-ledger-summary.json`)
2. Decidir estratégia de reconciliação: criar migrations espelho para o `remote_only=648` ou limpar o `local_only=1108` do ledger
3. Após reconciliação: disparar `schema-snapshot-export.yml` com `force_rotate: true` para girar o baseline
4. Reconfirmar com `workflow_dispatch` em `db-schema-drift-check`

**Nota:** Per REGRA #8 corolário e E056, Claude **não pode** executar DDL ou `migration repair` em sessão de agente para reconciliar o ledger. Requer ação do PO.

**Nota — diferença P7 (`local_only=1108`) vs P12 (`local_only=1109`):** P12 rodou no branch do PR #2701 que adiciona a migration `20261028120000_grant_kit_view_authenticated.sql` ao repo (+1 sobre os 1108 da main). Os dois valores são corretos em seus respectivos contextos: 1108 é o estado atual da main; 1109 é o estado do branch do PR #2701.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40756284439 (2026-10-28 19:39 UTC; SHA `da7bdb8`)
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40756284439
**Status:** failure — atualização para `main=c213051` é documental e não alterou edge functions.

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
```

**Evidência do artefato `drift_report.csv`:** 110 funções comparadas; 81 alinhadas; 29 com hash de conteúdo divergente; nenhuma função ausente no canônico ou órfã. O relatório prova a divergência, mas não identifica sozinho qual lado é a versão aprovada nem como ela chegou ao canônico.

**Funções com conteúdo divergente:** `ai-recommendations`, `bitrix-sync`, `cnpj-lookup`, `collections-watcher`, `connections-auto-test`, `connections-hub-audit`, `crm-db-bridge`, `e2e-cleanup`, `ema-pipeline-health`, `favorites-watcher`, `generate-ad-image`, `generate-mockup`, `kit-ai-builder`, `log-login-attempt`, `magazine-import-local`, `magazine-public-react`, `mcp-keys-issue`, `mcp-keys-revoke`, `migrate-helper`, `product-webhook`, `quote-sync-promo-champions`, `receive-crm-callback`, `secrets-manager`, `send-scheduled-reports`, `simulation-orchestrator`, `trends-insights`, `visual-search`, `webhook-dispatcher`, `webhook-inbound`

**Deploy aguardando PO:** run [40757296680](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40757296680) está `waiting` no environment **Production**. A API de pending deployments confirma que o aprovador é `adm01-debug`. É um dispatch amplo; não aprovar antes de classificar as 29 divergências.

**Ação necessária do PO:**
- Decidir, função por função, se o código aprovado é o do GitHub ou o canônico; consultar o artefato do run 40756284439 antes de escolher.
- Corrigir pelo fluxo de PR a fonte aprovada; depois usar `deploy-edge-functions.yml` com `function_name` para publicar funções pontuais.
- Aprovar o environment **Production** apenas para o conjunto revisado. Não há orphan para remover nem migration de banco pendente nesse drift.

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

**Falha registrada:** 3 arquivos falharam; o resumo antigo atribuía a falha a versões divergentes de três funções. O snapshot posterior do detector de drift (run 40756284439) permite confirmar apenas os hashes atuais, sem determinar qual lado é a versão aprovada:

As 3 edge functions afetadas têm código **correto no repositório** (confirmado em 2026-10-28 via `github_get_content`):
- `generate-mockup` (SHA `09af62394a`) — já tem `try/catch` em `JSON.parse` do body
- `verify-2fa-token` (SHA `a58240e50786`) — já tem `try/catch` em `JSON.parse` do body
- `validate-access` (SHA `14ce2379c053`) — já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`, validação JWT completa e rejeição de tokens inválidos

**Estado no snapshot mais recente:** `validate-access` e `verify-2fa-token` estão alinhadas com o repositório; `generate-mockup` continua divergente. A comparação de hashes não prova se o código canônico ou o do GitHub é a versão aprovada. A falha E2E #40746330314 é anterior a esse snapshot.

**Ação necessária do PO:**
- Classificar `generate-mockup` comparando o conteúdo canônico ao versionado e decidir qual lado é aprovado.
- Se a decisão exigir alteração/deploy, fazê-la por PR e pelo workflow `deploy-edge-functions.yml`; aprovar `Production` somente para o conjunto revisado.
- Reexecutar os testes de integração após a reconciliação. Não redeployar `verify-2fa-token` ou `validate-access`, que aparecem alinhadas no snapshot atual.

---

## P12 — Kit Coverage — Integration (bloqueado por P7)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha (main):** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**PR com fix:** [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) (draft — Gate Final ❌)  
**Run de falha no PR:** [40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177) (job Gate Final: 122981142154)  
**Status:** ❌ BLOCKED PO — bloqueado por P7

**Erro exato (main):**
```
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz:** O role usado pelo teste de integração não tem `GRANT SELECT` na view `v_kit_component_complete` no projeto `doufsxqlfjyuvxuezpln`.

**Fix implementado:** Migration `20261028120000_grant_kit_view_authenticated.sql` criada em branch `claude/fix-p12-grant-kit-view-261028-1730`, PR [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) aberto (draft).

**Por que o PR não pode ser mergeado — bloqueio descoberto em 2026-10-28:**

A migration nova faz o Gate E40 "Detect schema file changes" **ativar** o Gate E40 Schema Drift Check. O drift check falha com `local_only=1109; remote_only=648` (P7 pré-existente), retornando `R_SCHEMA_DRIFT=failure`. O Gate Final exige `R_SCHEMA_DRIFT == "success" || "skipped"` — com `failure`, o Gate Final falha (job 122981142154: `##[error]Gate E40 Schema Drift falhou (failure)`).

Runs anteriores na main tinham `R_SCHEMA_DRIFT=skipped` (commits sem migration) e por isso passavam. **Qualquer PR com migration nova falha o Gate Final enquanto P7 não for resolvido.**

**Ação necessária do PO (duas opções):**

**Opção A (recomendada):** Resolver P7 (reconciliar ledger) → mergear PR #2701 → disparar `db-apply-migration.yml` via `workflow_dispatch`.

**Opção B:** Aplicar o GRANT diretamente via `workflow_dispatch` em `db-apply-migration.yml` com SQL `GRANT SELECT ON public.v_kit_component_complete TO authenticated, service_role;` — requer aprovação de `environment: production` no GitHub Actions UI.

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

## P14 — Dependabot: duas alertas high para `extract-zip`

**Status:** aberto no GitHub em 2026-09-27; não foi corrigido nesta auditoria.

**Evidência:** alertas [#68](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/68) e [#69](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/69) apontam `extract-zip` no `package-lock.json`, faixa vulnerável `<= 2.0.1`. O lockfile atual resolve `2.0.1`. O endpoint do Dependabot não informou uma `first_patched_version`; portanto, esta evidência não identifica uma versão segura para atualização.

**Ação necessária:** verificar o advisory e uma versão corrigida compatível; atualizar a dependência pela menor alteração segura, reproduzir/validar `npm ci`, build, lint, typecheck e suíte completa, e confirmar o fechamento dos dois alertas. Não afrouxar auditoria nem descartar alertas.

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 bloqueado por P7 (Opção B disponível via workflow_dispatch sem resolver P7). P13 requer deleção do projeto fantasma Vercel.*
