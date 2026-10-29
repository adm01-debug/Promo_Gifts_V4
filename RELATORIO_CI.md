# RELATÓRIO CI — Promo Gifts V4
**Gerado em:** 2026-10-29
**Branch desta auditoria:** `fix/graphify-reproducible-version-20261029`
**SHA `main` consultado:** `66d032afa8e31cd4f9b2f60508613794cef928d4` (2026-10-29)

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

## 8. Revalidação posterior — 2026-10-29

**SHA atual da `main`:** `c344508711797a730893644449b16a05f12f4fce` (confirmado por `git ls-remote`).

Na consulta das últimas execuções por workflow, foram observados 36 workflows distintos: 25 com `success` e 7 com `failure`; os demais estavam em estados não concluídos ou sem conclusão. As sete falhas mais recentes e as evidências disponíveis estão registradas em `PENDENCIAS.md` (runs 40813871454, 40808174535, 40762904577, 40762904949, 40762904693, 40762354015 e 40762354171). Os workflows verdes permanecem verdes na fotografia; não foram rerodados.

### Baseline local antes da alteração de documentação

No branch `fix/ci-workflows`, commit de código `1df94731b8527f915f102edaec319e985b742790`:

| Verificação | Resultado |
|---|---|
| `npm run e2e:generate-fixtures` | ✅ Passou; 64 URLs, 18 rotas base; schema validado |
| `npm run build:verify` | ✅ Passou; typecheck, lint sem erros/avisos e build |
| `npm test` | ✅ 1.210 arquivos passaram; 25.656 testes passaram; 131 arquivos / 1.134 testes skipped e 24 TODOs preservados |

Após o commit documental `6ded30e64`, a suíte completa repetiu o mesmo resultado: 1.210 arquivos passaram, 25.656 testes passaram, 131 arquivos/1.134 testes foram skipped e 24 permaneceram TODO. `build:verify` também passou após esse commit, incluindo typecheck, lint (0 erros/0 warnings, sem regressão) e build. O check E2E de fixtures geradas foi validado anteriormente no commit de código `1df94731b`.

### Paridade do ledger Supabase

Consulta somente leitura em `doufsxqlfjyuvxuezpln`: 2.552 versões únicas no ledger remoto, hash MD5 ordenado `ba0ba22d8bcc705632cdeb5a888880c6`, versão mais recente `20261027160000`. O checkout contém 3.009 arquivos de migration, 3.004 versões distintas, hash `dbcbcffc885877af2cef536dc6cbc9cd`, com 5 colisões locais; o diff previamente calculado registra 463 versões apenas locais e 11 apenas remotas. Nenhuma migration foi aplicada nem reconciliada. O PR #2720 altera apenas configuração de CI e documentação, portanto não requer alteração do banco.

No SHA inicial do PR #2720 (`1df94731b`), Gate Final, Gate 1 e Gate 3 passaram. Após os commits documentais, o SHA atual é `d3b705038969f3105da7f8a8c7f11d2939c5f7b4`; na última consulta, 23 checks estavam `success`, 3 `skipped`, 1 `neutral`, Gate 1 e Gate 3 `in_progress`, e a revisão Copilot falhou novamente por HTTP 402/quota (run [40824279431](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40824279431)). Manter sem merge até os checks terminarem e qualquer falha ser resolvida; não declarar sincronização completa enquanto o PR e a divergência do ledger estiverem pendentes.

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


## 8. Atualização de auditoria — 2026-10-29

### Inventário mais recente da `main`

Critério: apenas a última execução de cada workflow na `main` conta como situação atual. Foram observados 7 workflows com última execução em falha; os runs e a evidência resumida estão registrados no adendo de 2026-10-29 em `PENDENCIAS.md`.

| Workflow | Último run com falha | Causa/erro provável observável |
|---|---|---|
| Kit Coverage — Integration | [40813871454](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40813871454) | Permissão `SELECT` ausente para `v_kit_component_complete` (P12) |
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Falhas E2E/visuais em 4 jobs; causa comum não confirmada |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | Asserção do fluxo Catálogo → Kit encontrou texto de erro inesperado |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | 6 asserções E2E de catálogo e Kit Builder falharam |
| E2E • Swatch QuickView | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Falha nos três navegadores; setup auth/Vite foi ignorado e suíte não completou |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | `crm-db-bridge` respondeu HTTP 503 para 2 corpos inválidos |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | 14 casos responsivos falharam; requer análise dos artefatos |

Não foi feita nova alteração de aplicação, infraestrutura ou banco para esses workflows. Falhas cuja causa não está demonstrada permanecem em investigação em `PENDENCIAS.md`.

### Baseline × validação após correção local

No branch `chore/graphify-audit-improvements-20261029`, após corrigir o falso positivo do Gate 1.3 na fixture:

