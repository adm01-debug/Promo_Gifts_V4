# RELATÓRIO CI — Promo Gifts V4

## Atualização incremental — 2026-10-29 02:26 UTC, PR #2717 `9c921e8d`

`main` continua em `c344508711797a730893644449b16a05f12f4fce`. A PR #2717 está aberta, base `c3445087`, HEAD `9c921e8d3855c4326bd1c1f2e328a113555df648`; não houve merge nem alteração do banco canônico.

No instante da consulta, GitHub reportava 76 checks: 58 success, 5 failure, 6 in progress, 6 skipped e 1 neutral. As falhas identificadas foram:

| Check | Run | Causa observada |
|---|---|---|
| E2E Quotes — Matrix (E77) | [40805437712](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437712) | `undo` passou; continua falhando o snapshot dark mobile do menu: esperado 133×156 px, recebido 128×156 px. A mesma diferença já ocorria nos commits anteriores do PR. Não atualizar baseline/tolerância sem revisão visual. |
| E2E — Magazine Header Layout | [40805437763](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437763) | Três testes esperavam URL `/magazine/{id}` e permaneceram em `/magazine`; causa ainda não comprovada. |
| E2E • Swatch QuickView (Lista + Tabela) | [40805437721](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437721) | Runner recebeu shutdown no job WebKit; Chromium/Firefox ainda estavam ativos quando o snapshot foi registrado. Não há falha de asserção WebKit confirmada. |
| Copilot Code Review | [40805448737](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805448737) | O firewall do runner bloqueou a chamada do Copilot CLI a `api.github.com`; não houve revisão concluída. |

Checks ainda em execução no momento da consulta: visual baselines, e2e gates, Chromium/Firefox do Swatch e audit. Consultar o estado atual antes de mesclar.

### Mudanças e regressão local neste snapshot

Foram enviados ao PR #2717 os commits `e0c76a1e` (alinhamento de cards medido por linha), `b0b06663` (espera explícita pelo cabeçalho) e `9c921e8d` (setup mock e resposta sintética para a tabela). A correção de cotações conserva a ordem Status → Expiração → Nº Orçamento e não grava dados no Supabase. O E2E direcionado local passou com setup mock: 2/2. Após o último commit, lint passou com 0 erros/avisos e 0 regressões; typecheck passou; build passou com os guardas SSOT, análise de ciclos e verificação de harnesses; a suíte completa passou com 1.210 arquivos/25.656 testes, 131 arquivos/1.134 testes ignorados e 24 TODO. O snapshot visual pendente não foi atualizado e o limiar não foi afrouxado.

### Estado do Supabase

Não houve alteração de schema, migration ou dado operacional. A comparação anterior entre o inventário de tipos e `pg_catalog` continua alinhada para as tabelas, views e enums públicos. A divergência do ledger (463 versões somente locais, 11 somente remotas e 5 IDs duplicados localmente na comparação por ID) permanece sem reconciliação; aguarda classificação e evidências de execução. Nenhuma migration foi aplicada ou reparada nesta atualização.

## Snapshot final de auditoria — 2026-10-29, `main` em `c3445087`; PR #2717 em `c4d41bd0`

Consulta feita pelo MCP GitHub: 33 workflows observados na `main`; 23 com última execução verde, 4 vermelhas, 3 canceladas, 2 ignoradas e 1 em execução (rerun WebKit, tentativa 2). No SHA `c4d41bd0` do PR #2717, 65 checks: 45 verdes, 4 vermelhos, 9 em execução, 6 ignorados e 1 neutro. Não houve merge.

| Workflow | Run | SHA | Estado | Evidência resumida |
|---|---:|---|---|---|
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | `c3445087` | failure; correção em PR #2717 | Teste de catálogo procurava a substring `500`, que também aparece em `6.500 produtos`; PR #2717 troca a asserção por mensagens explícitas de erro. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | `c3445087` | failure | Seis testes E2E autenticados falharam; o log mostra clique do botão inicial do Kit Builder excedendo 120 s. Requer diagnóstico com a sessão/dados de teste reais. |
| E2E • Swatch QuickView (Lista + Tabela) | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | `c3445087` | in progress (tentativa 2) | A tentativa anterior recebeu sinal de encerramento durante WebKit; a tentativa 2 ainda não concluiu. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | `cf85bd7b` | failure | `crm-db-bridge`: dois casos de entrada inválida receberam HTTP 503, mas o contrato de teste espera resposta abaixo de 500. Investigar função implantada e logs antes de deploy. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | `cf85bd7b` | failure | Após clicar no primeiro cartão, a URL ficou em `/magazine`; o teste esperava `/magazine/{id}`. A causa ainda não está comprovada. |

