# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-29
**Branch da revalidação:** `fix/graphify-reproducible-version-20261029`

> Revalidação operacional mais recente: veja P20 ao final deste arquivo. P18 e P19 permanecem como snapshots históricos.

## Auditoria de sincronização local × GitHub × Supabase — snapshot substituído

O quadro originalmente registrado aqui descrevia o estado anterior aos merges dos PRs #2719 e #2721 e não deve ser tratado como evidência atual. A revalidação mais recente está em **P19 — Revalidação de sincronização e Graphify**, ao final deste arquivo. Os registros históricos detalhados permanecem nas seções P15–P18. Não copiar dados operacionais de clientes ou produtos para o repositório.

## P18 — Revalidação após os merges #2719 e #2721 — 2026-10-29

### Estado do repositório

- O PR [#2719](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2719) foi mesclado em `main` no commit `66d032afa8e31cd4f9b2f60508613794cef928d4`. A `main` local foi atualizada por fast-forward para o mesmo SHA e estava limpa antes desta correção. Os seis itens de Graphify (métrica em português, população filtrada, referências TypeScript, mapa SQL separado, benchmark de versão e retenção da versão homologada) estão no repositório.
- O PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721) também foi mesclado em `main`, no commit `6b48bebcb2ff5ff922298523f4678383d392ae46`; o código e os testes do painel de localização estão no histórico da `main` atual.
- Os checks pós-merge ainda não terminaram. O check `Supabase Preview` falhou com `Remote migration versions not found in local migrations directory`; o workflow [Uptime Monitor #40950084617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40950084617) falhou porque `health-check` retornou curl 22; site, OPTIONS de `check-login` e Auth Health passaram. Issue automática [#2740](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2740). Não declarar o merge como integralmente verde.
- A branch dedicada contém a correção de reprodutibilidade Graphify, separada da `main` e ainda não mesclada. O workspace raiz de `main` foi sincronizado ao SHA do GitHub; artefatos antigos de Graphify ficaram preservados no stash `preserva artefatos Graphify locais antes da sincronização da main 2026-10-29` e não foram reaplicados.

### Inventário das últimas execuções na `main`

Consulta individual aos 119 workflows ativos, com `branch=main`, excluindo PRs e usando apenas a última execução por workflow. Runs sem conclusão (queued/pending/in_progress/waiting), cancelados, skipped e sem execução não foram contados como falha.

| Estado da última execução | Workflows |
|---|---:|
| `success` | 40 |
| `failure` | 24 |
| `queued` | 20 |
| `pending` | 8 |
| `in_progress` | 1 |
| `waiting` | 1 |
| `skipped` | 2 |
| `cancelled` | 2 |
| Sem run na `main` | 21 |

As 24 falhas atuais e a evidência resumida são:

| Workflow | Último run | Causa observada ou limite da evidência |
|---|---|---|
| Copilot | [40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | HTTP 402 por limite de uso adicional; causa operacional do serviço. |
| Regenerate Supabase Types | [26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Falha no passo de commit/push/abertura de PR; logs expiraram (HTTP 410), então a causa raiz não foi confirmada. |
| edge-functions-drift-check | [40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | 29 hashes divergentes entre GitHub e produção; a evidência não identifica qual lado é fonte legítima. |
| Supplier Comparison CI | [39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | API de jobs/logs retornou 404; causa técnica não confirmada. |
| OptimizedImage E2E CI | [39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | Preflight detectou pacote/lockfile incompatíveis no SHA `50f513e7`. |
| Global Search Quality Gate | [39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | Lockfile contém `realtime/storage 2.117.3`, manifesto exige `2.118.0`. |
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `permission denied` em `v_kit_component_complete` e `product_kit_components`; não conceder acesso a `anon`. |
| Update Quote Visual Snapshots | [39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | Fixture não contém orçamento em estado `enviada` (`E108`). |
| E2E Discount Approval | [39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Incompatibilidade pacote/lockfile no preflight. |
| E2E ColorSwatch Grid | [39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Incompatibilidade pacote/lockfile no preflight. |
| E2E Dialogs visual PR check | [39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | API de jobs/logs retornou 404; causa técnica não confirmada. |
| E2E Check Calendar snapshots | [39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | API de jobs/logs retornou 404; causa técnica não confirmada. |
| E2E PDF Dialog | [40893179038](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40893179038) | Nove testes sem fixtures de orçamento `enviada`/`rascunho` (`E108`). |
| PDF Visual Regression | [39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | API de jobs/logs retornou 404; causa técnica não confirmada. |
| Magazine typed queries — dry-run | [39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `npm ci` bloqueado por divergências entre package e lockfile (Supabase, jspdf-autotable, lucide, React/DOM, fast-equals). |
| migration-dry-run | [35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolveu o hostname DNS; conectividade/secret do runner precisa ser verificada. |
| Uptime Monitor | [40950084617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40950084617) | `health-check` retornou curl 22; site, `check-login` OPTIONS e Auth Health passaram. Issue [#2740](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2740); causa do endpoint ainda não identificada. |
| Ratchet Weekly — Baixar baselines | [40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Exit 141 após diff, compatível com SIGPIPE/`pipefail`; a correção está no workflow atual, mas não há run verde posterior na `main`. |
| E2E Cart — Matrix | [40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Timeout no login Auth/REST; latência é hipótese, não causa operacional confirmada. |
| E2E Freight — Matrix | [39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup de login E2E expirou (`E21`, 75 s); causa externa ainda não confirmada. |
| E2E Stock — Matrix | [39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` falhou com lockfile incompatível no SHA correspondente. |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Falhas em seletores/snapshots/requisições E2E; não há causa comum demonstrada. |
| E2E atualizar snapshots visuais (E155) | [39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | Dialog do editor de orçamento não apareceu após Escape em cinco viewports; 85 testes passaram. |
| Python Package using Conda | [39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | `environment.yml` ausente no workflow. |

O `Branch Protection Sentinel` não está nesta lista: sua última execução pós-merge estava `queued`, portanto não conta como falha. Não foram disparados reruns indiscriminados; há workflows de snapshot, deploy e banco com efeitos externos.

### Supabase canônico — somente leitura

- Projeto `doufsxqlfjyuvxuezpln`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.063. O check `Supabase Preview` no merge #2719 falhou por onze versões remotas ausentes da pasta local.
- Ledger remoto: 2.552 versões distintas. Repositório: 3.009 arquivos SQL, 3.004 versões distintas e cinco prefixos duplicados (`20260525232003`, `20260622111500`, `20260622130000`, `20260623000008`, `20260902220800`). Comparação de IDs: 2.541 comuns, 463 locais somente e 11 remotas somente.
- As 11 remotas sem arquivo local são: `001`, `002`, `003`, `004`, `005`, `20260611014515`, `2026062311292414001`, `20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`, `20260623_fix_google_provider_secret_name`, `20260712`.
- Comparação nominal via `pg_catalog`: `public` contém 398 tabelas, 197 views e 15 enums presentes no inventário local. O inventário completo de funções ainda não foi reconciliado. Igualdade de nomes não comprova igualdade de definições.
- Nenhuma escrita, DDL, migration repair, deploy de edge function, reset ou cópia de dados operacionais foi realizada. Não aplicar/reparar versões até classificar os 463/11 IDs e os cinco prefixos duplicados via fluxo aprovado E15.

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

## P12 — Kit Coverage — Integration (identidade do teste incompatível com os grants)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha (main):** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**PR com fix:** [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) (draft — Gate Final ❌)  
**Run de falha no PR:** [40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177) (job Gate Final: 122981142154)  
**Status:** ❌ BLOQUEADO — o workflow consulta como `anon`; PR #2701 também tem checks de ledger/E40 em falha.

**Erro exato (main):**
```
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz confirmada em consulta read-only (2026-10-29):** O workflow fornece URL e chave publishable, mas não autentica uma sessão; as consultas são executadas como `anon`. No canônico `doufsxqlfjyuvxuezpln`, `anon` não tem `SELECT` na view `v_kit_component_complete` nem na tabela `product_kit_components`; `authenticated` e `service_role` têm. A view está configurada com `security_invoker=true`. A policy de leitura não substitui o `GRANT`. A fixture `KIT_FIXTURE_ID` também está vazia, mas isso não causa o erro de permissão.

**Fix implementado:** Migration `20261028120000_grant_kit_view_authenticated.sql` criada em branch `claude/fix-p12-grant-kit-view-261028-1730`, PR [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) aberto (draft).

**Status dos checks consultados em 2026-10-29:** a execução do PR #2701 ([run 40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177)) falhou no Deploy Gates; também falharam `db-schema-drift-check` ([run 40733948852](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948852)) e `migrations-sync-log-gate` ([run 40733948824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948824)). A divergência atual do ledger está discriminada em PEND-D02 (463 versões locais e 11 versões remotas sem correspondência); os números antigos `local_only=1109; remote_only=648` não são usados nesta revalidação por não coincidirem com o snapshot atual. O PR não está liberado para merge.

**Ação técnica necessária:** Ajustar o workflow/teste para autenticar com uma conta E2E somente-leitura aprovada e definir fixture determinística; verificar o escopo RLS e repetir o workflow. Não liberar `SELECT` a `anon` e não aplicar DDL diretamente. A migration do PR #2701 pode ser avaliada como grant versionado para ambientes novos, mas não corrige as chamadas anônimas e o PR segue bloqueado por `Deploy Gates`, `db-schema-drift-check` e `migrations-sync-log-gate` ([run 40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177), [run 40733948852](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948852), [run 40733948824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733948824)). Qualquer alteração no canônico segue exclusivamente o fluxo E15 depois da classificação e aprovação necessárias.

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

## Inventário completo da main — 2026-10-29

Consulta ao GitHub Actions: 119 workflows ativos; para cada um foi consultada a execução mais recente filtrada pela branch `main`. Resultado: 58 success, 31 failure, 4 cancelled, 2 skipped, 3 aguardando (`waiting`/`pending`) e 21 sem execução registrada na main. Os estados abaixo são por workflow (não por todos os checks/jobs de uma única execução).

| Workflow | Última execução na main | Causa/step que falhou e ação pendente |
|---|---|---|
| Copilot | [40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | Limite adicional de uso do plano Copilot atingido. Aguardar/resetar cota ou ajustar plano; não há correção de código. |
| Regenerate Supabase Types | [26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Step `Commit, push, and open PR` falhou; execução de 2026-05-25 e logs de diagnóstico não estão disponíveis na consulta atual. Reexecutar workflow e registrar a mensagem completa antes de corrigir. |
| edge-functions-drift-check | [40756284439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40756284439) | Gate `Fail if drift detected`: divergência entre funções do GitHub e funções canônicas; workflow criou `drift-report.csv`. Classificar conteúdo/órfãs/deploy antes de reconciliar; deploy só pelo workflow aprovado. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | Duas asserções de payload inválido recebem HTTP 503 (esperavam resposta abaixo de 500): body vazio e string crua. Investigar disponibilidade/versão da Edge Function chamada; não mascarar 503. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Step `Run Catalog→Kit Flow E2E`; 1 teste falhou (`e2e/flows/26-catalog-to-kit-flow.spec.ts`). O resumo não contém a asserção; usar artifact `e2e-full-flows-report-40762904577` para localizar a causa antes do fix. |
| Supplier Comparison CI | [39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Execução falhou, mas o endpoint de logs não retornou jobs/trecho de erro. Causa ainda não comprovada; recuperar artifact/log ou reexecutar antes de alterar código. |
| OptimizedImage E2E CI | [39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | Job `test`, step `Setup E2E` falhou; o trecho final disponível não inclui a mensagem-raiz. Recuperar log completo do step de setup ou reexecutar. |
| Global Search Quality Gate | [39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` reprova com `EUSAGE`: `package.json` e lock fora de sincronia; divergências reportadas em Supabase JS 2.117.3/2.118.0, jsPDF AutoTable 5.0.8/5.0.9, Lucide 1.54.0/1.58.0 e React/React DOM 19.3.0/19.3.1. Regenerar lock de forma controlada e validar. |
| db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | Step `Ledger parity (repo x canonical)` falhou por divergência do ledger; reconciliação/schema drift segue bloqueada pelo E40 e por PEND-D02. Não aplicar migration ou repair fora do fluxo autorizado. |
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | 3 testes falham com `permission denied` em `v_kit_component_complete` e `product_kit_components`. Reconsulta ao canônico: `authenticated`/`service_role` têm SELECT; `anon` não. O workflow usa apenas a chave publishable, sem autenticar sessão. Adaptar o teste à identidade E2E aprovada; `KIT_FIXTURE_ID` vazio é lacuna separada. Não conceder leitura anon. |
| E2E • Swatch QuickView | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Chromium/Firefox falham sem causa isolada no resumo; WebKit recebe sinal de shutdown do runner. Inspecionar artifacts dos navegadores e repetir em runner estável. |
| Update Quote Visual Snapshots | [39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | 7 testes falham; erro explícito `[E108] Sem orçamento enviado no ambiente`. Preparar fixture/dados de orçamento e revisar visualmente antes de atualizar snapshots. |
| E2E Discount Approval (04c*) | [39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Job do teste `04ck` falha em `Setup E2E`; log retornado não contém mensagem-raiz. Recuperar log/artefacto antes de qualquer alteração. |
| E2E • ColorSwatch 2 linhas (Grid) | [39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Job do grid falha; resumo disponível só registra conclusão do job, sem erro raiz. Recuperar artifact de Playwright ou reexecutar. |
| E2E · Dialogs visual PR check | [39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | Run marcada `failure`, mas não retornou job/step falho na ferramenta de logs. Diagnóstico pendente de logs/artifact; não atribuir causa sem evidência. |
| E2E · Check Calendar snapshots | [39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | Run marcada `failure`, sem job/step no resumo de falhas consultado. Recuperar artifact/log do snapshot; não atualizar baseline sem revisão visual. |
| E2E — Customization Collapse (LocationPanel) | [40490191645](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40490191645) | Step `Check baselines exist`: faltam seis baselines (expanded/collapsed × mobile/tablet/desktop). Criar/validar visualmente os baselines e reexecutar. |
| PDF Quality Gate | [39263929435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929435) | `scripts/qa/generate-proposal-pdf.mjs` falha com `ERR_MODULE_NOT_FOUND`: pacote `playwright` ausente. Alinhar setup/install ao uso do gerador. |
| E2E — PDF Dialog (watermark pixel-diff) | [39263928969](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263928969) | `Setup E2E` falha em resolução de pacote (`ERR_MODULE_NOT_FOUND` no trecho); obter nome completo do pacote e corrigir instalação, não mascarar. |
| PDF Visual Regression | [39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | Run marcada `failure`, mas logs consultados não retornaram job/erro. Recuperar artifact/log e identificar a asserção. |
| Magazine typed queries — dry-run | [39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | Step `Install dependencies` falha no dry-run de `magazine-typed-queries`; tail só mostra contadores esperados, sem a mensagem-raiz. Inspecionar log completo do install. |
| migration-dry-run | [35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname mascarado (`could not translate host name ... Name or service not known`). Corrigir secret/host de conexão no ambiente do workflow, sem expor credenciais. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | 6 testes falham porque a URL permanece `/magazine`, mas o teste espera `/magazine/<id>`; editor hero não aparece. Investigar criação/seleção de magazine e fixture. |
| Ratchet Weekly — Baixar baselines | [40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Step `Detectar se baselines melhoraram` termina com código 141 (SIGPIPE). Corrigir pipeline produtor/consumidor sem `|| true` nem relaxar gate. |
| E2E Cart — Matrix (E79) | [40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Job `cart-handoff` falha; log de resumo não expõe teste/asserção. Recuperar artifact Playwright antes de corrigir. |
| E2E Freight — Matrix (E80) | [39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup de autenticação E21 expira: login permanece em `/login`; causa alinhada à ausência/invalidade de credenciais E2E (P1). |
| E2E Stock — Matrix (E80) | [39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` falha com `EUSAGE`: lock e manifests fora de sincronia, inclusive versões divergentes de Supabase JS, React/DOM, Lucide e jsPDF AutoTable. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | 6 specs E2E falham: clique do botão `Começar pelos itens` é interceptado pelo header de busca/overlay; os testes de catálogo e kit não chegam ao estado esperado. Rever sequência/estado real de UI, sem enfraquecer a asserção. |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | 8 testes visuais de swatch esperam `[data-testid="product-card"]` e expiram em 20 s; shard Playwright tem 11 falhas em badges/tooltips, catálogo e kit; o artifact do shard deve ser consultado para cada erro antes de alterar snapshots/código. |
| E2E · Atualizar snapshots visuais (E155) | [39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | 5 testes do step de regeneração falham; o resumo não traz as asserções. Inspecionar artifact e aprovar visualmente antes de mudar snapshots. |
| Python Package using Conda | [39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | Step `Install dependencies` falha; trecho final não contém pacote/erro-raiz. Recuperar log completo e reproduzir antes de mexer no ambiente Conda. |

**Ainda sem conclusão:** as linhas que pedem artifact/log registram exatamente o step bloqueante conhecido, mas não autorizam inventar causa raiz. Deve-se recuperar a evidência indicada e atualizar esta tabela quando o erro for identificado.

---

## P14 — Dependabot: duas alertas high para `extract-zip`

**Status:** aberto no GitHub em 2026-09-27; não foi corrigido nesta auditoria.

**Evidência:** alertas [#68](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/68) e [#69](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/69) apontam `extract-zip` no `package-lock.json`, faixa vulnerável `<= 2.0.1`. O lockfile atual resolve `2.0.1`. O endpoint do Dependabot não informou uma `first_patched_version`; portanto, esta evidência não identifica uma versão segura para atualização.

**Ação necessária:** verificar o advisory e uma versão corrigida compatível; atualizar a dependência pela menor alteração segura, reproduzir/validar `npm ci`, build, lint, typecheck e suíte completa, e confirmar o fechamento dos dois alertas. Não afrouxar auditoria nem descartar alertas.

---

## P15 — PR #2695: rerun do Copilot Review recusado pelo GitHub

**Run:** [40763821243](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40763821243) — SHA `891f9a56dba99cff5a1f2ed0b1332e9c15e98519` — `failure`.

**Evidência disponível:** o final do log mostra `Cleaning up orphan processes` e tentativas de encerrar processos (`npm exec @playw`); não há, nesse trecho, erro de teste ou diagnóstico da aplicação. A tentativa de rerun de jobs falhos recebeu HTTP 403: `This workflow run cannot be retried`. Portanto, a causa técnica além da falha durante o encerramento do runner não está confirmada.

**Ação:** aguardar os checks pendentes do PR atualizado; se o Copilot Review voltar a falhar, revisar o novo run ou solicitar suporte do runner GitHub. PR permanece sem merge até todos os checks requeridos concluírem e ficarem verdes.

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 bloqueado por P7 (Opção B disponível via workflow_dispatch sem resolver P7). P13 requer deleção do projeto fantasma Vercel.*

---

## ADENDO — inventário atualizado em 2026-10-29

Esta seção registra as últimas execuções da `main` observadas nesta data. Os itens abaixo continuam falhando; erros E2E sem causa de infraestrutura comprovada ficam pendentes de reprodução e inspeção dos artefatos, sem atribuição especulativa.

| Workflow | Última execução com falha | Evidência observada | Situação |
|---|---|---|---|
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `permission denied for view v_kit_component_complete`; mesmo bloqueio descrito em P12 | P12 continua pendente; não conceder GRANT fora do fluxo aprovado |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | 4 jobs falharam: color-swatch (timeouts de seletores, 8 testes), Playwright shard 1 (11), magazine-header visual (14) e shard 2 (23). Artefatos do run contêm traces e screenshots | Causa comum ainda não comprovada; reproduzir cada grupo antes de corrigir |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | `26-catalog-to-kit-flow`: `expect(locator).not.toContainText(expected)` falhou ao verificar a lista do catálogo | Reproduzir e inspecionar `error-context.md` do artefato antes de alterar UI/dados |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | 6 E2E falharam: filtros/estado vazio do catálogo, transição de imagem e edição, criação e reset do Kit Builder | Causa raiz ainda não isolada; traces anexados ao run |
| E2E • Swatch QuickView | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Falha em Chromium/Firefox/WebKit; o log mostra setup de autenticação e servidor Vite ignorados, seguido de falhas na suíte. P10 documenta o risco de secrets e de produtos V2 ausentes | P10 pendente; confirmar autenticação e dados V2 antes de mexer no seletor |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | 2 testes de body vazio/string crua em `crm-db-bridge` receberam HTTP 503, mas esperavam resposta abaixo de 500 | Raiz ainda não determinada; verificar função implantada e dependências via leitura, sem deploy direto |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | Suite responsiva falhou com 14 casos; wrapper `Magazine Header OK` propagou a falha | Inspecionar traces/screenshots e reproduzir antes de corrigir |

### Copilot Review — PR #2719

Run [40818209296](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40818209296), no SHA `883b9a4d`, falhou por limite adicional de uso do Copilot e bloqueio de firewall a `api.github.com`. A nova tentativa [40819621886](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40819621886), no SHA `239d3737`, também falhou: `statusCode: 402`, `errorCode: quota`, `You've reached your additional usage limit for your plan`. O responsável do repositório precisa liberar/elevar a cota do Copilot Actions. Não contornar billing nem firewall; a falha mais recente aponta quota, não firewall.

### Correção do PR #2719

O Gate 1.3 apontou uma referência fictícia a uma migration `001.sql` (inexistente) na fixture `tests/scripts/graphify-metrics.test.mjs`. A fixture foi ajustada para compor o caminho em segmentos. Os três contratos de migration e o teste direcionado passaram localmente; `build:verify` e a suíte integral também passaram após o commit `239d3737`. O PR foi atualizado e aguarda novos checks; não foi mergeado.

## P14 — Revisor automático do Copilot (limite de uso e firewall)

**Workflow:** `copilot-pull-request-reviewer` no PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721)
**Run:** [40855745394](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40855745394) — check `123386150511`, SHA `159467243a2041b93af03affa98c51f7cfb7aadb`
**Status:** falha operacional do serviço de revisão, sem indicação de regressão no código.

**Erro exato do log:** a API do Copilot respondeu HTTP `402` com `You've reached your additional usage limit for your plan`; o agente também reportou bloqueio de firewall ao acessar `api.github.com`.

**Ação necessária do PO/administrador:** verificar e ampliar o limite de uso do Copilot ou aguardar a renovação do limite; ajustar a allowlist do firewall de Copilot Actions para permitir `api.github.com`; depois reexecutar o check. O check terminou em falha mesmo com os demais 22 checks do SHA concluídos com sucesso (7 skipped); o PR #2721 permanece aberto e não foi mesclado.


## P15 — Auditoria de sincronização local, GitHub e Supabase (2026-10-29)

Esta atualização substitui o estado operacional antigo de P7, P8, P12, P13 e P14 acima. Os registros anteriores ficam preservados como histórico.

### Código e GitHub

- A `main` remota e `origin/main` local estão no SHA `c344508711797a730893644449b16a05f12f4fce`.
- A correção de timers de `LocationPanel` e a fixture determinística de `wraparound-monitor-check` estão no branch remoto `fix/location-panel-timeout-cleanup`, SHA `3d8c6d7ee32afd201c327f15c4b092ca933fea01`, PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721). O branch está publicado e cinco commits à frente da `main`; o PR segue aberto.
- Validação local desse SHA: `npm run build:verify` passou; suíte completa passou com 1.210 arquivos e 25.658 testes aprovados, 131 arquivos/1.134 testes ignorados e 24 `todo`. O teste focado da fixture passou 13/13.
- No retrato de checks consultado, o PR #2721 tinha 49 sucessos, 4 falhas, 11 em andamento, 4 ignorados e 1 neutro, de 69 checks. Falhas: revisor Copilot (P14); `E2E · view-no-presentation-mode`; `webkit • swatch→QV`; `E2E — Personalization Journey`. O WebKit recebeu sinal de encerramento do runner; as demais falhas E2E precisam de diagnóstico antes de atribuir causa. Não mesclar enquanto checks obrigatórios estiverem em falha ou em andamento.
- O PR [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) segue aberto em rascunho. Seu escopo atual altera workflow, contrato/testes e documentação; **não contém migration**. No SHA `64c3299cf11471177e36047f5436b0312300489e`, o check de Edge Integration falhou e dois cenários WebKit foram encerrados pelo runner; Firefox e Chromium ainda estavam em andamento no retrato consultado.

### Supabase canônico `doufsxqlfjyuvxuezpln`

- A última execução consultada do `db-schema-drift-check` na `main`, [#40850667779](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40850667779), concluiu com sucesso. O run de auditoria read-only no branch do PR, [#40876229387](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40876229387), também concluiu com sucesso e reportou 1.901 versões alinhadas. Não foi executado DDL, migration repair ou alteração de dados nesta auditoria.
- A falha mais recente de Kit Coverage na `main`, [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454), confirma `permission denied` para `v_kit_component_complete` e `product_kit_components`.
- No branch do PR #2701, a autenticação e as consultas passaram, mas a validação read-only [#40874620158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40874620158) encontrou cobertura média de 56%, abaixo do limite de 70%; `component_description`, `primary_image_url`, `images` e `supplier_component_code` estão 100% nulos/ausentes na projeção testada. O threshold não foi reduzido. Qualquer correção de grants/schema depende de migration aprovada e do fluxo `db-apply-migration.yml` (REGRA #8); os dados faltantes exigem decisão sobre a fonte/projeção correta.
- O último `edge-functions-drift-check` consultado na `main`, [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790), falhou e o artefato `drift_report.csv` lista 29 funções com hashes divergentes: `ai-recommendations`, `bitrix-sync`, `cnpj-lookup`, `collections-watcher`, `connections-auto-test`, `connections-hub-audit`, `crm-db-bridge`, `e2e-cleanup`, `ema-pipeline-health`, `favorites-watcher`, `generate-ad-image`, `generate-mockup`, `kit-ai-builder`, `log-login-attempt`, `magazine-import-local`, `magazine-public-react`, `mcp-keys-issue`, `mcp-keys-revoke`, `migrate-helper`, `product-webhook`, `quote-sync-promo-champions`, `receive-crm-callback`, `secrets-manager`, `send-scheduled-reports`, `simulation-orchestrator`, `trends-insights`, `visual-search`, `webhook-dispatcher` e `webhook-inbound`. O relatório não classifica qual lado é a fonte correta; não redeployar em lote antes de comparar o conteúdo. Reconciliar pelo fluxo versionado de edge functions e repetir o drift check.

### Vercel e revisão automática

- Nos PRs #2721 e #2701, os deployments de preview falharam. Para #2721, o deployment `dpl_DQuWCfk9kxMH6xRLCZ2Cm5NML6CL` está em `ERROR` (`target=preview`, URL `promo-gifts-v4-bidofskh4-juca1.vercel.app`). O `vercel inspect --logs` confirmou o estado, mas não retornou a causa do build. No #2701, o status do GitHub apontou o deployment `dpl_HuGju4o5L7BunzckbtgrXE5QLvC4`. A hipótese antiga de projeto Vercel fantasma não foi confirmada por essa evidência; obter logs de build do Vercel antes de atribuir causa ou alterar configuração.
- A execução mais recente do revisor Copilot em #2721 é [#40882061472](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40882061472), SHA `3d8c6d7ee32afd201c327f15c4b092ca933fea01`. O log confirma HTTP 402 (`additional usage limit`) e bloqueio de firewall para `api.github.com`; é falha operacional do serviço, não um parecer de código.

**Conclusão desta auditoria:** o código local da correção está publicado em branch/PR e validado localmente; ainda não está na `main` nem em produção. O schema/ledger tem execução recente bem-sucedida, mas Kit Coverage permanece falhando e 29 Edge Functions continuam em drift sem classificação. O banco canônico não foi alterado. Os PRs e previews permanecem bloqueados pelos checks/deploys acima.


## P16 — Inventário das últimas falhas de workflows na `main` (2026-10-29)

Critério: apenas a execução mais recente de cada workflow na `main`; runs de PR são listados separadamente em P15.

| Workflow | Último run | Estado | Causa/evidência disponível |
| Uptime Monitor | [#40883033798](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40883033798) | failure | Issue [#2727](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2727): site `0`, `health-check` curl `22`, `check-login` OPTIONS `0`, Auth `0`. Uma chamada read-only posterior a `health-check?fresh=1` respondeu com `database=healthy` e `external_db=healthy`; provável intermitência, ainda não encerrada até haver run agendado verde. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | failure | 29 funções divergentes, detalhadas em P15; a evidência não determina qual hash é a fonte correta. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | failure | `permission denied` para `v_kit_component_complete` e `product_kit_components`; P12/P15 registram a validação e os limites para correção. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | failure | Falharam E2E visual `color-swatch`, shards 1 e 2 do Playwright E2E e E2E visual `magazine-header`. Os trechos de log disponíveis mostraram encerramento/limpeza do runner, sem causa de assertion suficientemente legível; investigar os artefatos de teste antes de alterar testes ou snapshots. |
| CI Security & Drift Checks | [#40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | failure | Gate de E2E crítico: no fluxo Kit Builder, o modal/overlay interceptou o clique em “Começar pelos itens” e causou timeout; o cenário de catálogo também registrou `TypeError: Failed to fetch`. São duas causas a reproduzir separadamente. |
| E2E • Swatch QuickView (Lista + Tabela) | [#40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | failure | Chromium e Firefox falharam; o job WebKit recebeu sinal de encerramento do runner antes de concluir. A execução repetida em PR também foi cancelada pelo runner, portanto não há validação de correção. |
| E2E — Critical Flows & Error Boundaries | [#40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | failure | Fluxo autenticado Catálogo → Kit falhou no caso “catalog loads product list without crash”; rotas críticas mobile e error boundaries passaram. |

Nos 38 workflows com execução encontrada desde 2026-10-28, os demais concluídos não aparecem como falha; dois estavam `pending` no momento da consulta (`SECURITY DEFINER ACL — Multi-Env` e `E2E · restore_seller_cart RPC (multi-env)`) e não foram classificados como falha. Workflows antes verdes devem continuar verdes após as correções.

**Próximo passo:** diagnosticar os sete workflows acima por causa raiz, reproduzir antes/depois e abrir correções em PRs. O `health-check` precisa de uma próxima execução agendada com sucesso para fechar a ocorrência; nenhuma alteração de dados ou schema canônico é necessária com a evidência atual.

## P17 — Revalidação da main e sincronização local × GitHub × Supabase — 2026-10-29

Esta seção substitui o retrato operacional anterior de P16 e esclarece os registros históricos P1/P10 quando conflitarem com as evidências abaixo.

### Inventário atual da `main`

Critério: catálogo completo do GitHub Actions (páginas 1–2, 119 workflows ativos) e, para cada workflow, consulta individual com `branch=main`, `exclude_pull_requests=true`, `per_page=1`. Snapshot de 2026-10-29. Não são falhas os workflows sem run, cancelados, skipped, pendentes ou aguardando aprovação.

| Estado da última execução na `main` | Quantidade |
|---|---:|
| `success` | 63 |
| `failure` | 26 |
| `cancelled` | 4 |
| `skipped` | 2 |
| `pending` | 2 |
| `waiting` | 1 |
| Sem execução na `main` | 21 |

Os 63 workflows `success` na consulta individual são: Branch Protection Sentinel; CodeQL; Cross-reference PR ↔ Issue; Deploy to Vercel (Manual Fallback); Security Scan; Quote Builder Delivery Quality; Dependabot Updates; Sync labels; Contract Tests; Required Checks Guard; Deploy Gates; Gitleaks — Full History Audit; Lint untypedFrom; Edge Integration Tests — All Functions; E2E — Critical Flows & Error Boundaries; E2E — Personalization Flow; CI — Replenishment Module Quality Gate; Static Health Checks; Lovable Edit Tracker; db-schema-drift-check; Lovable Autoheal; Supabase Linter Gate; stock-rupture-fuzz; Quote Number Hardening — Verify; E2E — Visual Regression (Preview button); schema-snapshot-export; drafts-index-check; UI · Visual & A11y; E2E · Update Confirm Dialog snapshots; E2E · Update Alert Dialog snapshots; E2E · Update Dialog snapshots; E2E · Update Quote Freight snapshots; E2E · Update Calendar snapshots; E2E — Customization Collapse (LocationPanel); PDF Quality Gate; E2E — CRM Callback; URL State — Unit & Fuzz; Magazine Unit Tests; Gate 5 — Supabase Security Audit; E2E · Update Magazine Ring snapshots; Magazine Flakiness Guard; Magazine Mutation Testing; SSOT Supabase Guard; log-login-attempt — Fuzz Stress Weekly; Auth surface fuzz (weekly); Daily flows simulation; TS Unused Locals Ratchet; Uptime Monitor; capacity-growth-report; ddl-out-of-band-detector; pgss-slo-report; wraparound-monitor-report; Workflow Lint; Template — Workflow Name Here; CI Metrics Weekly; Policies Baseline; Release Please; No Prod Leak in Dev/Test Config; Select Columns vs Types; E2E Focused UI — Matrix; Cache Prune; DR Drill Reminder; Mark stale issues and pull requests. Runs representados por links: Deploy Gates [#40920388855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388855), Branch Protection Sentinel [#40920389139](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389139), CodeQL [#40920388970](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388970), Security Scan [#40920389009](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389009), SSOT Supabase Guard [#40920389025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389025), E2E Personalization [#40920389117](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389117), CI Replenishment [#40920388867](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388867) e Customization Collapse [#40920388936](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388936).

Sem execução na `main` (21): Delete Orphan Edge Functions; Copilot code review; Copilot cloud agent; Sentinel Self-Test; auto-regenerate-types.yml; pages-build-deployment; E2E Update Quote Conditions snapshots; Bundle size report; migrations-sync-log-gate; E2E Update Quote No-Pres snapshots; `_secrets-check`; E2E Quotes Matrix; PR Size Guard; NodeJS with Webpack; Deno; Jekyll site CI; Codacy Security Scan; Dependency review; Node.js CI; `.github/workflows/main.yml`; E2E Update Quote Missing-Fields snapshots.

| Workflow | Última execução | Estado | Evidência / causa provável |
| Copilot | [#40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | `failure` | Limite adicional de uso do Copilot atingido; resposta explícita do serviço. Bloqueio operacional do plano/quota, não resultado de revisão de código. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | `failure` | Step `Commit, push, and open PR`; a API de logs devolveu HTTP 410. Causa técnica do step não pode ser confirmada com a evidência retida; run muito antigo. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | `failure` | `Fail if drift detected` encontrou divergência de conteúdo/estado entre repositório e funções canônicas. Não aplicar nem remover função por fora do fluxo versionado de deploy; identificar cada função divergente no log completo e reconciliar por PR. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | `failure` | A API de resumo não retornou jobs falhos nem logs, apesar da conclusão `failure`; causa não verificável pelo resumo disponível. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `failure` | Step `Setup E2E` falhou; resumo não preserva erro-raiz. Não atribuir a secret ausente sem log. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `failure` | `Setup E2E` e `Install dependencies` falharam; resumo/log recuperável não contém diagnóstico suficiente para atribuir causa comum. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `failure` | Teste como `anon` recebe `permission denied` em `product_kit_components` e `v_kit_component_complete`. Corrigir a fixture/identidade autenticada do teste; não conceder leitura pública para fazê-lo passar. |
| E2E • Swatch QuickView | [#40920389028](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389028) | `failure` | Firefox falha no clique/fluxo do swatch-QuickView; o artefato confirma grade estreita, camada absoluta de ações interceptando clique, toolbar fora da viewport e componentes satélite V1 frente ao contrato V2. WebKit recebeu shutdown do runner. Correção de layout aguarda proposta visual aprovada; nenhuma asserção será removida ou forçada. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `failure` | E2E falha com `[E108] Sem orçamento enviado no ambiente`; o ambiente não tem fixture/orçamento submetido requerido pelo spec. |
| E2E Discount Approval | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `failure` | Steps `Setup E2E` falharam; logs disponíveis não expõem a causa específica. Confirmar configuração e autenticação E2E antes de classificar como falha da aplicação. |
| E2E ColorSwatch Grid | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `failure` | Step `Setup E2E` falhou; resumo não expõe causa específica. Necessário obter/reproduzir setup daquele run antes de alterar o teste. |
| E2E Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | `failure` | Conclusão `failure`, mas resumo API não contém job/step falho; causa não verificável pelo material retido. |
| E2E Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | `failure` | Conclusão `failure`, mas resumo API não contém job/step falho; causa não verificável pelo material retido. |
| E2E PDF Dialog | [#40893179038](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40893179038) | `failure` | E2E falha com `[E108] Sem orçamento no estado "rascunho" no ambiente`; falta fixture correspondente no ambiente do teste. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | `failure` | Conclusão `failure`, sem jobs/logs de falha retornados pelo resumo; causa não verificável. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `failure` | Step `Install dependencies` falhou; log recuperável não contém erro do gerenciador de pacotes. Reproduzir no workflow isolado antes de alterar dependências. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `failure` | Step `Dry-run drafts` saiu com código 1; log retido não identifica qual migration/asserção causou a falha. Não aplicar migration como tentativa diagnóstica. |
| E2E Magazine Header Layout | [#40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | `failure` | E2E `expect(page).toHaveURL(expected)` falhou; precisa alinhar expectativa de rota ao comportamento aprovado e reproduzir sem enfraquecer o teste. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | `failure` | Step `Detectar se baselines melhoraram` falhou durante comparação; log mostra diff de chunks, mas não o motivo/limite decisório. Revisar artefatos e comparação antes de atualizar baseline. |
| E2E Cart — Matrix | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | `failure` | Um job falha no login E2E; outro expira em `locator.click` após 120 s no popover de remoção. São dois diagnósticos distintos; reproduzir ambos. |
| E2E Freight — Matrix | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `failure` | Setup de autenticação termina com `E21 — login falhou em CI`; precisa verificar credenciais/serviço no período do run. |
| E2E Stock — Matrix | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `failure` | `npm ci --no-audit --no-fund` falhou em dois jobs; log resumido não retém stderr do npm. Reproduzir instalação no lockfile daquele SHA; não atualizar dependências por tentativa. |
| CI Security & Drift Checks | [#40920388986](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388986) | `failure` | Sete specs autenticados falharam. Evidência do run: `E2E_HAS_CREDS=true`, mock de health 200/30 ms, token Auth 200 após 62,4 s; REST `system_settings` 15–54 s e `get-visitor-info` 66 s; o login permaneceu em `/login` além do timeout de 75 s. Forte evidência de latência, sem causa operacional raiz confirmada. Investigar logs de Auth/REST/Edge no horário do run; não alterar credenciais nem elevar timeout para mascarar. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | `failure` | Dois jobs E2E: seletor ColorSwatch excede 20 s e clique do Kit Builder excede 120 s. Reproduzir cada spec separadamente e classificar ambiente versus regressão. |
| E2E Update snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | `failure` | Regeneração falha com `element(s) not found`; não atualizar snapshot sem confirmar o elemento/fluxo esperado. |
| Python Package using Conda | [#39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | `failure` | Instalação interrompida por exigência de aceitar os Termos de Serviço do Anaconda nos canais configurados; causa externa ao código Python. |

Estados não classificados como falha: `cancelled` — E2E (Playwright) [#40920389589](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389589), Visual Baseline Tests — Nightly [#40920388949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388949), DB — Aplicação controlada de migration única (E15) [#40894446881](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40894446881) e E2E · Update Quote Item Editor Sheet snapshots [#40535938041](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40535938041); `skipped` — Deployment Failure Alert [#40920479524](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920479524) e Lovable Protected-File Audit [#40920388784](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388784); `pending` — SECURITY DEFINER ACL — Multi-Env [#40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158) e E2E · restore_seller_cart RPC (multi-env) [#40852813455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40852813455); `waiting` — Deploy Edge Functions [#40757296680](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40757296680). Estes estados foram mantidos separados da categoria `failure`.

Estados não classificados como falha: `E2E (Playwright)` [#40920389589](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389589) e `Visual Baseline Tests — Nightly` [#40920388949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388949) terminaram `cancelled`; `SECURITY DEFINER ACL — Multi-Env` [#40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158) permanece `pending`. Os demais 27 runs concluídos permanecem `success`; dois foram `skipped` pelas condições documentadas nos próprios workflows.

### PR #2734 — corrigido e validado, merge ainda bloqueado

- A correção do smoke de containers está no PR [#2734](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2734), commit `d6136ea9bc2eef2d96d8bf8124268e1d76dc259d`. O fallback do GHCR para a tag oficial `supabase/postgres:17.6.1.063` do Docker Hub foi efetivamente exercitado: o run [#40931990305](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40931990305) concluiu `success`; o log confirma pull no Docker Hub com digest `sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426` e testes de contrato concluídos.
- Deploy Gates [#40931990408](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40931990408), incluindo o required check `Gate Final - Deploy Ready`, concluiu `success`. Unit, E2E Smoke, lint/TypeScript, build, integridade PostgreSQL e verificações de segurança também passaram.
- Revisor Copilot [#40932007280](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40932007280) falhou com HTTP 402: limite adicional de uso da conta esgotado. Ação necessária: administrador rever o limite/renovação de uso do Copilot e reexecutar o check.
- O status do preview Vercel ficou em falha para o deployment `dpl_37mCecyXedPxk1a1Cm1LqTmYSa4r`. A inspeção local `vercel inspect ... --logs` retornou apenas `status Error`, sem log ou causa raiz; diagnóstico permanece pendente. Não foi atribuído ao código nem à infraestrutura sem evidência.
- O PR permanece aberto. Embora os gates requeridos estejam verdes, não foi mesclado enquanto existirem esses status externos/sem diagnóstico, conforme a regra de merge do processo.

Validação local após os dois commits do PR: `npm run build:verify`, actionlint/shellcheck e suíte completa passaram sem regressão (1.210 arquivos de teste aprovados, 131 skipped; 25.659 testes aprovados, 1.134 skipped e 24 TODO — mesmos números do baseline). O PR altera somente `.github/workflows/contract-tests.yml`; não modifica comportamento da aplicação, APIs ou banco.

### Paridade local, GitHub e banco canônico

- Checkout raiz `/home/joaquim_ataides/projetos/Promo_Gifts_V4`: branch `fix/location-panel-timeout-cleanup`, HEAD `00412ccc3`, igual ao branch remoto rastreado; comparado a `origin/main` (`6b48bebc`), o branch tem 8 commits exclusivos e não contém 1 commit exclusivo de `main`. Há três alterações locais Graphify não commitadas (`.graphifyignore`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`); foram preservadas, sem reset/overwrite. O worktree da correção documental é `/tmp/v4-audit-report-20261029`, branch `docs/auditoria-sync-ci-20261029`, base `main` `6b48bebc`, PR aberto #2735.
- O banco canônico `doufsxqlfjyuvxuezpln` foi identificado pela API como `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.063. Consulta somente leitura confirmou ledger `supabase_migrations.schema_migrations` com 2.552 registros e 2.552 versões distintas. No branch local há 3.009 arquivos SQL, 3.004 versões distintas, zero nomes fora de `^\d{14}_` e cinco prefixos duplicados: `20260525232003`, `20260622111500`, `20260622130000`, `20260623000008`, `20260902220800`. A comparação de IDs registrada na seção 9 do `RELATORIO_CI.md` aponta 2.541 compartilhadas, 463 locais e 11 remotas. Saúde do projeto não equivale a paridade do ledger/schema; não foi alegada igualdade de conteúdo ou schema vivo.
- Nenhum DDL, migration, `repair`, deploy de função ou alteração de dados foi executado. A reconciliação requer classificação/aprovação por versão e o fluxo versionado; os dados operacionais de clientes/produtos não devem ser copiados para o GitHub.

**Próximas ações:** (1) reproduzir as 26 falhas por grupo com o ambiente correspondente e atualizar cada run via rerun seguro/execução normal; os casos sem logs/job têm causa explicitamente não confirmada; (2) obter aprovação visual antes de corrigir swatches; (3) investigar latência de Auth/REST/Edge sem expor dados ou mudar secrets; (4) titular/admin tratar quota do Copilot; (5) classificar as 474 diferenças do ledger e cinco prefixos duplicados antes de qualquer reconciliação. Nenhum workflow foi reexecutado nesta auditoria, pois alguns envolvem publicação de snapshots, migration ou operações externas e não eram seguros para rerun indiscriminado.

## P19 — Revalidação de sincronização e Graphify — 2026-10-29T21:35Z

### Código e GitHub

- Checkout limpo na branch `fix/graphify-reproducible-version-20261029`, HEAD `debcd712a278d5ec2d6353cc670ad8a5335c06b1`, igual ao branch remoto.
- `main` local e `origin/main` coincidem em `66d032afa8e31cd4f9b2f60508613794cef928d4`.
- PR [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743) está aberto, `mergeable=true`, mas `mergeable_state=blocked`. No snapshot consultado às 21:35 UTC havia 46 checks: 11 sucessos, 4 ignorados, 1 neutro, 1 falha, 22 em fila e 7 em execução. A falha do Copilot Reviewer é HTTP 402 por limite de uso esgotado e bloqueio de firewall para `api.github.com` ([run](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40956599165/job/123738194938)). O status do preview Vercel também falhou; o deployment [C1PJS46Myp56uWZ2cWJiD68EsNHo](https://vercel.com/juca1/promo-gifts-v4/C1PJS46Myp56uWZ2cWJiD68EsNHo) consta como `ERROR`, mas a consulta de logs não expôs causa. Não mesclar enquanto checks obrigatórios estiverem pendentes ou falhos.
- A listagem atual retornou 14 PRs abertas. As PRs seguem sem merge nesta etapa; conflitos e decisões de governança devem ser revalidados individualmente antes de qualquer integração.

### Últimas execuções na `main` — snapshot 2026-10-29T21:34Z

Inventário feito consultando individualmente os 119 workflows ativos com `branch=main` e `per_page=1`. Apenas a última execução encontrada por workflow foi classificada.

| Estado | Quantidade |
|---|---:|
| `success` | 58 |
| `failure` | 27 |
| `cancelled` | 3 |
| `in_progress` | 3 |
| `queued` | 2 |
| `pending` | 2 |
| `skipped` | 2 |
| `waiting` | 1 |
| Sem execução na `main` | 21 |

As 27 falhas mais recentes:

| Workflow | Run | Evidência / causa atual |
|---|---|---|
| Copilot | [40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | HTTP 402: limite adicional de uso esgotado. Bloqueio externo de quota. |
| Regenerate Supabase Types | [26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Step de commit/push/PR falhou; logs expiraram com HTTP 410. Causa técnica não verificável com a evidência retida. |
| edge-functions-drift-check | [40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | 29 hashes de Edge Functions divergem; o artefato não identifica qual lado é fonte legítima. |
| E2E Critical Flows & Error Boundaries | [40949474074](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474074) | `Run Quote Full Flow E2E` terminou exit 1; o resumo disponível não contém assertion/causa-raiz. |
| Supplier Comparison CI | [39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | API não retornou jobs/logs para a execução. Causa não verificável. |
| OptimizedImage E2E CI | [39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `Setup E2E` falhou; resumo não preserva o motivo. A atribuição anterior a lockfile permanece não comprovada. |
| Global Search Quality Gate | [39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | Setup/instalação falhou; resumo não contém stderr conclusivo. Há registro antigo de lockfile divergente, não confirmado nesta falha. |
| CI Replenishment Module Quality Gate | [40949474442](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474442) | Auditoria E2E de paridade visual `/novidades` × `/reposicao` falhou; sem assertion no resumo. |
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | Três testes anon recebem `permission denied` em `v_kit_component_complete` e `product_kit_components`. Não conceder SELECT a `anon`; modelar teste autenticado ou corrigir o contrato com aprovação. |
| Update Quote Visual Snapshots | [39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `[E108]`: fixture de orçamento enviado ausente; sete testes falharam. |
| E2E Discount Approval | [39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `Setup E2E` falhou; resumo não preserva a causa-raiz. |
| E2E ColorSwatch Grid | [39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `Setup E2E` falhou; resumo não preserva a causa-raiz. |
| E2E Dialogs visual PR check | [39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | API não retornou jobs/logs. Causa não verificável. |
| E2E Check Calendar snapshots | [39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | API não retornou jobs/logs. Causa não verificável. |
| E2E PDF Dialog | [40893179038](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40893179038) | Trecho do job indica drift do threshold e artefato `watermark-threshold-recalibration-*`; o registro antigo que atribuía a falha à fixture E108 não corresponde a este run. |
| PDF Visual Regression | [39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | API não retornou jobs/logs. Causa não verificável. |
| Magazine typed queries — dry-run | [39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `Install dependencies` falhou; resumo não preserva stderr conclusivo. A hipótese antiga de lockfile ainda precisa ser reproduzida. |
| migration-dry-run | [35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname mascarado; confirmar DNS/conectividade do runner sem expor secrets. |
| E2E Magazine Header Layout | [40949474466](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474466) | `Run Magazine Header E2E` terminou exit 1; sem assertion-raiz no resumo. |
| Ratchet Weekly | [40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Exit code 141/SIGPIPE no passo de comparação. A correção proposta no workflow ainda não tem execução verde na `main`. |
| E2E Cart — Matrix | [40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Registro da execução indica timeout de login e timeout de clique no popover de remoção; o resumo atual não isola qual assert causou a conclusão. |
| E2E Freight — Matrix | [39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup Auth E21: usuário de teste permaneceu em `/login`; reproduzir a configuração de autenticação. |
| E2E Stock — Matrix | [39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` falhou; resumo/tail não confirma a raiz. O diagnóstico antigo de EUSAGE/lockfile precisa de reprodução. |
| CI Security & Drift Checks | [40949474454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474454) | Os testes E2E críticos reportaram dez falhas, sem detalhes das assertions no resumo consultado. |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Falhas E2E em seletores ColorSwatch/Kit Builder e visuais Magazine Header conforme relatório; causa comum não demonstrada. |
| E2E atualizar snapshots visuais (E155) | [39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | Elementos esperados não encontrados; cinco falhas. Não atualizar snapshot sem confirmar contrato visual. |
| Python Package using Conda | [39670397287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39670397287) | `EnvironmentFileNotFound`: workflow referencia `environment.yml` ausente. Correção deve apontar para manifesto existente ou versionar o ambiente requerido, sem contornar o erro. |

Os status não terminais/fora de falha no mesmo snapshot foram mantidos separados: `in_progress` — Visual Baseline Tests — Nightly [40949473771](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949473771), Edge Integration Tests — All Functions [40949473466](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949473466), E2E Swatch QuickView [40949474491](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474491); `queued` — Deploy Gates [40949474206](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40949474206), Uptime Monitor [40958856642](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40958856642); `pending` — SECURITY DEFINER ACL — Multi-Env [40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158), E2E restore_seller_cart RPC [40852813455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40852813455); `waiting` — Deploy Edge Functions [40757296680](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40757296680). Não são falhas concluídas.

**Baseline × final desta revisão documental:** `npm run build:verify` passou (typecheck, lint baseline sem regressões, guards e build); `npm test -- --reporter=dot` passou com 1.222 arquivos, 25.718 testes aprovados, 130 arquivos/1.135 testes skipped e 24 TODO. O snapshot principal de workflow é atual até 21:34 UTC; validação local concluída às 21:44 UTC. Nenhum workflow foi rerun e nenhum teste/snapshot foi enfraquecido.

### Supabase canônico — leitura apenas

- Projeto `doufsxqlfjyuvxuezpln`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.063. O ledger tem 2.552 versões; a mais recente é `20261027160000`.
- O repositório contém 3.009 arquivos SQL e 3.004 IDs distintos, com 2.541 IDs compartilhados, 463 somente locais, 11 somente remotos e cinco grupos de IDs duplicados, conforme a comparação registrada em P18. A divergência permanece aberta e requer classificação por migration; nenhuma contagem autoriza `repair` ou DDL.
- Consulta somente leitura em `pg_catalog` comparou nomes em `public`: 398 tabelas (incluindo particionadas), 197 views e 15 enums; todos os nomes coincidem com `src/integrations/supabase/types.ts`. As 1.334 funções vivas incluem overloads e não foram comparadas por assinatura/definição; o inventário TypeScript lista 1.020 nomes de funções. Igualdade dos nomes de objetos não prova igualdade de colunas, políticas ou definições.
- Nenhuma escrita, DDL, migration, repair, deploy de Edge Function ou cópia de dados operacionais foi executada.

### Graphify — consistência documental

- A saída Graphify foi regenerada com a versão homologada `graphifyy 0.9.91` sobre o SHA `7eea1696`: 40.829 nós, 69.366 arestas e 2.207 comunidades; 14.730 nós de baixa conectividade em 17.972 nós de código elegíveis. O relatório e os números estão alinhados em `docs/graphify/AUDITORIA_MAPAS_E_BENCHMARK_2026-10-29.md`.
- A execução documentada do mapa SQL separado usou 3.189 arquivos versionados, 20.306 nós e 21.533 arestas. A saída permanece local/ignorada; nenhum conteúdo do banco foi exportado para o grafo.
- A instrumentação TypeScript contou 1.714 pares de referências; zero arestas novas foram adicionadas porque as relações já estavam presentes. Foram ignoradas 10.343 referências externas; 46 arquivos de origem e duas declarações não tinham nó interno mapeável.

## P20 — estado após sincronização com `main` e checks dos PRs — 2026-10-29T23:23Z

### Branch Graphify e validação local

- A branch `fix/graphify-reproducible-version-20261029` foi sincronizada por merge normal com `origin/main` no SHA `9a97f9a2c857b25590691efd2c741a194bfb24da`; o merge é `8021e0d58`. A resolução manteve `PENDENCIAS.md` da branch porque continha evidências P18/P19 posteriores que faltavam na versão da `main`.
- O PR [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743) foi atualizado até `5818692d243e2f3ede2d4ff8bfb69f86f5e50090`. `origin/main` é ancestral da branch; o checkout local está publicado e sem conflitos.
- Após o merge, `npm run build:verify` passou: typecheck, ESLint com 0 erros/0 avisos e sem regressões, guard SSOT, build Vite, ciclos de chunks e harnesses de produção.
- A suíte completa passou após o commit final: 1.247 arquivos e 25.871 testes aprovados; 130 arquivos/1.135 testes skipped e 24 TODO. O baseline imediatamente anterior ao refresh Graphify teve os mesmos totais. Nenhum teste foi removido ou enfraquecido.
- A saída Graphify foi atualizada com `npm run graphify:refresh`, fixado em `graphifyy==0.9.91`, a partir da árvore de código do merge `8021e0d58`: 41.230 nós, 69.904 relações após referências TypeScript, 2.163 comunidades e 14.852 nós de baixa conectividade em 18.109 nós de código elegíveis. Exclusões: 4.134 nós estruturais, 5.445 de configuração, 13.420 não código e 122 dependências. Esse snapshot posterior é distinto do benchmark histórico em `7eea1696`.
- Nenhuma migration, DDL, repair, deploy de Edge Function ou escrita no Supabase foi feita.

### Checks externos ainda bloqueando integração

- PR #2743: os check runs do GitHub consultados no novo HEAD não indicavam falha nem fila. O status de commit do Vercel, porém, está `failure` no deployment [`dpl_7hEenqjmJq6mxN1oTAuZzZKrDisb`](https://vercel.com/juca1/promo-gifts-v4/7hEenqjmJq6mxN1oTAuZzZKrDisb). `npx vercel inspect ... --logs` retornou somente `status Error`, sem `errorCode`, mensagem ou log de build. `Devin Review` aparece como sucesso técnico, mas a descrição confirma que a revisão foi ignorada por trial encerrado/sem créditos; não conta como revisão realizada. Não mesclar enquanto o status obrigatório do Preview estiver falho.
- PR #2747 — [Gate 5 — Supabase Security Audit, run 40970640671](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640671): o audit SECURITY DEFINER passou em 570 funções; o smoke subsequente recebeu HTTP 500, 504 e 500 em três tentativas e encerrou como `inconclusive` por indisponibilidade do serviço. Rerun somente desse workflow read-only foi solicitado; tentativa 2 está `queued` neste snapshot.
- PR #2747 — [CI - Replenishment Module Quality Gate, run 40970640650](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640650): dois specs autenticados falharam no login. `check-login` retornou 200, mas o token Auth demorou 17,155 s; `system_settings` demorou 47,192 s e `get_profile_and_roles` permaneceu pendente por 42,878 s. No retry, chamadas a Auth/PostgREST também ficaram pendentes por 35–80 s. Evidência compatível com lentidão/disponibilidade da API canônica; causa operacional raiz ainda não foi identificada. Não alterar o teste nem aumentar timeouts para ocultar o sintoma.
- PR #2747 — [Copilot Reviewer, run 40970654901](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970654901): falha no job de revisão automática durante preparação/firewall do agente. É infraestrutura do serviço Copilot, sem correção de código comprovada.
- PR #2747: o deployment Vercel [`dpl_HDE1NN5Stb2tz79XJrRmN4412wwB`](https://vercel.com/juca1/promo-gifts-v4/HDE1NN5Stb2tz79XJrRmN4412wwB) também está `ERROR`, sem causa exposta pela CLI.
- PR #2745 permanece atrás da `main`; seus checks incluem itens em fila. Nenhum dos PRs #2743, #2745 ou #2747 foi mesclado nesta etapa.

**Próxima ação:** consultar os logs/alertas operacionais do Supabase para Auth/PostgREST no intervalo 23:05–23:20 UTC e obter o detalhe do build no painel Vercel; aguardar o rerun read-only do Gate 5. Revalidar os checks dos três PRs antes de qualquer decisão de merge.

## P21 — revalidação de CI, sincronização do PR Ratchet e referências de migrations — 2026-10-29T23:46Z

### PR #2745 — branch atualizada com `main`

- Merge normal de `origin/main` (`9a97f9a2`) em `fix/ratchet-weekly-sigpipe-20261029`, commit `47b6f55e3e32d68e36bd86281da48c9779ff136f`; sem conflitos e com a `main` como ancestral.
- `npm run build:verify`: passou (typecheck, lint baseline, build, guards, ciclos e harnesses). `npm test`: 1.247 arquivos passaram; 25.869 testes passaram, 1.135 skipped e 24 TODO.
- O push normal foi concluído; o primeiro bloqueio do hook foi OOM do ESLint no heap padrão. Repetição com `NODE_OPTIONS=--max-old-space-size=4096` executou o mesmo hook integralmente, com 0 erros, 0 warnings e 0 regressões.
- No snapshot 23:46Z, workflows deste head: 1 `success`, 10 `queued`, 1 `in_progress`, 2 `skipped` e 1 `neutral`; nenhum check de qualidade concluído aparece como falha. Vercel Agent Review foi pulado por billing desabilitado e não conta como review. PR [#2745](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2745) segue sem merge até todos os checks obrigatórios terminarem.

### PR #2743 — estado atualizado e causa comprovada do Copilot

- Head `632d1f1411e62d41c694d3cda952867ea628f61a`; no snapshot 23:46Z, 57 check runs: 24 `success`, 18 `queued`, 8 `in_progress`, 5 `skipped`, 1 `failure` e 1 `neutral`.
- Copilot Reviewer falhou no run [40973814939](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40973814939): log informa limite adicional de uso atingido (HTTP 402/quota) e bloqueio de `api.github.com` pelo firewall do runner. É bloqueio de serviço/configuração; não há correção de aplicação demonstrada. Vercel Agent Review foi pulado por billing desabilitado.
- O Preview Vercel continua falhando no deployment [`dpl_CiCk44mFZqGRKWxjwCkpdwgv222c`](https://vercel.com/juca1/promo-gifts-v4/CiCk44mFZqGRKWxjwCkpdwgv222c). `vercel inspect --logs` retornou apenas `status Error`, sem código/etapa que permita atribuir causa. PR [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743) permanece bloqueado.

### PR #2747 — gates e diagnóstico de E2E

- O rerun read-only do Gate 5 terminou com sucesso na tentativa 2 do run [40970640671](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640671); o registro anterior de `inconclusive` em P20 é histórico e foi substituído por este resultado.
- O Gate 1.3 — contrato de referências de migrations falhou no run [40970640916](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640916) por nove caminhos inválidos em `analise-prs/`: duas referências apontavam para arquivo ausente/versão sem nome; outras eram propostas em branches de PR, não arquivos da `main`. Os caminhos versionados foram corrigidos e a proposta não mesclada foi rotulada como ausente da `main`; `node scripts/check-migration-path-references.mjs` agora passa sem novas referências quebradas. Nenhum arquivo de migration foi criado ou alterado.
- QuickView continua falhando nos três browsers no run [40970640906](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640906): a spec depende do catálogo remoto para encontrar produto com `color_swatches V2`; executou 5 testes, 4 com falha inesperada e skips acima do limite. Não há fixture de produto determinística nesse workflow. Não reduzi o gate nem converti falhas em skips.
- Full User Flows falhou em [40970640931](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640931): 9 de 10 testes foram skipped porque a sessão de teste permaneceu em `/login`. O setup usa login real; chamadas Auth/PostgREST apresentaram 504 e longas pendências em execuções correlatas. A evidência aponta latência/indisponibilidade e sessão ausente, mas não demonstra uma única causa operacional; não alterar credenciais, timeouts ou limiares por hipótese.
- CI Replenishment falhou no E2E autenticado [40970640650](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640650), também com sessão em `/login` e chamadas Auth/PostgREST lentas. Copilot Reviewer falhou por limites do serviço. O PR [#2747](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2747) segue bloqueado por Gate 1.3 no head antigo e E2E não verdes.

Nenhum banco foi escrito; nenhuma migration, DDL, repair, deploy de Edge Function ou mudança de comportamento da aplicação foi executada. As pendências externas são: billing/quotas do Copilot e Vercel, diagnóstico do build Vercel no painel e disponibilidade/Auth/PostgREST do Supabase para E2E autenticado. Nenhum merge foi feito.