| Verificação | Baseline antes da correção | Após commit `239d3737` |
|---|---:|---:|
| `npm run build:verify` (typecheck, lint, build) | sucesso | sucesso; 0 erros e 0 warnings de lint |
| `npm test` | 1.212 arquivos aprovados, 131 ignorados; 25.661 testes aprovados, 1.134 ignorados, 24 TODO | mesmos totais; sem regressão |
| Contratos do Gate 1.3 | falha por fixture Graphify citando caminho inexistente | 3 scripts passaram |
| Teste direcionado `graphify-metrics.test.mjs` | 4 testes passaram | 4 testes passaram |

O commit `239d3737` foi enviado ao branch do PR #2719. Após o push de documentação `5c80d276`, os checks desse SHA tinham 18 conclusões success, 25 em andamento, 6 skipped e 1 neutral, sem falhas concluídas. A nova revisão Copilot no SHA anterior `239d3737` falhou por cota HTTP 402; está registrada em `PENDENCIAS.md`. O PR permanece aberto até todos os checks obrigatórios do SHA atual concluírem com sucesso.

### Repositório e Supabase canônico

O branch local e o branch remoto do PR estavam sincronizados no SHA `239d3737` após o push. A `main` ainda está no SHA `c3445087`; portanto, as mudanças do PR não estão incorporadas à versão principal. Nenhuma migration, DDL, deploy de função ou dado operacional foi alterado nesta validação. A paridade estrutural de tipos consultada na auditoria anterior permanece distinta do ledger de migrations, cuja divergência histórica está registrada em P7; ela não foi reconciliada nem alterada nesta sessão.

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

## 11. Revalidação pós-merge #2719 — 2026-10-29

### Repositório e checks remotos

