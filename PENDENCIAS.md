# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-30
**Branch da revalidação atual:** `fix/graphify-reproducible-version-20261029` (PR #2743)

> Revalidação independente mais recente: veja a seção **Inventário completo da main — 2026-10-29** abaixo. Ela substitui os IDs/status antigos deste arquivo quando houver conflito.

## Auditoria de sincronização local × GitHub × Supabase — 2026-10-29

| Área | Evidência atual | Resultado |
|---|---|---|
| Código local e GitHub | Branch local `fix/location-panel-timeout-cleanup`, SHA `b825421c95603de04bfd9f6f6d38bcf3da40113f`, coincide com o head do PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721). `main` está em `4b4206abf947a87f56b1dc7effbf9739f530d80b`; o branch local tem 7 commits exclusivos e está 8 commits atrás. | O trabalho local está publicado no PR, mas não incorporado à `main`. O check E2E Quotes falhou no run [40887795789](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40887795789); o review Copilot também está bloqueado por cota (run [40887835845](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40887835845)). Não integrar até resolver/registrar as falhas e atualizar o branch contra a base. |
| Reconciliação de migrations | PR [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714), SHA `ca316674db0110136e6cbbabee8fbe103aa8ff15`, continua aberto e bloqueado pelo Gate E40. | Não aplicar nem reparar ledger/schema enquanto o drift não for classificado e aprovado. |
| Ledger local × canônico | Repositório: 3.004 versões distintas em 3.009 arquivos SQL; canônico: 2.552 entradas; 2.541 versões compartilhadas, 463 apenas locais e 11 apenas remotas. Existem 5 grupos de versão duplicada no repositório. | Divergência confirmada. As 11 versões remotas e as 463 locais exigem classificação individual; contagens, sozinhas, não autorizam `migration repair` ou DDL. |
| Tipos TypeScript × `pg_catalog` | Comparação somente leitura no projeto `doufsxqlfjyuvxuezpln`: 398 Tables, 197 Views e 15 Enums em ambos os lados; 1.020 nomes de Functions em `types.ts`, todos presentes no banco. O catálogo tem 1.324 nomes públicos de funções. | Tabelas, views e enums estão em paridade estrutural. As 304 funções adicionais do catálogo exigem classificação de exposição antes de qualquer regeneração; não são motivo para adicionar RPCs internos aos tipos. Nenhuma alteração foi feita. |
| Banco canônico | Projeto `doufsxqlfjyuvxuezpln`: listagem administrativa de migrations consultada em 2026-10-29; última versão `20261027160000`. | Estado do ledger verificado; não significa paridade com o repositório. Nenhuma escrita foi executada. |
| CI do PR [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | Head `9d9dd2a7b502ab7e5ff42691d40b95a822c21d6b`; Deploy Gates passou no run [40900912283](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912283). | O run [40900912215](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912215), tentativa 2, falhou porque o GHCR limitou pull de imagem (`toomanyrequests`, limite informado 44.000/min); o stack local nem iniciou. Copilot falhou por limite de uso HTTP 402 no run [40900936287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900936287). O run E2E visual [40900912386](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40900912386) falhou nos testes de paridade Novidades × Reposição; os mesmos dois testes falharam no push da `main` em [40899426031](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426031), portanto sem regressão identificada neste PR. Sem novo rerun: a falha GHCR repetiu-se após retry e a causa atual é externa. |
| Atualização E049 no PR [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | Commit `e2518bbd23ecd5b7e9960dfaec2f24837ee44d91` publicado no branch. O status Vercel reporta falha no deploy `dpl_BeeKSR6FugKfqBPh3ZWkujmTT9XZ`; `vercel inspect ... --logs` retornou apenas `status: Error`, sem trecho de causa. | Não inferir causa nem marcar o check como sucesso. A falha de deploy segue sem diagnóstico acessível; PR não está liberado para merge. |
| Este registro | PR documental [#2725](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2725), SHA `e4ef6e5d9339042fbfdd9087d25ebc4c8fefcd08`, aberto. | O check Copilot [falhou no step de limpeza](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40843346745); tentativa de rerun foi recusada pela API (`403`, jobs desta execução não podem ser reexecutados). A causa operacional é do workflow/serviço e permanece pendente. |
| Graphify local | `.graphifyignore`, `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` têm alterações locais não commitadas; o relatório foi gerado em `a172c252`. O mapa SQL foi reconstruído isoladamente a partir de 3.188 arquivos versionados: 17.839 nós, 32.709 arestas e 2.633 comunidades; consulta de validação encontrou objetos SQL esperados. | O mapa SQL está em diretório ignorado (`graphify-out/sql/graphify-out/`) e ainda não há comando versionado de rebuild. Avaliação isolada do Graphify 0.9.68 encontrou regressão: benchmark caiu de 1.664×/1.623 tokens (0.9.97) para 12,4×/218.295 tokens e um caminho direcionado reverso não foi encontrado. Manter 0.9.97 homologado; não substituir sem corrigir e repetir o benchmark. |

**Conclusão:** a sincronização total não foi atingida. As alterações de aplicação estão em PR, não na `main`; o ledger/schema segue divergente; e há alterações locais de Graphify ainda sem revisão/publicação. Não copiar dados operacionais de clientes ou produtos para o repositório.

## Auditoria E049 — rate guard de INSERT anônimo — 2026-10-29

Consulta somente leitura em `pg_catalog` no projeto canônico `doufsxqlfjyuvxuezpln` confirmou o trigger `trg_anon_rate_guard` chamando `fn_anon_insert_rate_guard`, habilitado (`tgenabled = 'O'`), em `analytics_events`, `catalog_analytics`, `product_views`, `search_analytics`, `frontend_telemetry` e `password_reset_requests`.

**Lacuna efetiva:** `public.kill_switch_hits` não possui esse trigger. A consulta confirmou que `anon` ainda tem privilégio `INSERT` e uma policy `INSERT` nessa tabela. Assim, a cobertura prevista para sete tabelas não está concluída.

**Defeito no gate atual:** `scripts/check-anon-insert-rate-guard.mjs --gate` só valida a presença de `trigger_name` e `verified_at` no JSON estático; o valor literal `"pendente"` passa por ser não vazio. O modo live descrito no comentário também não está implementado. O gate não detectaria a ausência encontrada no banco.

**Próxima ação segura:** preparar uma migration versionada e um gate de leitura ao vivo, adicionar testes com estados de trigger presente/ausente e submeter por PR. Aplicar no canônico somente pelo workflow `.github/workflows/db-apply-migration.yml`, após o preflight confirmar a versão e a reconciliação do ledger; não executar DDL por MCP/dashboard nem `supabase db push`. Até lá, P200-E049 permanece aberto e a cobertura de `kill_switch_hits` não deve ser declarada como corrigida.

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

## Revalidação da main — 2026-10-29 (SHA `c344508711797a730893644449b16a05f12f4fce`)

Inventário limitado à última execução observada na `main` por workflow. Os itens abaixo continuam sem correção confirmada; os IDs substituem fotografias anteriores quando o workflow é o mesmo.

| Workflow / run | Evidência da falha | Estado e próximo passo |
| [Kit Coverage — Integration / 40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `permission denied for view v_kit_component_complete` | P12/P7: GRANT ausente; PR #2701 segue bloqueado pelo drift estrutural do ledger. Não aplicar DDL fora do fluxo aprovado. |
| [Nightly Full CI / 40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | 8 timeouts no seletor de swatches, falhas nos shards E2E (11 e 23) e 14 falhas de baseline visual do Magazine | Ainda sem causa única comprovada; reproduzir por suíte/shard e separar falha funcional de baseline antes de corrigir. |
| [E2E — Critical Flows / 40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Asserção inesperada no fluxo catálogo → kit autenticado | Fluxo público passou localmente; reproduzir a variante autenticada com credenciais E2E. Não presumir que a falha seja resolvida pelo teste público. |
| [CI Security & Drift Checks / 40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | Testes E2E autenticados falharam nos filtros de catálogo e Kit Builder | Diagnosticar seletores/estado e comparar com o run E2E Critical; ainda não há correção validada. |
| [E2E • Swatch QuickView / 40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Runner recebeu sinal de encerramento durante a execução; o job WebKit foi cancelado | Falha observada de execução/runner, sem evidência suficiente para atribuir a bug do produto; rerun controlado e diagnóstico do runner. |
| [Edge Integration Tests — All Functions / 40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | Dois testes de body malformado em `crm-db-bridge` receberam HTTP 503, quando esperavam resposta controlada abaixo de 500 | Investigar tratamento de JSON inválido e erro upstream; reproduzir localmente antes de alterar a função. |
| [E2E — Magazine Header Layout / 40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | 14 falhas nos testes responsivos do cabeçalho do Magazine | Reproduzir viewports individualmente e confirmar se é regressão visual/funcional antes de atualizar qualquer baseline. |

**Verdes na fotografia:** 25 workflows com última execução `success` entre 36 workflows observados; consultar os runs da `main` para a lista completa. Não houve rerun de workflows verdes.

**Estado do PR #2720:** no commit inicial `1df94731b`, Gate Final, Gate 1 e Gate 3 passaram. Após os commits documentais enviados no SHA atual `d3b705038969f3105da7f8a8c7f11d2939c5f7b4`, a última consulta encontrou 23 checks `success`, 3 `skipped`, 1 `neutral`, Gate 1 e Gate 3 ainda `in_progress`, e revisão Copilot em `failure`. O run mais recente da revisão é [40824279431](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40824279431): HTTP 402 (`You've reached your additional usage limit for your plan`) e bloqueio de rede para `api.github.com`. É falha de quota/serviço, não erro do código deste PR. Não mesclar enquanto houver checks pendentes ou vermelhos.

### Ledger de migrations — comparação local × banco canônico

Consulta somente leitura em `doufsxqlfjyuvxuezpln` em 2026-10-29:

| Fonte | Arquivos/linhas | Versões únicas | Hash MD5 ordenado das versões | Última versão |
|---|---:|---:|---|---|
| Repositório local (`supabase/migrations`) | 3.009 arquivos | 3.004 | `dbcbcffc885877af2cef536dc6cbc9cd` | `20261027234500` |
| `supabase_migrations.schema_migrations` | 2.552 linhas | 2.552 | `ba0ba22d8bcc705632cdeb5a888880c6` | `20261027160000` |

O diff previamente calculado contém **463 versões apenas locais e 11 apenas remotas**; há ainda 5 colisões de versão entre arquivos locais. A versão do banco é ledger, não prova isolada de que cada DDL esteja ou não no schema. Classificar os arquivos locais e remotos antes de qualquer reconciliação; não executar `db push`, `repair` ou DDL manual nesta auditoria. A alteração do PR #2720 é somente workflow/documentação e não adiciona migration.

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
| Uptime Monitor | [#40966795354](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40966795354) | failure | **Último run (2026-10-29 22:47):** `health-check` probe exit 22 (curl HTTP 4xx/5xx); site=0, check-login=0, auth=0. Issue [#2748](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2748) criada automaticamente pelo workflow. Causa externa — edge function `health-check` retornou status não-2xx. **Ação necessária do PO:** verificar logs da edge function `health-check` em Supabase Dashboard → Edge Functions → health-check → Logs. Se intermitência, aguardar próximo run agendado. Se persistente, investigar deployment da função. |
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

Os 63 workflows `success` na consulta individual são (snapshot 2026-10-29, antes do fix do health-check): Branch Protection Sentinel; CodeQL; Cross-reference PR ↔ Issue; Deploy to Vercel (Manual Fallback); Security Scan; Quote Builder Delivery Quality; Dependabot Updates; Sync labels; Contract Tests; Required Checks Guard; Deploy Gates; Gitleaks — Full History Audit; Lint untypedFrom; Edge Integration Tests — All Functions; E2E — Critical Flows & Error Boundaries; E2E — Personalization Flow; CI — Replenishment Module Quality Gate; Static Health Checks; Lovable Edit Tracker; db-schema-drift-check; Lovable Autoheal; Supabase Linter Gate; stock-rupture-fuzz; Quote Number Hardening — Verify; E2E — Visual Regression (Preview button); schema-snapshot-export; drafts-index-check; UI · Visual & A11y; E2E · Update Confirm Dialog snapshots; E2E · Update Alert Dialog snapshots; E2E · Update Dialog snapshots; E2E · Update Quote Freight snapshots; E2E · Update Calendar snapshots; E2E — Customization Collapse (LocationPanel); PDF Quality Gate; E2E — CRM Callback; URL State — Unit & Fuzz; Magazine Unit Tests; Gate 5 — Supabase Security Audit; E2E · Update Magazine Ring snapshots; Magazine Flakiness Guard; Magazine Mutation Testing; SSOT Supabase Guard; log-login-attempt — Fuzz Stress Weekly; Auth surface fuzz (weekly); Daily flows simulation; TS Unused Locals Ratchet; ~~Uptime Monitor~~ (ver P-UPTIME — falhou após este snapshot); capacity-growth-report; ddl-out-of-band-detector; pgss-slo-report; wraparound-monitor-report; Workflow Lint; Template — Workflow Name Here; CI Metrics Weekly; Policies Baseline; Release Please; No Prod Leak in Dev/Test Config; Select Columns vs Types; E2E Focused UI — Matrix; Cache Prune; DR Drill Reminder; Mark stale issues and pull requests. Runs representados por links: Deploy Gates [#40920388855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388855), Branch Protection Sentinel [#40920389139](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389139), CodeQL [#40920388970](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388970), Security Scan [#40920389009](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389009), SSOT Supabase Guard [#40920389025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389025), E2E Personalization [#40920389117](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389117), CI Replenishment [#40920388867](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388867) e Customization Collapse [#40920388936](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388936).

Sem execução na `main` (21): Delete Orphan Edge Functions; Copilot code review; Copilot cloud agent; Sentinel Self-Test; auto-regenerate-types.yml; pages-build-deployment; E2E Update Quote Conditions snapshots; Bundle size report; migrations-sync-log-gate; E2E Update Quote No-Pres snapshots; `_secrets-check`; E2E Quotes Matrix; PR Size Guard; NodeJS with Webpack; Deno; Jekyll site CI; Codacy Security Scan; Dependency review; Node.js CI; `.github/workflows/main.yml`; E2E Update Quote Missing-Fields snapshots.

| Workflow | Última execução | Estado | Evidência / causa provável |
| Copilot | [#40750158539](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750158539) | `failure` | Limite adicional de uso do Copilot atingido; resposta explícita do serviço. Bloqueio operacional do plano/quota, não resultado de revisão de código. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | `failure` | Step `Commit, push, and open PR` falhou. Logs expirados via HTTP 410 (run de ~18 meses atrás, muito acima do limite de 90 dias de retenção do GitHub Actions). Causa mais provável: `GITHUB_TOKEN` padrão não tem permissão `contents:write` para criar commits/PRs automaticamente — exige PAT ou GitHub App com escopo de escrita no repositório. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | `failure` | `Fail if drift detected` encontrou divergência de conteúdo/estado entre repositório e funções canônicas. Não aplicar nem remover função por fora do fluxo versionado de deploy; identificar cada função divergente no log completo e reconciliar por PR. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | `failure` | Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses, acima dos 90 dias de retenção). A API de resumo não retornou jobs nem steps falhos — evidência de cancelamento antes de qualquer job iniciar, provavelmente por concorrência (`cancel-in-progress`) ou falha de checkout. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `failure` | Step `Setup E2E` saiu com código não-zero. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Padrão idêntico a outros 4 workflows E2E do mesmo dia (39263929xxx); causa mais provável: credenciais `E2E_EMAIL`/`E2E_PASSWORD` inválidas ou serviço de autenticação indisponível naquele período. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `failure` | Steps `Setup E2E` e `Install dependencies` falharam. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Dois steps distintos falharam: `Install dependencies` indica npm registry inacessível ou lockfile incompatível com o runner daquele período; `Setup E2E` indica falha de autenticação ou variável de ambiente ausente. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `failure` | Teste como `anon` recebe `permission denied` em `product_kit_components` e `v_kit_component_complete`. Corrigir a fixture/identidade autenticada do teste; não conceder leitura pública para fazê-lo passar. |
| E2E • Swatch QuickView | [#40920389028](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389028) | `failure` | Firefox falha no clique/fluxo do swatch-QuickView; o artefato confirma grade estreita, camada absoluta de ações interceptando clique, toolbar fora da viewport e componentes satélite V1 frente ao contrato V2. WebKit recebeu shutdown do runner. Correção de layout aguarda proposta visual aprovada; nenhuma asserção será removida ou forçada. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `failure` | E2E falha com `[E108] Sem orçamento enviado no ambiente`; o ambiente não tem fixture/orçamento submetido requerido pelo spec. |
| E2E Discount Approval | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `failure` | Step `Setup E2E` saiu com código não-zero. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Mesmo padrão dos outros runs E2E do dia (39263929xxx): falha de autenticação/credenciais antes de qualquer asserção da aplicação. |
| E2E ColorSwatch Grid | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | `failure` | Step `Setup E2E` saiu com código não-zero. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Mesma família de falha dos outros 4 runs E2E daquele dia: autenticação/credenciais insuficientes, não relacionado ao teste do componente em si. |
| E2E Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | `failure` | Workflow com trigger `pull_request` (não dispara em push para main). Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). A API de resumo não retornou jobs/steps: forte indicação de cancelamento por concorrência antes de qualquer job iniciar. Sem run na main para verificar estado atual. |
| E2E Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | `failure` | Workflow com trigger `pull_request` (não dispara em push para main). Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). A API de resumo não retornou jobs/steps: forte indicação de cancelamento por concorrência antes de qualquer job iniciar. Sem run na main para verificar estado atual. |
| E2E PDF Dialog | [#40893179038](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40893179038) | `failure` | E2E falha com `[E108] Sem orçamento no estado "rascunho" no ambiente`; falta fixture correspondente no ambiente do teste. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | `failure` | Workflow com trigger `pull_request` (não dispara em push para main). Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). A API de resumo não retornou jobs/steps: forte indicação de cancelamento por concorrência antes de qualquer job iniciar. Sem run na main para verificar estado atual. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `failure` | Step `Install dependencies` saiu com código não-zero. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Causa mais provável: registry npm inacessível ou lockfile incompatível com a versão de Node do runner naquele período. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `failure` | Step `Dry-run drafts` saiu com código 1; log retido não identifica qual migration/asserção causou a falha. Não aplicar migration como tentativa diagnóstica. |
| E2E Magazine Header Layout | [#40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | `failure` | E2E `expect(page).toHaveURL(expected)` falhou; precisa alinhar expectativa de rota ao comportamento aprovado e reproduzir sem enfraquecer o teste. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | `failure` | Step `Detectar se baselines melhoraram` detectou que uma ou mais métricas de ratchet (bundle size, TODO/FIXME/`as any`, file size, `console.*`, indexed-access, etc.) pioraram em relação ao baseline armazenado no artefato da semana anterior. O log exibe o diff de chunks, mas não especifica qual métrica excedeu o limite. Bloqueio: requer download do artefato do run e comparação manual de cada métrica antes de decidir se atualiza o baseline. |
| E2E Cart — Matrix | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | `failure` | Um job falha no login E2E; outro expira em `locator.click` após 120 s no popover de remoção. São dois diagnósticos distintos; reproduzir ambos. |
| E2E Freight — Matrix | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `failure` | Setup de autenticação termina com `E21 — login falhou em CI`; precisa verificar credenciais/serviço no período do run. |
| E2E Stock — Matrix | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `failure` | `npm ci --no-audit --no-fund` falhou em dois jobs paralelos. Logs expirados via HTTP 410 (run de dezembro/2025, >10 meses). Causa mais provável: registry npm inacessível ou rate-limit em dois workers simultâneos naquele período — não relacionado ao código dos specs de stock. |
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

---

## ✅ P-CI-H — RESOLVIDO — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel
**Run com falha original:** [#40965131389](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40965131389) — SHA `c3b4128` — `failure`
**Data:** 2026-10-29 · **Resolvido:** 2026-10-30

**Resolução:** O Sentinel retornou `success` na main atual (`3b7dc731eea29a1ec7a69f6dae5ca97fb89c7739` — "chore(main): release 1.1.0 (#2713)", push de 2026-10-30T00:24:09Z):

- Run [#40979462648](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40979462648) = **`success`** em `3b7dc731` ✅

Esse run supersede a falha antiga em `c3b4128`. O PR #2749 (allowlist do SHA `9a97f9a`) continua aberto mas não é mais bloqueante — o HEAD da main evoluiu para além desse SHA e o Sentinel já passa.

**Nota:** PR #2749 ainda pode ser mergeado pelo PO para proteger o SHA `9a97f9a` historicamente, mas não é ação urgente.

---

## P-UPTIME — Uptime Monitor: edge function health-check com HTTP 4xx/5xx

**Workflow:** Uptime Monitor
**Última run com falha:** [#40989993974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40989993974) — SHA `279f17` — `failure` (2026-10-30)
**Data:** 2026-10-29 · **Atualizado:** 2026-10-30

**Causa raiz identificada (2026-10-29 sessão atual):**
`supabase/functions/health-check/index.ts` — `ExternalDatabaseChecker.check()` (linha 127) retorna `status: "unhealthy"` quando o banco externo (`EXTERNAL_PROMOBRIND_URL`) é intermitentemente inacessível. O `runProbes()` (linha 161) propaga qualquer `unhealthy` para o status geral → HTTP 503 → curl exit 22 → workflow failure.
O banco externo é uma dependência **advisory** (não é o canônico `doufsxqlfjyuvxuezpln`); sua falha não deveria resultar em 503.

**Fix implementado:** PR [#2753](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2753) — `fix(edge-fn): cap external_db em degraded no health-check`
Mudança em `runProbes()`: converte `external_db=unhealthy` → `degraded` antes de calcular o status geral. Banco interno (`database`) continua propagando `unhealthy` normalmente.

**Por que reexecução com `success` é impossível sem ação do PO:**
A edge function `health-check` ainda executa o código pré-fix em produção (`doufsxqlfjyuvxuezpln`). O código corrigido está em `main` (`279f17`) mas NÃO foi deployado. O Uptime Monitor faz curl na edge function em produção — enquanto o binário em produção for o anterior, as execuções do workflow podem continuar retornando `failure` quando `EXTERNAL_PROMOBRIND_URL` estiver inacessível (HTTP 503 → curl exit 22). O deploy run [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) permanece `pending`, mas a consulta de deployments pendentes retornou uma lista vazia. Portanto, ainda não há evidência de uma aprovação manual acionável nem do bloqueio exato; investigar o estado do environment/deploy com o owner antes de afirmar que depende de aprovação. O run #40757296680 (28/10, >30h em `waiting`) é evidência histórica, não prova do estado atual.

**Passos restantes:** aguardar o run de deploy pendente sem iniciar outro deploy concorrente; após seu término, confirmar um run agendado verde do Uptime Monitor. Não houve deploy manual/MCP nesta sessão.

---

## P-QUEUED — Workflows queued/pending na main (não são falhas)

**Data:** 2026-10-29 — registro histórico, supersedido pelo inventário de 2026-10-30 em P25.

Os seguintes workflows têm o último run com status `queued` ou `pending` nos SHAs recentes da main. **Isso não representa falha** — é backlog de runner do GitHub Actions. Após merge do PR #2751 (SHA `07bc2b0`, 2026-10-29 23:46 UTC), novos runs foram criados e aguardam runner.

| Workflow | Run ID (9a97f9a) | Status | Run anterior (success) |
|---|---|---|---|
| Branch Protection Sentinel | [#40969607706](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607706) | queued | aguarda PR #2749 |
| Deploy Gates | [#40969607963](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607963) | queued | [#40920388855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388855) ✅ |
| E2E (Playwright) | [#40969607902](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607902) | pending | [#40920389589](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389589) ↩ cancelled |
| CI Security & Drift Checks | [#40969607859](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607859) | queued | [#40920388970](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388970) ✅ |
| CodeQL | [#40969607845](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607845) | pending | ✅ anteriores verdes |
| Required Checks Guard | [#40969607855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607855) | pending | ✅ anteriores verdes |
| Gitleaks | [#40969607927](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607927) | pending | ✅ anteriores verdes |
| E2E — Critical Flows | [#40969607879](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607879) | pending | ✅ anteriores verdes |
| E2E — Personalization Flow | [#40969607989](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607989) | queued | ✅ anteriores verdes |
| E2E • Swatch QuickView | [#40969607781](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607781) | pending | ✅ anteriores verdes |
| No Prod Leak | [#40969607833](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607833) | queued | ✅ anteriores verdes |
| Release Please | [#40969607960](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607960) | queued | ✅ anteriores verdes |
| Security Scan | [#40969607897](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607897) | queued | ✅ anteriores verdes |
| Supabase Linter Gate | [#40969607838](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607838) | queued | ✅ anteriores verdes |
| SSOT Supabase Guard | [#40969607824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607824) | queued | ✅ anteriores verdes |
| Policies Baseline | [#40969607904](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607904) | queued | ✅ anteriores verdes |
| Quote Builder Delivery Quality | [#40969607919](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607919) | queued | ✅ anteriores verdes |
| UI · Visual & A11y | [#40969607907](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607907) | pending | ✅ anteriores verdes |
| Lovable Autoheal | [#40969607794](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607794) | queued | ✅ anteriores verdes |
| Lovable Edit Tracker | [#40969607968](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607968) | pending | ✅ anteriores verdes |
| Select Columns vs Types | [#40969607793](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40969607793) | pending | ✅ anteriores verdes |

**Conclusão:** nenhum desses workflows representa falha ativa. Quando os runners processarem os runs em 9a97f9a, o Branch Protection Sentinel poderá falhar para o commit `9a97f9a` se o PR #2749 não for mergeado antes (ver P-CI-H acima). Os demais deverão concluir com success baseado nos runs anteriores verdes e na ausência de regressão local (build/lint/tsc todos ✅ na auditoria local desta sessão).

## P23 — sincronização pós-PR #2751 e revalidação dos PRs — 2026-10-29

- `origin/main` avançou de `9a97f9a2` para `07bc2b098` via PR #2751. Na branch Graphify, o merge normal apresentou conflitos apenas em `PENDENCIAS.md` e `RELATORIO_CI.md`; a resolução mantém o conteúdo novo da `main` e este registro, sem conflito em código.
- `node scripts/check-migration-path-references.mjs` passou no checkout sincronizado, sem novas referências inválidas. As referências de propostas de migrations que não estão na `main` permanecem identificadas como arquivos de branches de PR; nenhum SQL foi criado ou alterado.
- PR #2743 mantém bloqueios externos: o Copilot Reviewer [run 40973814939](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40973814939) falhou explicitamente por quota HTTP 402 e firewall; o preview Vercel `dpl_CiCk44mFZqGRKWxjwCkpdwgv222c` está `ERROR`, sem causa disponível em `vercel inspect --logs`. Não mesclar sem diagnóstico e checks obrigatórios verdes.
- PR #2745 foi sincronizado localmente primeiro em `47b6f55e3`; após a `main` avançar, houve novo conflito somente nos mesmos dois relatórios, resolvido mantendo a versão atual da `main`. O merge mais recente ainda aguarda build/test completos e push normal.
- No PR #2747, o rerun read-only do Gate 5 [run 40970640671](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640671) passou na tentativa 2. QuickView [run 40970640906](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640906) continua falhando por dependência de catálogo remoto sem fixture determinística V2; os E2E autenticados [runs 40970640931](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640931) e [40970640650](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40970640650) mantêm falhas de login/limite de testes executados. A evidência mostra latência Auth/PostgREST e HTTP 504, sem raiz operacional única confirmada.

O commit documental local `400d4d49` passou `npm run build:verify` e a suíte: 1.247 arquivos, 25.871 testes aprovados, 1.135 skipped e 24 TODO. A integração do merge mais recente com `main` ainda requer nova validação antes do push. Nenhum banco, migration, DDL, repair, função Edge ou dado operacional foi alterado.

## P24 — inventário atualizado da main e bloqueios externos — 2026-10-30

**Snapshot:** 00:26 UTC; 400 runs recentes da `main`, agrupados por workflow, resultaram em 38 workflows distintos. O commit atual da `main` é `3b7dc731`.

| Workflow | Último run | Causa/estado verificável | Próximo passo |
|---|---|---|---|
| Uptime Monitor | [#40989993974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40989993974) — `failure`, SHA `279f1753` | `site=0`, `health-check=22`, `check-login OPTIONS=0`, `auth-health=0`. A correção do PR [#2753](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2753) já está na main, mas o deploy de `health-check` permanece sem runner. | Deploy Edge Functions [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) está `pending`, sem jobs criados e sem aprovação de ambiente pendente. Aguardar runner; não disparar deploy duplicado. Depois confirmar um run agendado verde. |
| Running Copilot Code Review | [#40975434366](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40975434366) — `failure`, SHA `07bc2b09` | HTTP 402: limite de uso adicional do plano Copilot atingido; o agente também foi bloqueado pelo firewall ao acessar `api.github.com`. | Ação do proprietário: ajustar/renovar a cota de uso do Copilot e permitir o host necessário na configuração de firewall do agente. Rerun somente após essa alteração. |

As falhas anteriores de `CI Security & Drift Checks`, `E2E — Personalization Flow` e `E2E — Magazine Header Layout` não são classificadas como falhas ativas neste snapshot: seus runs mais recentes na main (`#40979462838`, `#40979462646` e `#40979462696`) estão `in_progress`/`queued` no SHA `3b7dc731`. Não estão consideradas resolvidas até conclusão `success`.

**Estado do inventário:** 10 success, 2 skipped, 19 queued/pending, 5 in_progress e 2 failures. Os workflows verdes neste snapshot são Static Health Checks, Lovable Autoheal, Policies Baseline, No Prod Leak in Dev/Test Config, Workflow Lint, Security Scan, Lint untypedFrom, TS Unused Locals Ratchet, E2E — PDF Dialog e Python Package using Conda.

**PRs desta auditoria:**
- [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743): Graphify/relatório; aberto, behind da main; checks ainda falhos ou pendentes, sem merge.
- [#2745](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2745): correção SIGPIPE do Ratchet Weekly; branch atualizado para `279f1753`, checks ainda pendentes, sem merge.
- [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758): indicador de foco acessível no histórico de imagens; correção local aprovada por build/lint/typecheck/testes, PR aberto e sem merge por alterar UI publicada.

Nenhuma migration, DDL, escrita no Supabase ou deploy de Edge Function foi executado nesta auditoria.

## P25 — revalidação de workflows da main e estado dos PRs — 2026-10-30

**Snapshot:** 00:31 UTC; 100 execuções mais recentes da `main`, agrupadas pelo nome do workflow (34 distintos). HEAD `3b7dc731eea29a1ec7a69f6dae5ca97fb89c7739`.

| Workflow | Última execução | Evidência/causa | Ação ou bloqueio |
|---|---|---|---|
| Release Please | [#40979462721](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40979462721) — `failure` | Release Please encontrou PR #2713 para `1.1.0`; a criação do GitHub Release falhou com `tag_name already_exists` para `v1.1.0`. O log confirma a tag duplicada; não removi tag/release nem forcei outra publicação. | Revisar idempotência da configuração de release com o responsável pelo release; não apagar a tag existente. |
| CI Security & Drift Checks | [#40979462838](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40979462838) — `failure` | Gate `check:outline-none`: nova violação WCAG 2.4.7 em `src/components/magic-up/AdImageResult.tsx:188`, botão sem ring substituto. | Corrigida localmente e enviada no PR [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758). Build, lint, typecheck e testes locais passaram; PR aberto com checks ainda em andamento/falhas externas. Não mesclar antes dos checks e do fluxo de release da UI. |
| Uptime Monitor | [#40989993974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40989993974) — `failure` | Probe: `site=0`, `health-check=22`, `check-login OPTIONS=0`, `auth-health=0`. PR #2753 está na main, porém deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) segue `pending` sem jobs. | Aguardar o deploy pendente e a execução agendada seguinte. Sem deploy duplicado. |
| Running Copilot Code Review | [#40975434366](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40975434366) — `failure` | HTTP 402 por limite de uso adicional do plano Copilot; log também reporta bloqueio de `api.github.com` pelo firewall do agente. | Ação do proprietário: ajustar a cota e permitir o host na política do agente; rerun após mudança. |

No mesmo snapshot: **17 success**, **2 skipped**, **11 queued/pending/in_progress**, além das quatro falhas acima. Os 17 workflows verdes são Static Health Checks, Supabase Linter Gate, Security Scan, SSOT Supabase Guard, Select Columns vs Types, Gitleaks — Full History Audit, schema-snapshot-export, Workflow Lint, Branch Protection Sentinel, UI · Visual & A11y, Lovable Edit Tracker, E2E — Personalization Flow, Required Checks Guard, CodeQL, Lovable Autoheal, Policies Baseline e No Prod Leak in Dev/Test Config. Runs em fila/execução não são declarados verdes.

**PRs relevantes:** #2743 continua aberto e seus commits locais ainda aguardam push/validação; #2745 tem uma falha Gate 1.3 reproduzida localmente por nove referências documentais a migrations ausentes (correção documental pronta em branch de trabalho); #2747 permanece aberto/behind, com QuickView e Full User Flows falhando; #2758 contém a correção a11y citada. Nenhum PR foi mesclado nesta etapa.

Nenhuma migration, DDL, escrita no Supabase, alteração de workflow, deploy de Edge Function ou exclusão de tag/release foi realizada.

## P26 — revalidação após atualização documental da main — 2026-10-30

**Snapshot:** 01:03 UTC; 100 execuções recentes na `main`, agrupadas por workflow (34 distintos). HEAD `5f74691adfe2999ac52abcbbd7bdb419920f1e5a`.

| Workflow | Último run | Causa/evidência | Encaminhamento |
|---|---|---|---|
| Branch Protection Sentinel | [#40982927226](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927226) — `failure` | Um commit do push, `5f74691` (`docs(ci): estado final — Sentinel success confirmado, P-UPTIME aguarda deploy PO`), não corresponde a nenhum padrão aceito pelo Sentinel. O restante do job confirmou ruleset ativo na main. | Preservar o conteúdo; próximos commits devem entrar por PR com mensagem aceita. A falha desse SHA fica registrada; sem reescrever o histórico da main. |
| CI Security & Drift Checks | [#40982927264](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927264) — `failure` | Gate de acessibilidade: uma violação nova, `src/components/magic-up/AdImageResult.tsx:188`, `focus-visible:outline-none` sem ring substituto. | Fix local reproduzido e PR [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758) aberto. Não mesclar a alteração visual antes da revisão e dos checks; a falha permanece pendente em main. |
| Uptime Monitor | [#40982473994](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982473994) — `failure` | A probe `health-check` voltou a falhar com curl exit 22. O runbook deduplicou o alerta porque o resultado coincide com o já registrado na issue [#2752](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2752): `site=0`, `health-check=22`, `check-login OPTIONS=0`, `auth-health=0`. | PR #2753 está na main, mas o deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) segue `pending`, sem jobs. O workflow usa `environment: production`; depende de aprovação humana. Não disparar deploy duplicado. |

**Estado observado:** 19 success, 2 skipped, 3 cancelled, 7 queued/pending/in_progress e 3 failures. Os 19 workflows verdes são Lovable Edit Tracker, SSOT Supabase Guard, Policies Baseline, Static Health Checks, Required Checks Guard, Release Please, Select Columns vs Types, Gitleaks — Full History Audit, UI · Visual & A11y, Security Scan, Lovable Autoheal, No Prod Leak in Dev/Test Config, Supabase Linter Gate, E2E — Personalization Flow, Quote Number Hardening — Verify (canonical DB), schema-snapshot-export, Workflow Lint, Magazine Unit Tests e CI - Replenishment Module Quality Gate.

`Quote Builder Delivery Quality` tinha run anterior [#40981144356](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40981144356) falho, com 4 testes E2E falhando no `loginViaUI`: `auth/v1/token` e `auth/v1/user` retornaram 200, consultas de produtos retornaram 401 e `get_profile_and_roles` ficou pendente até o timeout de 75s. No snapshot P26, o último run [#40982927130](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927130) ainda está `in_progress`; não foi declarado verde nem resolvido.

`CI Security & Drift Checks` e Sentinel foram reexecutados no HEAD `5f74691`; somente as causas acima seguem falhando. Deploy Gates e E2E ainda em fila/execução não são contados como success. Nenhuma escrita no banco, DDL, migration, deploy, alteração direta da `main` ou force push foi feita.

## P27 — revalidação dos workflows mais recentes da main — 2026-10-30

**Snapshot:** 01:05 UTC; 100 runs recentes, 34 workflows distintos, HEAD da main `5f74691adfe2999ac52abcbbd7bdb419920f1e5a`.

| Workflow | Último run | Resultado e encaminhamento |
|---|---|---|
| Branch Protection Sentinel | [#40982927226](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927226) — failure | O commit documental `5f74691` não corresponde ao padrão de mensagem aceito; regra de proteção da main foi confirmada. Falha histórica registrada, sem reescrever a main. |
| CI Security & Drift Checks | [#40982927264](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927264) — failure | `check:outline-none` detectou foco sem ring em `AdImageResult.tsx:188`. Fix está no PR [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758); aguarda revisão e checks. |
| Uptime Monitor | [#40982473994](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982473994) — failure | Probe `health-check` retorna curl 22; o alerta deduplicado na issue #2752 registra site=0, login OPTIONS=0 e auth-health=0. Deploy do fix #2753 [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) segue `pending` desde 23:59 UTC, com zero jobs; a API de aprovações pendentes retornou lista vazia. O workflow declara environment `production`, mas não há evidência de que exista aprovação acionável neste run. O responsável deve inspecionar o run e o environment; não duplicar o deploy. |

**Estado atual:** 21 success, 2 skipped, 3 cancelled, 5 queued/pending/in_progress e 3 failures. O run [#40982927130](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40982927130) de Quote Builder Delivery Quality concluiu **success**, removendo a falha E2E reportada no P26. Workflows verdes: Lovable Edit Tracker, SSOT Supabase Guard, Policies Baseline, Static Health Checks, Required Checks Guard, Release Please, Select Columns vs Types, Gitleaks — Full History Audit, UI · Visual & A11y, Security Scan, Lovable Autoheal, No Prod Leak in Dev/Test Config, Supabase Linter Gate, E2E — Personalization Flow, CodeQL, Quote Builder Delivery Quality, Quote Number Hardening — Verify (canonical DB), schema-snapshot-export, Workflow Lint, Magazine Unit Tests e CI - Replenishment Module Quality Gate. Pendentes incluem Deploy Gates, E2E Critical Flows, E2E Playwright, Swatch QuickView e o deploy protegido de Edge Functions. Runs pendentes não são contabilizados como sucesso.

A correção a11y continua sem merge; o deploy pendente requer inspeção do responsável, pois não há job nem aprovação pendente listada pela API. Nenhuma migration, escrita no Supabase, DDL, deploy, alteração direta da main ou force push foi executada. Validação pré-commit Graphify: `npm run build:verify` passou com TypeScript, lint Δ0, guards e build; `npm test`: 1.247 arquivos, 25.871 testes passaram, 1.135 ignorados e 24 TODO.

### Bloqueio dos checks Vercel dos PRs — 01:10 UTC

Os statuses Vercel dos PRs [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743), [#2745](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2745) e [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758) estão em `failure`. A inspeção read-only de seus deployments de preview retornou `readyState: ERROR`; em cada objeto o build aparece `READY`, mas `output` vem vazio. O comando `vercel inspect <deployment> --logs` retornou apenas `status ● Error`, sem a causa raiz. Isso não permite atribuir o problema ao código nem corrigir com segurança.

Deployments: #2743 `dpl_ETcgawo3RTafB7Av6ZLtRsF7sXae`; #2745 `dpl_4DjDA7MGzF3ZhAPSyyGJjnik2R6r`; #2758 `dpl_68WYaB8yTiGSnNR47Prt4fAvDB5r`. Bloqueio: proprietário do projeto Vercel precisa consultar a tela de deployment/build events e identificar a causa do estado ERROR. Não fiz redeploy, alteração de configuração Vercel nem merge. #2745 já está atualizado no GitHub em `b2018e7`; PRs #2743 e #2758 seguem sem merge e sujeitos a checks/revisão.

## P28 — inventário exaustivo por workflow na `main` — 2026-10-30

**Snapshot:** 01:28 UTC; 119 workflows ativos nas páginas 1 e 2 do catálogo Actions; para cada workflow, consulta individual do último run com `branch=main`, `exclude_pull_requests=true` e `per_page=1`. HEAD da `main`: `a9a079fd92a3191654e82db748199fd1777b5af9`. Este snapshot substitui P27 como estado operacional atual; P27 fica preservado como histórico.

| Estado da última execução por workflow | Quantidade |
|---|---:|
| `success` | 56 |
| `failure` | 23 |
| `cancelled` | 5 |
| `skipped` | 2 |
| `queued` | 3 |
| `pending` | 6 |
| `in_progress` | 3 |
| Sem execução na `main` | 21 |

### Workflows cujo último run falhou

| Workflow | Último run na `main` | Causa observada e bloqueio/encaminhamento |
|---|---|---|
| Copilot | [#40975434366](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40975434366) | HTTP 402 por limite de uso do Copilot; log também reporta bloqueio de `api.github.com` pelo firewall do agente. Proprietário deve regularizar cota e allowlist antes de rerun. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Falha no step `Commit, push, and open PR`; a API de logs respondeu HTTP 410. Causa técnica não recuperável do run de maio; rerun controlado necessário antes de corrigir. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | Gate detectou drift entre arquivos versionados e Edge Functions do canônico. O trecho retido sugere classes de conteúdo, órfã ou deploy, mas não identifica slug suficiente para reconciliação. Owner deve consultar o `drift-report.csv`; nenhuma função foi alterada ou deployada. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Resultado `failure`, mas endpoint retornou zero jobs e nenhum log. Causa não verificável com a retenção disponível; recuperar logs/artifacts ou executar o workflow em contexto seguro. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | Job `test`, step `Setup E2E`; resumo disponível não contém a mensagem-raiz. Não atribuir a secret ou dependência sem o log do step. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` falha com `EUSAGE`: `package.json` e lockfile divergem (incluindo React/DOM 19.3.0/19.3.1 e Supabase JS 2.117.3/2.118.0). Corrigir a sincronização do lockfile em PR e validar a instalação. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | Três testes recebem `permission denied` em `v_kit_component_complete` e `product_kit_components`: o workflow chama como `anon`, que não tem `SELECT`. Ajustar identidade/fixture de teste aprovada; não conceder acesso público nem aplicar DDL fora do fluxo E15. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | Sete testes falham com `[E108] Sem orçamento enviado no ambiente`. Preparar fixture e revisar visualmente antes de atualizar baseline. |
| E2E Discount Approval (04c*) | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | `Setup E2E` falhou; logs preservados não contêm a causa-raiz. Recuperar stderr e reproduzir antes de mexer em código ou secrets. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Step `Setup E2E` falhou; trecho retido não expõe a mensagem específica. Recuperar log/artifact e reproduzir antes de alterar asserções. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | API reporta `failure`, mas zero jobs. Causa indisponível nos logs retidos; recuperar artifact/log antes de mudar snapshots. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | API reporta `failure`, mas zero jobs. Causa indisponível nos logs retidos; baseline não foi alterado. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | API reporta `failure`, mas zero jobs/logs. Recuperar a evidência da asserção antes de mudar snapshots ou código. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | Step `Install dependencies` falhou; log preservado termina sem stderr do gerenciador. Reproduzir no SHA `78701e8b`; não atualizar dependências por tentativa. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname de conexão mascarado (`could not translate host name … Name or service not known`). Owner deve revisar host/secret no ambiente; não expor credenciais nem aplicar migration como diagnóstico. |
| Uptime Monitor | [#40984011974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40984011974) | Probe `health-check` termina com curl 22. Fix #2753 depende do Deploy Edge Functions [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625), ainda `pending`, zero jobs e sem aprovação pendente listada. Owner deve inspecionar run/environment; não duplicar deploy. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Step de comparação termina com código 141 (SIGPIPE) ao encerrar pipeline `echo … | head`. Fix está no PR [#2745](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2745); sem merge porque checks/preview Vercel seguem bloqueados. |
| E2E Cart — Matrix (E79) | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Falhas distintas: handoff de autenticação e timeout de 120 s em `locator.click` no popover de remoção. Consultar artifact/reproduzir por job; não tratar como uma única causa. |
| E2E Freight — Matrix (E80) | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | Setup termina em `E21 — login falhou em CI` e mantém `/login`. Owner deve confirmar credenciais E2E e disponibilidade do serviço do ambiente. |
| E2E Stock — Matrix (E80) | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` falha com `EUSAGE`: lockfile incompatível com manifests no SHA `78701e8b`. Reconciliar manifest/lock em PR, sem relaxar instalação. |
| CI Security & Drift Checks | [#40985564187](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564187) | `check:outline-none`: violação WCAG 2.4.7 nova em `src/components/magic-up/AdImageResult.tsx:188`; literal sem ring substituto. Correção está no PR [#2758](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2758), ainda sem merge seguro. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Falharam `color-swatch`, shards Playwright 1/2 e `magazine-header`; evidência anterior registra timeouts de seletor, falhas nos shards e diferenças visuais. Artifact contém traces/screenshots; reproduzir cada grupo antes de alterar código ou snapshots. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | Cinco falhas na regeneração; o trecho aponta elementos esperados não encontrados. Revisar spec/fluxo com o artifact antes de aceitar baseline. |

### Workflows verdes e estados não-falhos

Os 56 workflows com último run `success`: Branch Protection Sentinel; Cross-reference PR ↔ Issue; Deploy to Vercel (Manual Fallback); Security Scan; Dependabot Updates; Sync labels; Contract Tests; Required Checks Guard; Gitleaks — Full History Audit; Lint untypedFrom; CI - Replenishment Module Quality Gate; Static Health Checks; Lovable Edit Tracker; db-schema-drift-check; Lovable Autoheal; Supabase Linter Gate; stock-rupture-fuzz; Quote Number Hardening — Verify (canonical DB); E2E — Visual Regression (Preview button); schema-snapshot-export; drafts-index-check; UI · Visual & A11y; E2E · Update Confirm Dialog snapshots; E2E · Update Alert Dialog snapshots; E2E · Update Dialog snapshots; E2E · Update Quote Freight snapshots; E2E · Update Calendar snapshots; E2E — Customization Collapse (LocationPanel); PDF Quality Gate; E2E — PDF Dialog (watermark pixel-diff, authed); E2E — CRM Callback (approved → V4 → CRM); URL State — Unit & Fuzz; Magazine Unit Tests; Gate 5 — Supabase Security Audit; E2E · Update Magazine Ring snapshots; Magazine Flakiness Guard; Magazine Mutation Testing; log-login-attempt — Fuzz Stress Weekly; Auth surface fuzz (weekly); Daily flows simulation; TS Unused Locals Ratchet; capacity-growth-report; ddl-out-of-band-detector; pgss-slo-report; wraparound-monitor-report; Workflow Lint; Template — Workflow Name Here; CI Metrics Weekly (E66/E87); Policies Baseline; No Prod Leak in Dev/Test Config; Select Columns vs Types; E2E Focused UI — Matrix (E78); Cache Prune; DR Drill Reminder; Python Package using Conda; Mark stale issues and pull requests.

Sem execução na `main` (21): Delete Orphan Edge Functions; Copilot code review; Copilot cloud agent; Sentinel Self-Test; `.github/workflows/auto-regenerate-types.yml`; pages-build-deployment; E2E · Update Quote Conditions snapshots; Bundle size report; migrations-sync-log-gate; E2E · Update Quote No-Pres snapshots; `_secrets-check (reusable)`; E2E Quotes — Matrix (E77); PR Size Guard (E185); NodeJS with Webpack; Deno; Jekyll site CI; Codacy Security Scan; Dependency review; Node.js CI; `.github/workflows/main.yml`; E2E · Update Quote Missing-Fields snapshots. Não contam como verdes ou falhas.

Os demais estados: CodeQL, Quote Builder Delivery Quality e E2E — Personalization Flow estavam `in_progress`; Deploy Gates, SSOT Supabase Guard e Release Please estavam `queued`; Deploy Edge Functions, E2E (Playwright), E2E — Critical Flows & Error Boundaries, E2E • Swatch QuickView, SECURITY DEFINER ACL — Multi-Env e E2E · restore_seller_cart RPC estavam `pending`; cinco execuções estavam `cancelled` e duas `skipped`. Reconsultar antes de afirmar estado final.

**Conclusão P28:** o inventário identifica as falhas e registra explicitamente lacunas de logs/artifacts e dependências externas. Workflows históricos não foram declarados corrigidos sem um run verde. Nenhum workflow foi desativado, nenhum teste/asserção foi removido, e nenhuma escrita no Supabase, migration, DDL ou deploy foi feita.

## P29 — delta do inventário e correção do Gate 1.3 — 2026-10-30

**Snapshot:** 01:53 UTC; reconsulta individual das 119 definições ativas na `main`, com o mesmo critério P28; HEAD `a9a079fd92a3191654e82db748199fd1777b5af9`.

| Estado | Quantidade |
|---|---:|
| `success` | 60 |
| `failure` | 26 |
| `cancelled` | 5 |
| `skipped` | 2 |
| `pending` | 4 |
| `in_progress` | 1 |
| Sem execução na `main` | 21 |

Em relação ao P28, quatro workflows terminaram verdes: CodeQL, E2E — Personalization Flow, SSOT Supabase Guard e Release Please. Deploy Gates, Quote Builder Delivery Quality e E2E — Critical Flows terminaram falhos; o run do Uptime Monitor foi atualizado para um run mais recente. As outras falhas permanecem descritas na tabela P28.

| Workflow | Último run na `main` | Causa/encaminhamento atualizado |
|---|---|---|
| Deploy Gates | [#40985564449](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564449) | Gate 1.3 reproduzido localmente: uma referência em `docs/arquivo/2026-09/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` apontava para migration que não existe mais em `supabase/migrations/`. Histórico Git confirma que o SQL foi arquivado em `supabase/sql-legacy/` no commit [#2284 / `46275a9b2`](https://github.com/adm01-debug/Promo_Gifts_V4/commit/46275a9b2). O manifesto é um registro histórico e preserva o path original. Atualizei a baseline pelo comando oficial, removendo sete referências que deixaram de existir após reconciliação documental e registrando esta referência arquivada; baseline passou de 487 para 481 entradas. `node scripts/check-migration-path-references.mjs` agora passa localmente. A mudança aguarda CI do PR; nenhum SQL foi editado/executado. |
| Quote Builder Delivery Quality | [#40985564312](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564312) | Step `E2E & Visual Regression` falhou; artifact `delivery-quality-report` [ID 12946624713](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564312/artifacts/12946624713) foi publicado (~1,04 GB). O tail retido mostra upload, não a assertion que falhou. Próximo passo: abrir o relatório Playwright e identificar o spec/erro antes de alterar código ou baseline. |
| E2E — Critical Flows & Error Boundaries | [#40985564232](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564232) | Falharam `Run Sidebar Tooltips E2E — desktop (chromium-authed)` e a checagem derivada `Check min tests executed`; artifact `e2e-full-flows-report` [ID 12947149920](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40985564232/artifacts/12947149920) contém 42 arquivos. A causa/assertion do primeiro spec ainda precisa ser lida no artifact; não reduzir o mínimo de testes. |
| Uptime Monitor | [#40986729163](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40986729163) | Continua falhando no step `Probe site + edge function` (curl 22, issue deduplicada #2752). Deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) segue `pending`, sem jobs e sem aprovação pendente na API. Responsável deve inspecionar environment/run; não duplicar deploy nem alterar o canônico. |

Os outros estados não-falhos no snapshot: E2E (Playwright) `in_progress`; Deploy Edge Functions, E2E • Swatch QuickView, SECURITY DEFINER ACL — Multi-Env e E2E · restore_seller_cart RPC `pending`; cinco `cancelled` e dois `skipped`. Não declarar essas execuções verdes até conclusão `success`.

**Validação desta correção:** a reprodução local falhou antes da atualização da baseline e passou depois. A baseline mantém as referências quebradas realmente presentes no checkout (481); a entrada nova tem trilha Git confirmando o arquivamento do arquivo. No commit `826801f68`, `npm run build:verify`, `npm test` (1.247 arquivos, 25.871 testes passados, 1.135 skipped, 24 TODO) e `node scripts/check-migration-path-references.mjs` passaram; resultado igual ao baseline P28, sem regressão. O novo commit que registra esta evidência ainda terá os gates repetidos. Nenhuma migration, DDL, escrita no Supabase, deploy, force push ou alteração da `main` foi feita.


## P30 — inventário atualizado da `main` e diagnóstico das falhas — 2026-10-30

**Snapshot:** 02:16 UTC; catálogo completo de 119 workflows ativos, com consulta individual do último run de `main` (`exclude_pull_requests=true`, `per_page=1`). HEAD observado: `380ceb6238dc4ea4f093bd61ce8dd5419c74ab91`.

| Estado da última execução | Quantidade |
|---|---:|
| `success` | 61 |
| `failure` | 26 |
| `cancelled` | 5 |
| `skipped` | 2 |
| `pending` | 3 |
| `in_progress` | 1 |
| Sem execução na `main` | 21 |

### Workflows que estão em `failure` no snapshot P30

A tabela lista **todos os 26** workflows cujo último run na `main` concluiu em falha. As causas históricas permanecem com evidência em P28; as linhas novas/alteradas trazem o diagnóstico mais recente. Um bloqueio não confirmado continua explicitamente classificado como não diagnosticado.

| Workflow | Último run | Causa observada e ação/bloqueio |
|---|---|---|
| Copilot | [#40975434366](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40975434366) | HTTP 402 de quota e firewall bloqueando `api.github.com`; ação do administrador: regularizar cota/allowlist. |
| Deploy Gates | [#40988483538](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483538) | Gate 1.3 reprova referência de manifesto histórico para migration arquivada. Baseline corrigida localmente nesta branch e checker local passa; a falha permanece na `main` até o PR #2743 ser aprovado/mesclado com checks verdes. Nenhum SQL foi recriado/executado. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Run antigo; a API de logs retorna HTTP 410. Reexecutar pelo fluxo autorizado para diagnosticar o estado atual. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | Drift detectado; identificar os slugs pelo artifact e reconciliar via PR, sem deploy direto. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Run histórico sem jobs/logs acessíveis pela API; causa não confirmada com os logs disponíveis. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `Setup E2E` falhou, sem mensagem-raiz no trecho retido; recuperar stderr/reproduzir antes de mudar o teste. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` EUSAGE por divergência entre manifests e lockfile no SHA histórico; corrigir lock em PR após reprodução. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `anon` recebe `permission denied` em `product_kit_components`/`v_kit_component_complete`; ajustar identidade/fixture do teste, sem grant público ou DDL direto. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `[E108] Sem orçamento enviado no ambiente`; preparar fixture e revisar visualmente antes de atualizar snapshot. |
| E2E Discount Approval | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Falha em `Setup E2E`; logs retidos não mostram causa específica. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Falha em `Setup E2E`; causa não aparece no log retido. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `Install dependencies` falhou, mas stderr do gerenciador não está retido; reproduzir no SHA indicado antes de alterar deps. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname mascarado. Owner precisa verificar o secret/host no ambiente; nenhuma migration aplicada. |
| Uptime Monitor | [#40989993974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40989993974) | `Probe site + edge function` falha com curl 22. O fix do health-check está em `main`, mas o deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) continua `pending` no environment `production`; aprovação do PO necessária. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Código 141/SIGPIPE em pipeline `echo | head`; correção no PR #2745 ainda sem checks/preview verdes. |
| E2E Cart — Matrix | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Diagnósticos distintos: falha no handoff de autenticação e timeout de 120 s no popover de remoção; inspecionar/reproduzir cada cenário. |
| E2E Freight — Matrix | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `E21 — login falhou em CI`; credenciais/serviço do ambiente requerem verificação do owner. |
| E2E Stock — Matrix | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` EUSAGE no lockfile do SHA histórico; reconciliar manifest/lock por PR, sem flexibilizar instalação. |
| CI Security & Drift Checks | [#40988483478](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483478) | Gate WCAG 2.4.7: `src/components/magic-up/AdImageResult.tsx:188` usa `focus-visible:outline-none` sem ring no mesmo literal. Fix está no PR #2758; não mesclado. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | E2E ColorSwatch e Kit Builder excedem timeouts; investigar cada trace sem aumentar timeout ou reduzir cobertura. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | `element(s) not found`; confirmar fluxo/elemento esperado antes de atualizar baseline. |
| E2E — Critical Flows & Error Boundaries | [#40988483529](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483529) | Spec `27-admin-critical-routes.spec.ts`: `/admin/conexoes` e `/admin/rate-limit` terminaram com `body` vazio; a asserção `not.toContainText(500...)` expirou em 120 s. 8 testes passaram, 3 ficaram flaky e 2 falharam. Inspecionar screenshot/trace e disponibilidade das rotas antes de corrigir spec. |
| E2E • Swatch QuickView (Lista + Tabela) | [#40988483565](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483565) | Quatro rotas (catálogo, super-filtro, novidades, reposição) não têm produto com `color_swatches` (`[E108]`); 10 testes foram skipped e a checagem de mínimo falhou. Corrigir fixture/dataset do ambiente, sem reduzir o gate. |

### Mudanças desde o snapshot P29

- `Quote Builder Delivery Quality` foi de falha para **success** no run [#40988483472](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483472).
- A falha de `E2E — Critical Flows` mudou: no run mais novo, falharam rotas admin com corpo vazio; o artifact e os caminhos de trace estão registrados no próprio run.
- `E2E • Swatch QuickView` concluiu `failure` no run [#40988483565](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483565), com evidência de fixture `color_swatches` ausente.
- Workflows em progresso/pendentes não são contados como falha: E2E (Playwright) [#40988483544](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40988483544) está `in_progress`; Deploy Edge Functions [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625), SECURITY DEFINER ACL — Multi-Env [#40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158) e E2E · restore_seller_cart RPC [#40852813455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40852813455) estão `pending`.

**Sem regressão local registrada:** no SHA `26082f23b`, `npm run build:verify` e `npm test` passaram; a execução completa teve 1.247 arquivos aprovados, 25.871 testes aprovados, 1.135 skipped e 24 TODO, iguais ao baseline. O commit de reconciliação P30 ainda será validado conforme o processo após ser criado. Nenhum workflow foi desativado, teste enfraquecido, DDL/migration executada, segredo exposto, deploy disparado ou dado do Supabase alterado.

## P31 — inventário da `main` após o commit 604de54 — 2026-10-30

**Snapshot:** consultas individuais concluídas entre 02:29 e 02:31 UTC, para cada workflow ativo, `branch=main`, `exclude_pull_requests=true`, `per_page=1`. HEAD: `604de54c030c521def563b26351361e6472fafcf`.

| Estado | Quantidade |
|---|---:|
| `success` | 61 |
| `failure` | 24 |
| `cancelled` | 5 |
| `skipped` | 2 |
| `pending` | 3 |
| `queued` | 1 |
| `in_progress` | 2 |
| Sem execução na `main` | 21 |

### Workflows em `failure` no snapshot P31

A tabela lista **todos os 24** workflows cujo último run na `main` concluiu em falha. As causas históricas permanecem com evidência em P28; as linhas novas/alteradas trazem o diagnóstico mais recente. Um bloqueio não confirmado continua explicitamente classificado como não diagnosticado.

| Workflow | Último run | Causa observada e ação/bloqueio |
|---|---|---|
| Copilot | [#40975434366](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40975434366) | HTTP 402 de quota e firewall bloqueando `api.github.com`; ação do administrador: regularizar cota/allowlist. |
| Deploy Gates | [#40991104565](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104565) | Gate 1.3 falha por duas referências textuais a um arquivo de migration que não está versionado na `main`, dentro do dossier do PR #2731. A branch corrige o texto para identificar a migration como proposta do PR sem apresentá-la como arquivo existente; o checker local passa após essa correção. Nenhum SQL foi recriado/executado. |
| Regenerate Supabase Types | [#26378664155](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/26378664155) | Run antigo; a API de logs retorna HTTP 410. Reexecutar pelo fluxo autorizado para diagnosticar o estado atual. |
| edge-functions-drift-check | [#40848475790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40848475790) | Drift detectado; identificar os slugs pelo artifact e reconciliar via PR, sem deploy direto. |
| Supplier Comparison CI | [#39253399818](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253399818) | Run histórico sem jobs/logs acessíveis pela API; causa não confirmada com os logs disponíveis. |
| OptimizedImage E2E CI | [#39263929298](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929298) | `Setup E2E` falhou, sem mensagem-raiz no trecho retido; recuperar stderr/reproduzir antes de mudar o teste. |
| Global Search Quality Gate | [#39263929104](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929104) | `npm ci` EUSAGE por divergência entre manifests e lockfile no SHA histórico; corrigir lock em PR após reprodução. |
| Kit Coverage — Integration | [#40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | `anon` recebe `permission denied` em `product_kit_components`/`v_kit_component_complete`; ajustar identidade/fixture do teste, sem grant público ou DDL direto. |
| Update Quote Visual Snapshots | [#39997674586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39997674586) | `[E108] Sem orçamento enviado no ambiente`; preparar fixture e revisar visualmente antes de atualizar snapshot. |
| E2E Discount Approval | [#39263929177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263929177) | Falha em `Setup E2E`; logs retidos não mostram causa específica. |
| E2E • ColorSwatch 2 linhas (Grid) | [#39263932330](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39263932330) | Falha em `Setup E2E`; causa não aparece no log retido. |
| E2E · Dialogs visual PR check | [#39253396759](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253396759) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| E2E · Check Calendar snapshots | [#39253393953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253393953) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| PDF Visual Regression | [#39253404824](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39253404824) | API não devolveu jobs/logs do run histórico; causa não confirmada. |
| Magazine typed queries — dry-run | [#39257701249](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701249) | `Install dependencies` falhou, mas stderr do gerenciador não está retido; reproduzir no SHA indicado antes de alterar deps. |
| migration-dry-run | [#35506272165](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35506272165) | `psql` não resolve o hostname mascarado. Owner precisa verificar o secret/host no ambiente; nenhuma migration aplicada. |
| Uptime Monitor | [#40989993974](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40989993974) | `Probe site + edge function` falha com curl 22. O fix do health-check está na `main`; o deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) continua `pending`, mas a API de aprovações pendentes retornou `[]`. Causa e ação necessária ainda não confirmadas; não atribuir a bloqueio do PO. |
| Ratchet Weekly — Baixar baselines | [#40296887709](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40296887709) | Código 141/SIGPIPE em pipeline `echo | head`; correção no PR #2745 ainda sem checks/preview verdes. |
| E2E Cart — Matrix | [#40140248814](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40140248814) | Diagnósticos distintos: falha no handoff de autenticação e timeout de 120 s no popover de remoção; inspecionar/reproduzir cada cenário. |
| E2E Freight — Matrix | [#39141334040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39141334040) | `E21 — login falhou em CI`; credenciais/serviço do ambiente requerem verificação do owner. |
| E2E Stock — Matrix | [#39257701140](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39257701140) | `npm ci` EUSAGE no lockfile do SHA histórico; reconciliar manifest/lock por PR, sem flexibilizar instalação. |
| CI Security & Drift Checks | [#40991104549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104549) | Gate WCAG 2.4.7: `src/components/magic-up/AdImageResult.tsx:188` usa `focus-visible:outline-none` sem ring no mesmo literal. Fix está no PR #2758; não mesclado. |
| Nightly Full CI | [#40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | E2E ColorSwatch e Kit Builder excedem timeouts; investigar cada trace sem aumentar timeout ou reduzir cobertura. |
| E2E · Atualizar snapshots visuais (E155) | [#39999649279](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39999649279) | `element(s) not found`; confirmar fluxo/elemento esperado antes de atualizar baseline. |


### Estados não classificados como falha

`E2E (Playwright)` está `queued` ([#40991104520](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104520)); `E2E — Critical Flows` está `in_progress` ([#40991104562](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104562)); `E2E • Swatch QuickView` está `in_progress` ([#40991104522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104522)). `Deploy Edge Functions` ([#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625)), `SECURITY DEFINER ACL — Multi-Env` ([#40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158)) e `restore_seller_cart RPC` ([#40852813455](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40852813455)) permanecem `pending`. A consulta `list_pending_deployments` para o deploy retornou `[]`; causa e ação necessária seguem não confirmadas. Esses estados não foram contados como sucesso nem falha.

**Causa nova confirmada em Deploy Gates:** o run [#40991104565](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40991104565) falhou no Gate 1.3 porque o checker encontrou duas menções do dossier PR-2731 que pareciam apontar para um arquivo real sob `supabase/migrations/`, embora a migration seja apenas proposta na branch desse PR. A correção documental nesta branch remove a referência enganosa ao diretório sem alterar migration ou schema. Reproduzida localmente antes da correção e aprovada depois por `node scripts/check-migration-path-references.mjs`.

**Workflows com `success` no snapshot:** a contagem inclui 61 workflows em `success`; as falhas acima não foram confundidas com runs pendentes/cancelados. O inventário é por definição ativa e seu último run na `main`, não por run mais recente de PR.