### Baseline local e validações pós-commit

No commit de documentação `c4d41bd0` do PR #2717, `actionlint`, `npm run lint`, `npm run typecheck`, `npm run build` e `npm test` passaram: lint 0 erros/avisos; Vitest 1.210 arquivos aprovados, 131 ignorados; 25.656 testes aprovados, 1.134 ignorados e 24 TODO, em 307,38 s. O E2E direcionado de catálogo passou anteriormente com autenticação simulada; o teste dependente de dados reais foi ignorado nesse modo. Para o novo ajuste do caso `undo`, o teste foi reproduzido antes da correção (falhou: esperado 0, recebido 1) e depois passou localmente (2 testes incluindo setup); a causa era duração mínima de 1.000 ms no componente contra espera de 700 ms no spec. O diff final da correção ainda requer repetição pós-commit da suíte completa; o próximo run de CI do PR confirmará os checks. Nenhum teste foi apagado, pulado ou enfraquecido.

### Repositório e Supabase canônico

- `origin/main` e o SHA local de `main` coincidem em `c344508711797a730893644449b16a05f12f4fce`.
- Projeto Supabase canônico confirmado como `doufsxqlfjyuvxuezpln`, estado `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.
- Inventário estrutural de tipos (AST TypeScript, local vs `supabase_generate_typescript_types` do projeto): `public` coincide integralmente — 398 Tables, 197 Views, 1.020 Functions, 15 Enums e 2 CompositeTypes. `graphql_public.graphql` aparece no local e foi confirmado no `pg_catalog` vivo; o gerador remoto omite esse schema auxiliar. Não há drift estrutural identificado nos tipos.
- Comparação somente leitura do ledger: 3.004 IDs únicos em `supabase/migrations`, 2.552 IDs remotos, 2.541 em comum, 463 apenas locais e 11 apenas remotos. A divergência segue em análise pelo PR #2714; nenhuma migration foi aplicada nesta auditoria.
- Nota de reconciliação: o Gate E40 do PR #2714 reportou `local_only=1109; remote_only=648`; esse contrato usa escopo/filtros diferentes da comparação bruta de IDs acima. A diferença entre os métodos precisa ser explicada antes de classificar ou aplicar qualquer migration.
- PRs relacionados ainda abertos: #2714 (reconciliação de migrations), #2715 (guarda de segurança RLS), #2716 (relatório de auditoria) e #2717 (isolamento do servidor E2E e falso positivo de `500`). No SHA `c4d41bd0` do PR #2717: 45 checks verdes, 4 falhos, 9 em andamento, 6 ignorados e 1 neutro. Falhas: reviewer Copilot sem cota; WebKit cancelado pelo runner; screenshot móvel 5 px mais estreito; e `undo` chamando `onUndo` antes da expiração real. A última foi reproduzida e corrigida neste commit; o CI ainda precisa verificar. Nenhum PR foi mesclado nesta etapa.
- A checkout local `main` coincide com `origin/main` em `c3445087`; restam apenas artefatos Graphify gerados e não commitados (`GRAPH_REPORT.md` e `manifest.json`). O relatório local foi atualizado para 2026-10-28 pelo pacote 0.9.91, enquanto a skill indica 0.9.94; o `manifest.json` teve alteração volumosa de metadados. Os artefatos seguem fora do PR para reconciliação do gerador antes de publicação.

Este snapshot substitui os estados históricos abaixo somente para a situação verificada em 2026-10-29; os registros anteriores permanecem como histórico.

**Gerado em:** 2026-10-28  
**Branch de correção:** `fix/ci-workflows` (esta sessão)  
**SHA main no momento do diagnóstico:** `8c81483` (pós-fix Gate E40)  
**SHA main final (pós-merge PR #2708):** `d784edb6` (atualização PENDENCIAS.md — sem alteração de código)
**Gerado em:** 2026-10-29
**Branch desta auditoria documental:** `docs/auditoria-sync-ci-20261029`
**SHA `main` consultado:** `6b48bebcb2ff5ff922298523f4678383d392ae46` (2026-10-29)

## 8. Revalidação completa por workflow — 2026-10-29

Inventário atualizado pela API do GitHub Actions: **119 workflows ativos**, cada um consultado individualmente com `branch=main` e `per_page=1` para obter sua última execução na `main`.

| Estado da última execução na main | Quantidade | Interpretação |
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

## 8. Revalidação — 2026-10-29 00:22 UTC

Consulta nova ao MCP GitHub, após o commit `7e3bfebe` da PR #2717:

| Estado da última execução por workflow na `main` | Quantidade |
|---|---:|
| `success` | 22 |
| `failure` | 5 |
| `cancelled` | 3 |
| `skipped` | 2 |
| `in_progress` | 1 |
| **Total** | **33** |

| Workflow em falha | Run | Causa/evidência atual |
|---|---:|---|
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | Fluxos E2E autenticados sem conclusão; já registrado acima, exige reprodução com a conta/dados E2E. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Falso positivo de asserção (`500` também casa com `6.500 produtos`); fix está na PR #2717, ainda sem merge. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | A navegação esperada `/magazine/{id}` não ocorreu; causa não comprovada. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | `crm-db-bridge` retornou 503 para entrada inválida; exige comparar código implantado e contrato antes de qualquer deploy. |
| Uptime Monitor | [40793110088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40793110088) | Probe `health-check` falhou; investigação e bloqueio registrados em P14 abaixo e em `PENDENCIAS.md`. |

Workflows verdes confirmados na mesma consulta incluem Deploy Gates ([40762904944](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904944)), Branch Protection Sentinel ([40762904734](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904734)), CodeQL ([40762904933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904933)), Supabase Linter Gate ([40762904662](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904662)) e Workflow Lint ([40762354220](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354220)). Swatch QuickView estava em execução no momento da consulta.

### Estado da PR #2717

A PR segue aberta, branch `fix/e2e-vite-port-isolation`, head `7e3bfebecc07c3076c8d0b381f8ab71aae78fe24`; não foi mergeada. Na consulta de 2026-10-29 00:22 UTC havia 21 execuções associadas ao head: 10 verdes, 7 em execução, 3 falhas e 1 ignorada.

| Check com falha | Run | Evidência resumida |
|---|---:|---|
| E2E Focused UI — thumb-quickview | [40792695754](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792695754) | `loginViaUI` expirou após 75 s e permaneceu em `/login`; 21 testes foram skipped e 4 passaram. Logs PostgREST no mesmo intervalo mostram 504 em consultas autenticadas a `profiles`; manter como bloqueio dependente de disponibilidade/autenticação, sem enfraquecer o E2E. |
| E2E Quotes — Matrix | [40792695757](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792695757) | Snapshot mobile dark do menu divergiu; 26 passaram, 7 skipped. Não atualizar baseline sem revisar o diff visual e aprovar a mudança. |
| Copilot Code Review | [40792708888](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792708888) | Falha de quota/uso adicional do serviço; não equivale a aprovação de revisão. |

### Repositório e Supabase canônico — reconciliação

- Checkout `main` local e `origin/main` coincidem em `c344508711797a730893644449b16a05f12f4fce`. As correções de E2E citadas acima estão publicadas somente na branch/PR #2717; ainda não fazem parte de `main`.
- A auditoria estrutural anterior encontrou correspondência dos objetos públicos entre os types locais e o catálogo canônico (398 Tables, 197 Views, 1.020 Functions, 15 Enums e 2 CompositeTypes). Isso não significa que o ledger de migrations esteja sincronizado.
- Comparação exata já realizada por IDs: 3.004 versões únicas locais vs. 2.552 no ledger canônico; 463 IDs apenas locais e 11 apenas remotos. Há também uma saída do gate E40 com `local_only=1109; remote_only=648`, que usa outro escopo/filtro. As métricas não são intercambiáveis; as migrations divergentes permanecem sem classificação e não foram aplicadas/reparadas nesta auditoria.
- Nenhum DDL, migration, dado operacional ou Edge Function foi alterado no Supabase canônico.
- A execução local `graphify update` está alinhada ao commit de origem `c3445087`, mas alterou apenas `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` no checkout principal. Esses artefatos ainda não estão commitados; o binário instalado é 0.9.91 e a skill local declara 0.9.94.

### Uptime Monitor — evidência

Run [40793110088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40793110088) reportou `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0`. O workflow já envia `apikey` e `Authorization` à `health-check`; portanto, não se trata de ausência desses headers. A Edge Function canônica está ativa na versão 275 com `verify_jwt=true`, e o código faz uma consulta limitada a `public.profiles` com timeout de 1.500 ms. Os logs do projeto mostram respostas PostgREST 504 para consultas a `profiles` e cancelamentos PostgreSQL por `statement timeout` no mesmo período. O health check administrativo do banco respondeu, mas isso não invalida os 504 da API. A causa operacional exata dos timeouts ainda não foi isolada; não desativamos JWT nem mascaramos o resultado do probe.

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

## Atualização de auditoria — 2026-10-28/29

### Estado sincronizado

- Checkout local `main` e `origin/main` coincidem em `c344508711797a730893644449b16a05f12f4fce`.
- A PR [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717) permanece aberta: o último HEAD remoto consultado era `5a2e578a269459129d2a24dc2a6047471724003b`, base `c3445087`. As correções do teste undo e esta atualização documental estão em um commit local ainda não enviado: usar o harness DEV (`/__test/undo-toast?interactive=1`) no lugar da rota autenticada que redirecionava a `/login`, e ocultar o toast visual estático somente no modo interativo.
- Validação local reportada para essa correção: spec undo 7/7; snapshots visuais do toast 8/8 sem alteração; fluxo Catalog→Kit 6/6. `quote-view-no-presentation-mode`: 25/27; o snapshot do menu mobile dark diverge 5 px e requer avaliação visual; o AlertDialog falhou sob carga paralela e passou isolado. Nenhum snapshot foi atualizado.
- O commit local ainda não foi enviado; portanto as correções não estão no GitHub nem em `main`. No HEAD remoto consultado, a PR tinha 7 checks falhos, 5 em execução, 49 verdes, 6 ignorados e 1 neutro. Sem merge.
- Pós-commit local: lint aprovado (0 erros/avisos e 0 regressões), typecheck aprovado, build Vite e guardas de produção aprovados, e suíte integral aprovada (1.210 arquivos/25.656 testes aprovados; 131 arquivos/1.134 testes ignorados; 24 TODO). Graphify atualizado; 55.613 nós, 83.734 arestas e 6.617 comunidades. O visualizador HTML não foi gerado por exceder o limite de 5.000 nós; `types.ts` teve extração AST parcial por erro de sintaxe já existente na linha 42.514, sem alteração nesse arquivo.

### Falhas atuais na última execução observada da main

| Workflow | Run | Causa observada |
| Uptime Monitor | [40793110088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40793110088) | Probe `health-check` falhou; issue #2718 foi aberta automaticamente. Investigar PostgREST/health check. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Job E2E de fluxo de catálogo→kit falhou. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | E2E crítico autenticado falhou; requer causa por teste antes de corrigir. |
| E2E • Swatch QuickView (Lista + Tabela) | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | WebKit cancelado por shutdown do runner; Chromium falhou e precisa diagnóstico de teste. |

### Supabase canônico — somente leitura

- Projeto identificado: `doufsxqlfjyuvxuezpln` (Promo_Gifts_V4), status `ACTIVE_HEALTHY`, PostgreSQL 17.6.
- Ledger remoto: 2.552 IDs; máximo `20261027160000`.
- Comparação local: 3.009 arquivos SQL, 3.004 IDs únicos, 463 IDs apenas locais, 11 IDs apenas remotos e 5 versões duplicadas localmente. O gate E40 anteriormente produziu contagem em escopo diferente (1.109/648), ainda não reconciliada; números não são intercambiáveis.
- Nenhuma migration, dado operacional, schema ou objeto do banco foi alterado. Os IDs divergentes permanecem sem classificação e impedem declarar sincronização total. A classificação precisa preceder qualquer aplicação pelo workflow autorizado do repositório.

## Revalidação de sincronização e CI — 2026-10-29 03:12 UTC

### Repositório

- Checkout principal local e `origin/main`: `c344508711797a730893644449b16a05f12f4fce`.
- Branch da PR #2717 local e remota: `b0206929eee037e6fea13ac787114d5765d3884b`; PR aberta, base `c3445087`, sem merge. O código de correção está publicado na branch da PR, não em `main`.
- A árvore principal possui somente alterações locais geradas em `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json`. O Graphify foi atualizado no worktree da PR, mas esses dois arquivos ainda não estão no commit remoto.
- Os gates locais após o commit b0206929e continuam conforme evidência já registrada: lint, typecheck, build e suíte completa aprovados. Não houve alteração de aplicação depois desse commit.

### Última execução de cada workflow na `main`

Consulta ao MCP GitHub com filtro `branch=main`, agrupada pelo nome do workflow e usando a execução mais recente:

| Resultado | Quantidade |
| success | 24 |
| failure | 6 |
| cancelled | 3 |
| skipped | 2 |
| **Total** | **35** |

| Workflow falho | Execução | Evidência resumida / situação |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Duas shards E2E e dois E2E visuais falharam. No shard 2, testes da grade de reposição não encontraram o título `h3` nos itens de lista e faltou baseline para screenshot de foco em desktop; a shard também lista testes de autenticação de mockup. Causa raiz ainda não comprovada. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Falso positivo da checagem textual de `500`, que podia casar com conteúdo numérico do catálogo. Correção já publicada na PR #2717; o check E2E correspondente passou no head b0206929e, aguardando conclusão de todos os checks da PR. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | Quality gate reportou falhas de locators/espera nos E2E, imagens sem conclusão de carregamento e erros HTTP 503/504 no caminho PostgREST. Causa raiz operacional ainda não isolada. |
| E2E • Swatch QuickView (Lista + Tabela) | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Falhas por ausência de linhas/produtos com swatches e timeouts de interação. Na execução da PR #2717, WebKit recebeu sinal de shutdown do runner e Chromium/Firefox ainda estavam em execução às 03:12 UTC. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | Testes do `crm-db-bridge` enviaram payload inválido e receberam HTTP 503, embora esperassem resposta não-5xx. Não foi feito deploy; requer comparar contrato e versão implantada. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | O teste clicava no contêiner `article`, e não no link interno. Correção publicada na PR #2717; os checks Magazine Header OK e E2E Magazine Header (authed) passaram no head b0206929e. |

Workflows verdes relevantes: Deploy Gates [40762904944](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904944), Branch Protection Sentinel [40762904734](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904734), CodeQL [40762904933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904933), Supabase Linter Gate [40762904662](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904662), Workflow Lint [40762354220](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354220) e Uptime Monitor [40810441318](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40810441318).

### PR #2717 — head b0206929e

A PR continua aberta e sem merge. Na consulta de 03:12 UTC havia dois checks em execução: Chromium e Firefox do Swatch QuickView. Também permaneciam não verdes: WebKit (shutdown do runner), Copilot reviewer (HTTP 402/quota e bloqueio de firewall), snapshot mobile dark em `view-no-presentation-mode` (diferença visual aproximada de 5 px), teste de paridade Novidades/Reposição (título `page-title-novidades` ausente) e dois jobs cancelados de E2E/visual baseline. Não houve atualização de snapshot nem relaxamento de assertions. Sem todos os checks obrigatórios verdes, não fazer merge.

### Banco Supabase canônico — somente leitura

- Projeto `doufsxqlfjyuvxuezpln`: `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.063.
- Paridade estrutural gerada pelo Supabase MCP e extraída do `types.ts` local: `public` — 398 Tables, 197 Views, 1.020 Functions, 15 Enums, 2 CompositeTypes; `graphql_public` — 1 Function. A contagem estrutural coincide com a evidência anterior; não houve alteração de tipos ou schema nesta PR.
- Ledger: 2.552 versões remotas, máximo `20261027160000`; repositório: 3.009 arquivos SQL, 3.004 IDs únicos, 463 IDs apenas locais, 11 apenas remotos e 5 IDs duplicados localmente. O gate E40 reporta contagens diferentes por usar outro escopo/filtro; a divergência de metodologia segue pendente.
- Nenhuma migration, DDL, dado operacional, tabela ou Edge Function foi alterada no Supabase. Dados de clientes/produtos são operacionais e não devem ser copiados ao GitHub.

### Resultado desta revalidação

A sincronização de código está correta entre os checkouts locais e as refs remotas correspondentes, mas a correção de E2E ainda não chegou a `main`, pois a PR não passou todos os checks. A estrutura de tipos corresponde ao canônico; o ledger não está reconciliado e não foi modificado. A atualização local do Graphify e os novos registros desta auditoria precisam ser versionados na branch da PR após estabilizar a execução em andamento.
## 8. Revalidação da main e comparação de baseline — 2026-10-29

### Inventário mais recente

Consulta das últimas execuções por workflow na branch `main`, excluindo pull requests: 34 workflows, 27 `success`, 2 `skipped`, 2 `failure`, 2 `cancelled` e 1 `pending`. Cancelamentos e pendência não foram contabilizados como falha.

| Workflow | Run | Resultado / diagnóstico |
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