- `origin/main` e o checkout local foram sincronizados por fast-forward no SHA `66d032afa8e31cd4f9b2f60508613794cef928d4`; este é o merge do PR #2719. O PR #2721 também está incorporado na `main` via `6b48bebcb2ff5ff922298523f4678383d392ae46`.
- Inventário atual dos 119 workflows ativos, consultando individualmente a execução mais recente na branch `main`: 40 `success`, 24 `failure`, 20 `queued`, 8 `pending`, 1 `in_progress`, 1 `waiting`, 2 `skipped`, 2 `cancelled` e 21 sem execução. A lista de 24 falhas com causa/evidência está em P18 de `PENDENCIAS.md`.
- Na própria revisão do merge, `Supabase Preview` falhou com `Remote migration versions not found in local migrations directory`. O novo `Uptime Monitor` [40950084617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40950084617) falhou somente no probe `health-check` (curl 22); site, `check-login` OPTIONS e Auth Health passaram. A issue automática [#2740](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2740) registra a ocorrência. Não marcar o conjunto pós-merge como verde.

### Baseline local antes da correção de reprodutibilidade Graphify

Executados no SHA `66d032afa8e31cd4f9b2f60508613794cef928d4`, antes de alterar scripts:

| Verificação | Resultado |
|---|---|
| `npm ci` | Concluído; reportou 13 vulnerabilidades no audit da instalação (1 moderada e 12 altas), sem aplicar upgrades automáticos. |
| `npm run build:verify` | Passou: typecheck, lint baseline sem erros/avisos novos, build Vite, guard canônico e verificações do bundle. Warnings existentes de chunk permaneceram. |
| `npm test -- --reporter=dot` | 1.222 arquivos passaram, 130 ignorados; 25.716 testes passaram, 1.135 ignorados, 24 TODO; exit 0. |

### Graphify — execução local de validação

- O comando de refresh agora está sendo fixado em `graphifyy==0.9.91`, a versão homologada documentada, em vez de depender do Graphify global (0.9.97 neste host). A atualização rodou com 0.9.91 e produziu mapa principal com 40.810 nós, 69.347 relações e 2.192 comunidades.
- Referências TypeScript: 1.714 pares encontrados, 0 novas arestas porque já estavam presentes no mapa; 10.343 referências externas ignoradas, 46 arquivos de origem sem nó e 2 declarações não mapeáveis. Métrica: 14.730 nós de baixa conectividade entre 17.972 nós elegíveis; foram excluídos 4.104 nós estruturais de arquivo, 5.444 de configuração, 13.168 não-código e 122 dependências.
- Mapa SQL foi reconstruído isoladamente, sem API/LLM, a partir dos 3.189 arquivos SQL versionados no commit `66d032afa8e31cd4f9b2f60508613794cef928d4`: 20.306 nós e 21.533 relações. `build-metadata.json` registra `version=0.9.91` e SHA de corpus `038be531e7e2e8dd83e0f039c2f1d117d443bbb8c3ab8c79680501bce5f533d2`. O mapa está em diretório ignorado e não versiona schema/dados.
- Limitação observada sem regressão de TypeScript: o parser Graphify registra erro sintático em `src/integrations/supabase/types.ts` na linha 42.514; a geração prossegue e o typecheck independente passa. O relatório inclui o aviso de comunidades que precisam ser renomeadas pelo comando de etiquetagem, sem LLM executado nesta sessão.

### Supabase canônico

Auditoria somente leitura: ledger remoto 2.552 versões; repositório 3.009 arquivos SQL/3.004 IDs únicos, 2.541 comuns, 463 locais apenas e 11 remotos apenas; cinco prefixos duplicados. `pg_catalog` confirmou por nome 398 tabelas, 197 views e 15 enums contra os tipos locais; funções ainda não foram comparadas. Nenhuma migration, DDL, repair, deploy de Edge Function ou dado operacional foi alterado. A divergência que bloqueou `Supabase Preview` permanece pendente e não autoriza sincronização automática.

### Anti-regressão final na branch `fix/graphify-reproducible-version-20261029`

| Verificação | Baseline em `66d032af` | Após a mudança | Resultado |
|---|---:|---:|---|
| `npm ci` | concluído; 13 avisos de vulnerabilidade reportados (1 moderada, 12 altas) | não repetido; lockfile inalterado | dependências instaladas; sem upgrade automático |
| `npm run build:verify` | passou | passou; typecheck, lint baseline com 0 regressões, build e guards canônicos aprovados | sem piora |
| Suíte completa Vitest | 1.222 arquivos / 25.716 testes aprovados; 130 arquivos / 1.135 testes ignorados; 24 TODO | 1.222 arquivos / 25.718 testes aprovados; mesmos skips/TODO | +2 testes, nenhuma regressão |
| Testes focados Graphify | — | 2 arquivos, 7 testes passaram | aprovado |
| `npm run graphify:refresh` + `npm run graphify:sql` | — | ambos executados com `graphifyy==0.9.91` | relatórios e mapa SQL atualizados localmente |

O commit de reprodutibilidade está na branch dedicada `fix/graphify-reproducible-version-20261029` e não foi mesclado. Não mesclar enquanto os checks obrigatórios do PR não concluírem e os bloqueios de CI/Supabase desta auditoria estiverem tratados ou explicitamente aceitos pelo processo de governança.

## 12. Atualização de sincronização e checks do PR #2743 — 2026-10-29

- A `main` local e `origin/main` estão em `66d032afa8e31cd4f9b2f60508613794cef928d4`. A branch deste relatório está em `debcd712a278d5ec2d6353cc670ad8a5335c06b1`, igual ao branch remoto e ao HEAD do PR [#2743](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2743).
- O PR #2743 está aberto e bloqueado. No snapshot de 21:35 UTC, 46 check runs estavam: 11 `success`, 4 `skipped`, 1 `neutral`, 1 `failure`, 22 `queued` e 7 `in_progress`. A falha identificada é o Copilot Reviewer com HTTP 402 por quota de uso adicional; o preview Vercel também está `ERROR`, mas os logs consultados não indicaram causa. Não houve merge nem rerun nesta atualização.
- A seção P19 de [`PENDENCIAS.md`](./PENDENCIAS.md) contém a reconciliação atual do checkout/branch e a auditoria somente leitura do canônico. Em `pg_catalog`, os nomes de 398 tabelas, 197 views e 15 enums coincidem com o inventário local de `types.ts`; a reconciliação das 3.004 versões locais e 2.552 remotas permanece pendente.
- A correção também removeu o snapshot antigo do topo de `PENDENCIAS.md` e alinhou os números do mapa Graphify ao relatório versionado. Essas alterações são documentais e não alteram runtime, APIs, migrations, schema ou dados.

## 13. Inventário mais recente da `main` e validação documental — 2026-10-29

### Último run por workflow na `main`

Consulta individual dos 119 workflows ativos, filtrando `branch=main` e `per_page=1`, concluída em 21:34 UTC. O inventário substitui os contadores anteriores nas seções 8 e 11; os snapshots mais antigos permanecem apenas como histórico.

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

As 27 falhas e suas evidências resumidas estão em [`PENDENCIAS.md`, seção P19](./PENDENCIAS.md). As causas sem log/assertion suficiente estão marcadas como não confirmadas; elas não foram corrigidas por hipótese. Os estados queued, pending, waiting, in_progress, skipped e cancelled não foram contados como falha.

### Comparação baseline × final local

| Verificação | Baseline `66d032af` | Final desta revisão | Resultado |
|---|---|---|---|
| `npm run build:verify` | Passou em baseline anterior | Passou: typecheck, lint baseline sem regressões, guards canônicos, build, ciclos de chunks e harnesses | Sem piora |
| Suíte completa Vitest | 1.222 arquivos; 25.716 testes aprovados; 130 arquivos/1.135 testes skipped; 24 TODO | 1.222 arquivos; 25.718 testes aprovados; 130 arquivos/1.135 testes skipped; 24 TODO | +2 testes aprovados; skips/TODO iguais |
| `git diff --check` | — | Passou nos arquivos documentais alterados | Sem whitespace inválido |

Esta revisão só altera documentação e números de auditoria. Não executou reruns de workflows, alteração em `main`, deploy, migration, repair, DDL ou mudança de dados. A branch e o PR #2743 continuam separados da `main`; o PR permanece bloqueado por checks externos/pendentes descritos em P19.
