# PENDENCIAS.md — Itens bloqueados por secret/permissão/infraestrutura

**Atualizado:** 2026-10-28
**Branch:** `fix/ci-workflows` (esta sessão)
**Atualizado:** 2026-10-29
**Branch da revalidação:** `docs/revalidacao-planos-20261029`

> Revalidação independente mais recente: veja a seção **Inventário completo da main — 2026-10-29** abaixo. Ela substitui os IDs/status antigos deste arquivo quando houver conflito.

## Auditoria de sincronização local × GitHub × Supabase — 2026-10-29

| Área | Evidência atual | Resultado |
| Código local e GitHub | Branch local `fix/location-panel-timeout-cleanup`, SHA `a172c252f0b8dafebcefa5a37903214ecc44efc4`; PR [#2721](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2721) aponta para o mesmo SHA e continua aberto. | O código está publicado no branch/PR, mas não incorporado à `main` (`c344508`). Há 8 checks falhos; não é seguro integrar ainda. |
| Reconciliação de migrations | PR [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714), SHA `ca316674db0110136e6cbbabee8fbe103aa8ff15`, continua aberto e bloqueado pelo Gate E40. | Não aplicar nem reparar ledger/schema enquanto o drift não for classificado e aprovado. |
| Ledger local × canônico | Repositório: 3.004 versões distintas em 3.009 arquivos SQL; canônico: 2.552 entradas; 2.541 versões compartilhadas, 463 apenas locais e 11 apenas remotas. Existem 5 grupos de versão duplicada no repositório. | Divergência confirmada. As 11 versões remotas e as 463 locais exigem classificação individual; contagens, sozinhas, não autorizam `migration repair` ou DDL. |
| Banco canônico | Projeto `doufsxqlfjyuvxuezpln`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.063; migration mais recente `20261027160000`. | Saúde operacional verificada; isso não significa paridade do ledger nem do schema. Nenhuma escrita foi executada. |
| Este registro | PR documental [#2725](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2725), SHA `e4ef6e5d9339042fbfdd9087d25ebc4c8fefcd08`, aberto. | O check Copilot [falhou no step de limpeza](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40843346745); tentativa de rerun foi recusada pela API (`403`, jobs desta execução não podem ser reexecutados). A causa operacional é do workflow/serviço e permanece pendente. |
| Graphify local | `.graphifyignore`, `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` têm alterações locais não commitadas; o relatório foi gerado em `a172c252`. O mapa SQL foi reconstruído isoladamente a partir de 3.188 arquivos versionados: 17.839 nós, 32.709 arestas e 2.633 comunidades; consulta de validação encontrou objetos SQL esperados. | O mapa SQL está em diretório ignorado (`graphify-out/sql/graphify-out/`) e ainda não há comando versionado de rebuild. Avaliação isolada do Graphify 0.9.68 encontrou regressão: benchmark caiu de 1.664×/1.623 tokens (0.9.97) para 12,4×/218.295 tokens e um caminho direcionado reverso não foi encontrado. Manter 0.9.97 homologado; não substituir sem corrigir e repetir o benchmark. |

**Conclusão:** a sincronização total não foi atingida. As alterações de aplicação estão em PR, não na `main`; o ledger/schema segue divergente; e há alterações locais de Graphify ainda sem revisão/publicação. Não copiar dados operacionais de clientes ou produtos para o repositório.

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

## P12 — Kit Coverage — Integration (cobertura insuficiente na view)

**Workflow:** Kit Coverage — Integration
**Run ID da última falha:** 40874620158 (SHA `6bcc383e438390a44d7538db9c3b0b82f4c0926f`)
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40874620158
**Status:** failure — autenticação e consultas passaram; a cobertura dos dados reais continua abaixo do mínimo.
## P12 — Kit Coverage — Integration (identidade do teste incompatível com os grants)

**Run ID da última falha (main):** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**PR com fix:** [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) (draft — Gate Final ❌)  
**Run de falha no PR:** [40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177) (job Gate Final: 122981142154)  
**Status:** ❌ BLOQUEADO — o workflow consulta como `anon`; PR #2701 também tem checks de ledger/E40 em falha.

**Resultado observado:** autenticação e as duas consultas ao Supabase passaram. A terceira asserção falhou com `Cobertura 56% < threshold 70%` para o kit descoberto dinamicamente.

**Causa confirmada para a permissão:** nenhuma migration de GRANT faltava. Consulta somente leitura a `pg_catalog`/`has_table_privilege` confirmou SELECT para `authenticated` e `service_role`, e ausência para `anon`, tanto em `public.v_kit_component_complete` quanto em `public.product_kit_components`. O teste usava o cliente sem sessão autenticada. A correção de código autentica o usuário E2E e não abre acesso anônimo.
**Causa raiz confirmada em consulta read-only (2026-10-29):** O workflow fornece URL e chave publishable, mas não autentica uma sessão; as consultas são executadas como `anon`. No canônico `doufsxqlfjyuvxuezpln`, `anon` não tem `SELECT` na view `v_kit_component_complete` nem na tabela `product_kit_components`; `authenticated` e `service_role` têm. A view está configurada com `security_invoker=true`. A policy de leitura não substitui o `GRANT`. A fixture `KIT_FIXTURE_ID` também está vazia, mas isso não causa o erro de permissão.

**Gate C25:** corrigido no commit `353d99d31`; a exceção vale somente para o workflow, job autenticado e comando de integração específicos. Os 23 testes do contrato passaram localmente. O run [Deploy Gates #40868363085](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40868363085) terminou com `conclusion: success`, incluindo lint/typecheck, testes unitários, E2E Smoke e build.

**Gap restante — contrato/qualidade da view e fixture:**
- A definição canônica consultada em `pg_get_viewdef` não projeta `component_description`, `primary_image_url`, `images` e `supplier_component_code`, campos que o teste inclui na métrica. A entrada `v_kit_component_complete` em `src/integrations/supabase/types.ts` também omite esses quatro campos, portanto os tipos locais refletem a view remota; o gap está entre o contrato do teste (view como superset da tabela base) e a projeção real.
- Recontagem somente leitura no Supabase canônico, usando a mesma lista de 15 campos e o mesmo arredondamento do teste: 5 de 978 kits ativos com componentes atingem 70% na tabela base; a média por kit é 52,7%. A seleção dinâmica sem ordenação escolhe um kit qualquer, por isso a falha não é reprodutível. A execução atual no SHA `6bcc383e4` repetiu 56% para o kit selecionado: [run #40874620158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40874620158).
- A definição de `v_kit_component_complete` não foi encontrada nas migrations versionadas fora de arquivos de backup/ledger; sua origem e o contrato pretendido ainda precisam ser reconciliados antes de propor DDL. Não alterar a view nem mascarar a divergência ajustando o threshold.
- O teste não deve reduzir o threshold nem conceder SELECT a `anon` para mascarar o problema.

**Estado do PR #2701:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701 — draft. A branch foi atualizada com a `main` de 2026-10-28 e o conflito documental foi reconciliado; ainda não deve ser mesclada enquanto a integração de cobertura estiver vermelha. Commits `353d99d31`, `cb4b745c6` e `6bcc383e4` estão publicados no branch do PR, que incorpora a `main` atual e já não tem conflito documental. O dispatch mais recente falhou somente na cobertura descrita acima; as duas primeiras asserções passaram no run #40874620158.

**Próximo passo:** revisar e aprovar o contrato esperado da view e definir fixture estável que atenda à métrica. Se for aprovada uma mudança de schema, versionar uma migration não destrutiva, validar pelo fluxo obrigatório E15 e atualizar os tipos; não aplicar DDL diretamente via MCP/dashboard. Nenhum GRANT a `anon`, DDL, migration ou dado operacional foi alterado nesta correção.
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

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8 e P11 requerem investigação independente. P12 requer decisão sobre o contrato da view e uma fixture de integração determinística; o último run falhou em 56% contra o mínimo de 70%. P13 requer investigação do projeto Vercel informado.*
*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 bloqueado por P7 (Opção B disponível via workflow_dispatch sem resolver P7). P13 requer deleção do projeto fantasma Vercel.*


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
