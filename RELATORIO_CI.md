# RELATÓRIO CI — Promo Gifts V4
<<<<<<< HEAD

## Atualização da auditoria — 2026-10-29 01:29 UTC

Rechecagem via MCP `GITHUB - MCP - FOREVER` de `main`, da PR #2717 e do Supabase canônico.

- Última execução por workflow na `main` (34 workflows): **24 success, 5 failure, 3 cancelled, 2 skipped**.
- PR #2717: 27 checks — **19 success, 4 failure, 1 em andamento, 2 cancelled, 1 skipped**. Continua aberta e `unstable`.
- `Uptime Monitor` voltou a passar no run [40798430891](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40798430891); isso não identifica a causa dos timeouts anteriores de P14.

| Workflow / check | Execução | Estado | Diagnóstico / bloqueio |
|---|---:|---|---|
| E2E — Critical Flows (main) | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | failure | Falso positivo na busca de `500` dentro de conteúdo que inclui `6.500`; correção de asserção está na PR #2717, não na main. |
| CI Security & Drift (main) | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | failure | Quality gate com E2E autenticados falhando; timeout relatado no fluxo inicial do Kit Builder requer reprodução com a conta E2E. |
| Swatch QuickView (main) | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | failure | Firefox apresentou falhas de toolbar/swatches; Chromium também falhou sem causa isolada; WebKit terminou durante encerramento do runner. |
| Edge Integration Tests (main) | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | failure | `crm-db-bridge` respondeu HTTP 503 para dois casos de body inválido, acima do esperado pelo teste. |
| Magazine Header (main) | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | failure | Navegação ficou em `/magazine` quando o teste esperava `/magazine/{id}`; correção funcional ainda não comprovada. |
| Copilot Code Review (PR #2717) | [40798295714](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40798295714) | failure | HTTP 402 por limite de uso e bloqueio de firewall para `api.github.com`; não representa revisão aprovada. |
| E2E Quotes — Matrix (PR #2717) | [40798283756](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40798283756) | failure | Snapshot mobile dark diverge 5 px; teste de ordem das colunas não encontra o cabeçalho de status no primeiro acesso. Espera candidata não validada com DB isolado foi descartada. |
| CI — Replenishment Module Quality Gate (PR #2717) | [40798283431](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40798283431) | failure | Paridade de cards: 3 falhas — alinhamento do rodapé preço/estoque, screenshot diff e altura fixa em tablet 768px; 12 passaram, 1 ignorado. |
| E2E — Magazine Header Layout (PR #2717) | [40798283590](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40798283590) | failure | 7 falhas de layout/alinhamento responsivo do header/sidebar (sm/lg/xl e título longo); 4 passaram, 4 ignorados e 2 flaky. Consultar trace/artifacts antes de corrigir. |

Na consulta de 01:29 UTC, `E2E (Playwright)` e visual nightly estavam cancelados, Swatch QuickView seguia em andamento. Não mesclar até conclusão válida e resolução dos bloqueios.

### Sincronização do código e do banco

- Checkout `main` local e remoto coincidem em `c344508711797a730893644449b16a05f12f4fce`; correções mais recentes estão em PRs e ainda não foram incorporadas à `main`.
- PR #2717 tem HEAD `7c5f525996ee7dec3443f2886e92efdd9326fa3a`, aberta, sem merge.
- Supabase `doufsxqlfjyuvxuezpln`: consulta somente leitura; projeto ativo e saudável, PostgreSQL 17.6. Ledger tem 2.552 IDs até `20261027160000`; repositório tem 3.009 arquivos SQL e 3.004 IDs únicos, com 463 IDs locais ausentes do ledger, 11 remotos sem arquivo local e cinco duplicidades locais.
- `check-types-inventory-drift` contra `origin/main` não reportou remoções/alterações estruturais; sua comparação live foi pulada. A leitura anterior por `pg_catalog` encontrou 398 tabelas, 197 views/materialized views, 1.334 funções e 15 enums. Isso não resolve a divergência de migrations.
- Não houve escrita no banco. A métrica bruta de IDs não é intercambiável com o gate E40 (`local_only=1109; remote_only=648`); esclarecer filtros e classificar cada ID antes de qualquer reconciliação. Sem `db push`, DDL direto ou `migration repair` em massa; aplicar apenas pelo fluxo E15, com migration versionada e aprovação.

Esta atualização supersede os estados anteriores somente para a consulta registrada; o restante do documento é histórico.

Validação pós-commit `a96c0b52`: lint e typecheck passaram; build passou com os gates de ciclo e harness; Vitest concluiu com 1.210 arquivos e 25.656 testes passando, 131 arquivos e 1.134 testes ignorados, 24 TODO, mais 1 erro assíncrono não tratado (`ReferenceError: window is not defined`) em timer de `LocationPanel.tsx:367`, proveniente de `LocationPanel.test.tsx`. O comando `npm test` terminou com exit 1 por esse erro já conhecido; contagens de testes não regrediram em relação ao baseline registrado.

## Adendo de auditoria — 2026-10-28 (checkout `c344508711797a730893644449b16a05f12f4fce`)

Este adendo substitui os snapshots antigos abaixo para o estado observado nesta data. O checkout local `main` e `origin/main` apontam para o mesmo SHA `c344508711797a730893644449b16a05f12f4fce`.

| Workflow | Última execução na `main` | Estado | Evidência / diagnóstico curto |
|---|---|---|---|
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | `failure` | Teste Catalog→Kit; rota `/produtos` respondeu HTTP 500. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | `failure` | 6 testes Playwright falham; overlay modal `z-[80]` intercepta cliques no catálogo e Kit Builder. |
| E2E • Swatch QuickView (Lista + Tabela) | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | `failure` | Firefox teve 14 falhas: ausência de toolbar em `/novidades` e nenhum produto com swatches V2 entre os 20 primeiros; job WebKit foi encerrado pelo runner (`shutdown signal`). |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | `failure` | 2 testes live de `crm-db-bridge` recebem HTTP 503 para body vazio e string crua; contrato do teste exige resposta abaixo de 500. Execução na SHA anterior `cf85bd7b`. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | `failure` | Navegação fica em `/magazine`, mas os testes esperam `/magazine/<slug>`; execução na SHA anterior `cf85bd7b`. |

Os demais workflows reportados na execução da SHA atual incluem verdes — Deploy Gates [40762904944](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904944), Branch Protection Sentinel [40762904734](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904734), CodeQL [40762904933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904933), E2E Personalization [40762904578](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904578), Supabase Linter Gate [40762904662](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904662), UI Visual & A11y [40762904979](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904979) e outros verificadores de CI na mesma SHA. Execuções `cancelled`/`skipped` não foram classificadas como falha.

### Supabase canônico — reconciliação pendente, sem alteração aplicada

Projeto canônico consultado: `doufsxqlfjyuvxuezpln`. O ledger remoto lista 2.552 versões; o repositório contém 3.004 IDs de migration únicos. A comparação de IDs encontrou 463 versões somente locais e 11 versões somente no ledger remoto. **Isso demonstra divergência de ledger, não prova que o DDL correspondente esteja ausente ou presente.** O Gate E40 Schema Drift já falhou em PR de reconciliação; portanto, nenhuma migration foi aplicada, reparada ou reconciliada às cegas. A classificação por conteúdo e evidência continua pendente em `PENDENCIAS.md`.

O gate local `check:types-inventory-drift` passou sem remoções em relação ao commit-base; a comparação `--live` não rodou, pois `DATABASE_URL` não está configurada. A listagem disponível de tabelas via MCP não incluiu o conjunto completo de views; não há prova completa de igualdade do schema live com `types.ts`.

### Correção de segurança ainda não publicada

A Edge Function canônica `rls-audit` está ativa na versão 278. Foi aberto o PR [#2715](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2715) (commit `090320e1`) para exigir perfil `dev` com autorização server-side antes de usar `service_role`. PR aberto; nenhum deploy foi executado. A função remota permanece sem essa correção até aprovação/merge e execução do workflow oficial de deploy. Ver PENDENCIAS P16.

### Validação local da correção no PR #2715

Build, lint, typecheck, teste focado de autorização (2 pass), gate de autorização de Edge Functions (111/111) e `git diff --check` passaram. A suíte integral reportou 25.657 testes aprovados, 1.134 ignorados e 24 TODO, mas Vitest terminou também com um erro assíncrono não tratado (`window is not defined`) vindo de timer em `LocationPanel.tsx`; o teste isolado do painel passou 12/12. `deno check` não concluiu porque o cache local não contém `npm:@supabase/supabase-js@2.49.4`.

**Gerado em:** 2026-10-28  
**Branch de correção:** `fix/ci-workflows` (esta sessão)  
**SHA main no momento do diagnóstico:** `8c81483` (pós-fix Gate E40)  
**SHA main final (pós-merge PR #2708):** `d784edb6` (atualização PENDENCIAS.md — sem alteração de código)
=======
**Gerado em:** 2026-10-29
**Branch desta auditoria documental:** `docs/auditoria-sync-ci-20261029`
**SHA `main` consultado:** `6b48bebcb2ff5ff922298523f4678383d392ae46` (2026-10-29)

## 8. Revalidação completa por workflow — 2026-10-29

Inventário atualizado pela API do GitHub Actions: **119 workflows ativos**, cada um consultado individualmente com `branch=main` e `per_page=1` para obter sua última execução na `main`.

| Estado da última execução na main | Quantidade | Interpretação |
|---|---:|---|
| `success` | 63 | Última execução verde |
| `failure` | 26 | Todos relacionados em [`PENDENCIAS.md`](./PENDENCIAS.md), seção P17; as causas estão confirmadas quando o log as expõe e explicitamente marcadas como não diagnosticáveis quando a API não devolve log/job |
| `cancelled` | 4 | Não classificados como falha segundo o critério solicitado |
| `skipped` | 2 | Não classificados como falha |
| `waiting` | 1 | Deploy Edge Functions aguardando aprovação; não classificado como falha concluída |
| `pending` | 2 | Execuções aguardando conclusão; não classificadas como falha concluída |
| Sem execução na `main` | 21 | Não há status de execução para classificar |

Workflows críticos verdes no mesmo inventário: Deploy Gates [40920388855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388855), Branch Protection Sentinel [40920389139](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389139), CodeQL [40920388970](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388970), Security Scan [40920389009](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389009), SSOT Supabase Guard [40920389025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389025), E2E Personalization [40920389117](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389117), CI Replenishment [40920388867](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388867) e CRM Callback [40830207224](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40830207224). A lista completa dos 119 está classificada em P17.

**Prova de regressão local registrada nesta sessão:** `npm run build:verify` passou; `npm test -- --run` passou com 1.210 arquivos, 25.659 testes aprovados, 1.134 skipped e 24 TODO, sem redução frente ao baseline local. Isso não equivale a corrigir os 26 últimos runs vermelhos da `main`; eles permanecem em P17 com a causa confirmada ou a limitação de diagnóstico indicada. Não houve alteração em `main`, deploy de aplicação, schema, migration ou dados do Supabase nesta revalidação.

## 9. Estado de sincronização dos branches e do canônico — 2026-10-29

- PR [#2734](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2734), SHA `d6136ea9bc2eef2d96d8bf8124268e1d76dc259d`, continua aberto e mergeable. O fallback do GHCR foi exercitado com sucesso; o Gate Final associado passou. O PR não foi mesclado porque o revisor Copilot falhou por limite HTTP 402 e o status do preview Vercel ficou em erro sem log que permita identificar a causa.
- PR documental [#2735](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2735), inicialmente SHA `6a83494e79134eb34bab0379a183a5728c4f1a35`, continua aberto e mergeable. Esta revisão corrige o inventário que estava incompleto; os checks do novo commit ainda precisam concluir antes de qualquer merge.
- Supabase canônico `doufsxqlfjyuvxuezpln`: `ACTIVE_HEALTHY`, PG 17.6.1.063; 2.552 entradas no ledger, última `20261027160000`. No checkout: 3.009 arquivos SQL, 3.004 versões únicas; comparação de IDs indica 2.541 compartilhadas, 463 locais e 11 remotas, além de cinco grupos duplicados localmente. Esse inventário não comprova equivalência do conteúdo SQL nem do schema ao vivo; E40 continua bloqueando a reconciliação.
- Checkout raiz nesta validação: branch `fix/location-panel-timeout-cleanup`, HEAD `00412ccc3`, igual a `origin/fix/location-panel-timeout-cleanup`; comparação com `origin/main` (`6b48bebc`) indica 8 commits exclusivos do branch e 1 commit exclusivo de `main`. Três saídas Graphify locais continuam modificadas sem commit (`.graphifyignore`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`) e não foram publicadas. Nenhuma migration, DDL, dado operacional ou conteúdo do Supabase foi alterado.

**Resultado da auditoria:** não há prova de sincronização completa entre checkout, `main` e banco. Código aguarda checks nos PRs; reconciliação de migrations aguarda classificação do drift; artefatos Graphify locais ainda aguardam revisão. O relatório registra as diferenças sem promover conteúdo local para produção ou fazer alterações destrutivas.

## 10. Graphify — separação SQL e benchmark direcionado — 2026-10-29

- O mapa SQL foi extraído em corpus temporário isolado dos 3.188 arquivos SQL versionados e consultado com sucesso. Resultado após clustering: 17.839 nós, 32.709 arestas e 2.633 comunidades. A saída local está em `graphify-out/sql/graphify-out/`, caminho ignorado pelo Git; o mapa não está compartilhado no repositório.
- Graphify 0.9.68 foi executado isoladamente via `uvx` sobre o mesmo `graphify-out/graph.json` usado por 0.9.97. No benchmark, 0.9.97 reportou custo médio de ~1.623 tokens/consulta e redução 1.664×; 0.9.68 reportou ~218.295 tokens/consulta e redução 12,4×. Em busca direcionada, a versão atual encontrou caminho reverso de 2 saltos via `contains`; a 0.9.68 não encontrou caminho. Busca não direcionada concordou nas duas versões.
- Decisão técnica baseada no resultado: 0.9.68 não substitui a versão homologada. A separação funcional SQL está validada localmente, mas falta versionar um comando repetível de rebuild e concluir a revisão do relatório/métricas de conectividade.
- A reconstrução SQL não altera migrations, schema nem dados. A consulta validou extração e navegação estrutural, não a semântica/executabilidade das migrations.

> **Adendo de auditoria — 2026-10-28, 20:30 UTC (supersede o snapshot histórico abaixo):** `main` está em `c344508711797a730893644449b16a05f12f4fce`, checkout local sincronizado e limpo. Os runs de push deste SHA ainda estavam pendentes/em andamento na consulta; portanto, o estado não é “todos verdes”. O inventário mais recente retornou 100 execuções/32 workflows: não havia falha concluída como última execução entre os workflows com run terminal retornado, mas 12 workflows ainda estavam pendentes ou em andamento e precisam ser reconsultados. `edge-functions-drift-check` segue com a falha registrada em [40756284439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40756284439): artefato com 110 funções, 81 alinhadas, 29 hashes divergentes e nenhuma função ausente/órfã. Atribuição da causa a deploy fora de banda não foi comprovada. O deploy [40757296680](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40757296680) aguarda aprovação em `Production`; não foi aprovado nem executado.
>
> O PR documental [#2695](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2695) está aberto, atualizado com `main=c344508` e com checks ainda em andamento; não foi mesclado. O checkout anterior foi preservado em `Promo_Gifts_V4.backup-20261028`, sem importar arquivos locais obsoletos. Na validação somente leitura do banco canônico, `types.ts` correspondeu a 398 tabelas, 197 views (193 comuns + 4 materialized views), 15 enums e 2 tipos compostos (`relkind='c'`); a diferença inicial de contagem era apenas a separação de `relkind='m'` e `relkind='c'` no SQL. As três migrations mais recentes (`20261027120000`, `20261027140000`, `20261027160000`) constam no ledger, nos recibos E15 e no repositório. O GitHub também tem dois alertas high abertos ([#68](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/68) e [#69](https://github.com/adm01-debug/Promo_Gifts_V4/security/dependabot/69)) para `extract-zip@2.0.1`; sem versão corrigida indicada pelo endpoint, a correção precisa de investigação de compatibilidade. Não houve DDL, repair, deploy de edge function ou cópia de dados operacionais. A divergência do ledger e as migrations candidatas fora do baseline continuam pendências classificadas, sem aplicação automática.

**Validações locais nesta atualização:** `git diff --check` passou; `scripts/validate-supabase-config.mjs` passou (projeto canônico correto); `scripts/check-migrations-sync-log-gate.mjs --base main --json` passou e confirmou que este PR não altera SQL de migrations; a lista de 29 funções no `PENDENCIAS.md` foi comparada com o CSV de drift sem faltas ou extras. Esta revisão é documental; aguardar os checks do PR antes de qualquer merge.

**Bloqueio no PR:** `copilot-pull-request-reviewer` falhou no run [40763821243](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40763821243), durante `Cleaning up orphan processes`; o trecho disponível não mostra falha de teste de aplicação. O rerun foi recusado com HTTP 403 (`This workflow run cannot be retried`). O detalhe e o próximo passo estão em P15 de `PENDENCIAS.md`. O check `Smoke — HTTP against supabase functions serve` e o `audit` ainda estavam em andamento na última consulta.
>>>>>>> origin/main

---

## 1. Inventário de Workflows — Estado atual na Main (SHA `4562f376`)

| Workflow | Último run na main | Conclusão | Observação |
|---|---|---|---|
| Deploy Gates (Gate Final) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | ✅ success | SHA `4562f376` |
| Branch Protection Sentinel | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | ✅ success | SHA `4562f376` |
| E2E — Critical Flows | [40741741633](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741633) | ✅ success* | SHA `4562f376` — 90% skipped (requireAuth sem secrets) |
| E2E — Personalization Flow | [40741742442](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742442) | ✅ success* | SHA `4562f376` — skipped (requireAuth) |
| E2E • Swatch QuickView | [40741742801](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742801) | ⏳ pending | SHA `4562f376` — em execução no momento do relatório |
| CI Replenishment Module E2E | [40735988559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988559) | ❌ failure | SHA `9bb37c44` — 4 secrets E2E ausentes (P1) |
| Edge Integration Tests — All | [40735988490](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988490) | ❌ failure | SHA `9bb37c44` — versões edge functions desatualizadas (P11) |
| edge-functions-drift-check | [40740410933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40740410933) | ❌ failure | SHA `c7bc0ba6` — drift GitHub × canônico (P8) |
| db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | ❌ failure | workflow_dispatch SHA `2cee272b` — ledger divergente (P7) |
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | ❌ failure | chave publishable sem sessão autenticada; chamada como `anon` sem SELECT na view/tabela. Usar identidade E2E aprovada e fixture determinística; não conceder leitura anon. |
| E2E Quotes — Matrix (E77) | N/A | N/A | Workflow só roda em PR; 0 execuções na main |

> `*` success via `requireAuth`: os testes verificam se as secrets E2E estão presentes; sem elas, o suite é skipped integralmente e o workflow retorna success. A causa raiz (secrets ausentes) está em P1.

---

## 6. Runs de referência — workflows verdes na main após as correções

| Workflow | Run ID | SHA | Conclusão | Data |
|---|---|---|---|---|
| Deploy Gates (Gate Final) | [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) | `8c81483` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) | `c73cb9b` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40739341785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341785) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | `4562f376` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | `4562f376` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40750126659](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750126659) | `d784edb6` | ✅ success | 2026-10-28 |

**Gate Final verde em 5 runs consecutivos na main — condição de processo satisfeita.**

---

## 7. Workflows aguardando ação do PO

Os itens abaixo estão documentados em `PENDENCIAS.md` com o motivo exato do bloqueio e a ação necessária:

| Item | Workflow | Bloqueio | Ação necessária |
|---|---|---|---|
| P1 | CI Quotes — Module E2E | 4 secrets E2E ausentes no GitHub Actions | Adicionar `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`  |
| P2, P9, P10 | E2E Critical Flows, Personalization, Swatch | Dependem de P1 | Resolvido automaticamente após P1 |
| P6 | E2E Quotes — Matrix (E77) | Workflow não roda na main (somente PR); run original era em branch de PR (cancelled) | Investigar se falha persiste em novo PR |
| P7 | db-schema-drift-check | `local_only=1108; remote_only=648` - ledger divergente | Reconciliar via `db-apply-migration.yml` ou `migration repair` com versão explícita |
| P8 | edge-functions-drift-check | Drift GitHub × canônico (funções no repo divergem das deployadas) | Disparar `deploy-edge-functions.yml` (workflow_dispatch) e aprovar `environment: production` |
| P11 | Edge Integration Tests — All | Versões deployadas desatualizadas (código no repo correto) | Disparar `deploy-edge-functions.yml` (workflow_dispatch) |
| P12 | Kit Coverage — Integration | `permission denied` para `v_kit_component_complete` e `product_kit_components`; o workflow está como `anon`, enquanto o canônico já concede SELECT a `authenticated`/`service_role` | Autenticar o teste com uma identidade E2E somente-leitura aprovada e fixar a fixture. Sem grant a `anon`; PR #2701 segue bloqueado por drift/ledger e não corrige sozinho a identidade da chamada |
| P13 | N/A (Vercel infra) | Projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` gerando builds duplicados | Deletar projeto fantasma no dashboard Vercel |

## 8. Revalidação da main e comparação de baseline — 2026-10-29

### Inventário mais recente

Consulta das últimas execuções por workflow na branch `main`, excluindo pull requests: 34 workflows, 27 `success`, 2 `skipped`, 2 `failure`, 2 `cancelled` e 1 `pending`. Cancelamentos e pendência não foram contabilizados como falha.

| Workflow | Run | Resultado / diagnóstico |
|---|---|---|
| CI Security & Drift Checks | [40920388986](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388986) | `failure`: login E2E expira em 75 s. `E2E_HAS_CREDS=true`; `/auth/v1/token` respondeu 200 após 62,4 s, chamadas REST/Edge chegaram a 15–66 s ou permaneceram pendentes. Evidência de latência no caminho de login, causa operacional ainda a identificar. Secrets/senha inválidos não estão comprovados. |
| E2E • Swatch QuickView (Lista + Tabela) | [40920389028](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389028) | `failure`: grade comprimida por breakpoints de viewport com sidebar aberta; `ProductCardActions` intercepta swatch. Toolbar fora da viewport cai em catch que reporta falsamente rota sem dados. `/novidades` e `/reposicao` possuem swatches V1, enquanto o spec exige V2. Requer mockup aprovado para correção visual; não houve alteração de código nesta auditoria. |

Workflows verdes de referência no mesmo SHA `6b48bebcb2ff5ff922298523f4678383d392ae46`: Deploy Gates [40920388855](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388855), Personalization [40920389117](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389117), Replenishment [40920388867](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388867), Security Scan [40920389009](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389009), SSOT [40920389025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389025) e Uptime Monitor [40932376998](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40932376998). Os cancelados são E2E (Playwright) [40920389589](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920389589) e Visual Baseline Nightly [40920388949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40920388949); SECURITY DEFINER ACL [40899426158](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40899426158) estava pending.

### PR #2734 e anti-regressão

O fallback do GHCR para a imagem oficial Docker Hub foi exercitado com sucesso: smoke [40931990305](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40931990305) passou e o log confirma a tag `supabase/postgres:17.6.1.063`, pull completo e digest `sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426`. O Deploy Gates [40931990408](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40931990408), inclusive Gate Final required, passou. Copilot Reviewer falhou por HTTP 402 / quota esgotada ([40932007280](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40932007280)); preview Vercel falhou, mas `vercel inspect --logs` não retornou a causa. O PR segue aberto; veja P17 em `PENDENCIAS.md`.

| Verificação local após o commit | Baseline | Final | Estado |
|---|---:|---:|---|
| `npm run build:verify` (typecheck, lint e build) | Passou; ESLint 0 erros/0 avisos | Passou; ESLint 0 erros/0 avisos | Sem piora |
| Suíte completa Vitest | 1.210 arquivos aprovados; 131 skipped; 25.659 testes aprovados; 1.134 skipped; 24 TODO | Mesmos totais | Sem piora |
| `actionlint` + `shellcheck` | N/A (workflow alterado somente no PR) | Passou | Sem erro YAML/shell |
| Gate final CI | N/A | Passou | `success` |

Não houve alteração em arquivos da aplicação: o PR #2734 toca apenas `.github/workflows/contract-tests.yml`. Nenhum teste foi removido/pulado/afrouxado. Nenhuma migration ou escrita no Supabase foi executada.
