# RELATÓRIO CI — Promo Gifts V4
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

## 8. Auditoria de sincronização local × GitHub × Supabase canônico — 2026-10-28

- Checkout principal limpo em `c344508711797a730893644449b16a05f12f4fce`, igual a `origin/main`; o branch de auditoria #2695 está publicado, mas não mesclado (check `copilot-pull-request-reviewer` falhou).
- Banco confirmado explicitamente pelo project ref `doufsxqlfjyuvxuezpln`. Ledger ao vivo contém `20261027120000`, `20261027140000` e `20261027160000`; há seis migrations posteriores no repositório sem recibo/aplicação comprovada. Detalhes e bloqueios estão em P14 de `PENDENCIAS.md`.
- Comparação local baseline, antes da correção: `npm ci` success; `npm run build` success; `npm run lint:baseline` success (0 erros/0 warnings, sem regressão); `npm run typecheck` success; `npm test -- --reporter=dot`: 1.210 arquivos e 25.656 testes passaram, 131 arquivos/1.134 testes skipped e 24 todo.
- `npm run check:types-inventory-drift -- --base HEAD~1 --json` passou sem remoção/alteração estrutural local. Checagem `--live` não foi executada localmente; a comparação canônica permanece evidenciada pelos checks GitHub.
- `node scripts/check-migration-filename-contract.mjs`, `node scripts/validate-supabase-config.mjs` e `git diff --check` passaram.
- A main ainda tem falha no run [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577): o teste E2E rejeita a string `500`, que também aparece no nome válido de produto “Caneca alumínio 500ml”. Isso é falso positivo do teste; não indica erro 500 da aplicação.
- Nenhum dado operacional foi copiado ao GitHub. Nenhuma migration, DDL, `migration repair` ou deploy foi executado diretamente.

## 9. Atualização pós-PR #2714 — 2026-10-28

- Código de correção está no GitHub na branch `fix/reconcile-canonical-pending-migrations`, SHA `09ac38b8233c8116196f873fa802ae886ce3206f`; PR [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) permanece aberto. Checkout principal está limpo e alinhado à `origin/main` em `c344508711797a730893644449b16a05f12f4fce`; portanto essas correções ainda não estão na `main`.
- A suíte local após o commit final passou: build, lint baseline (0 erros/0 warnings), typecheck e 25.658 testes; baseline: 25.656 testes. Gate E75 local e teste focado 22/22 passaram.
- Gate Final attempt 2 no run [40770613073](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40770613073) falhou E40 e gerou artefato com DDL fora da allowlist. Porém, no head posterior `30b468863c104102a04c6394a3d612f72c0087bf`, o Deploy Gates [run 40773362267](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40773362267) concluiu `success`, incluindo E40 com `schema_drift.clean` vazio e replay de 25 migrations após o baseline. O CI Replenishment [run 40773361986](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40773361986) também concluiu `success`. Nenhuma DDL, allowlist ou ledger foi alterada por esta sessão para produzir os resultados; a falha anterior não se reproduziu e a variação deve ser investigada antes de reparar schema/ledger.
- Outros checks do head `30b4688`: `db-schema-drift-check` [run 40773362043](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40773362043) foi cancelado; Copilot Code Review [run 40773373723](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40773373723) falhou por quota HTTP 402; o status Vercel reportou falha de deployment preview. PR #2714 continua aberto e não mesclado até os checks restantes ficarem verdes.
- Nenhuma DDL, migration, repair, deploy ou cópia de dados operacionais foi feita no Supabase canônico. As seis migrations sem recibo continuam pendentes e sujeitas ao fluxo E15 após classificar o run Production desconhecido, resolver secrets/precondições e aprovar apenas versões identificadas.

## 10. Validação posterior no head `3b52583f1` — 2026-10-28

- `npm run build`, `npm run lint:baseline` e `npm run typecheck` passaram após os commits do branch. A primeira execução da suíte completa reportou 25.659 testes passando, 1.134 skipped, 24 todo e um erro de execução; a repetição silenciosa terminou com exit 0: 1.210 arquivos passaram, 131 skipped, 25.659 testes passaram, 1.134 skipped e 24 todo (259,82 s). Baseline anterior: 25.656 testes passando; sem queda de testes aprovados. O teste focal do sanitizador também passou 102/102.
- Deploy Gates [run 40778345107](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40778345107): Gate 0, Gate 2, Gate 2.5, Gate 3 (E2E Smoke), Gate 4, Gate 5, E23, E40 file detection e checks auxiliares passaram. Gate E40 Schema Drift Check falhou com resíduo de 24.438 bytes (46 statements no artefato), então o Gate Final não está liberado. O sanitizador contabilizou 12 cláusulas `WITH NO DATA` removidas, mas a correção não limpou o diff; classificar as diferenças restantes antes de qualquer allowlist ou ação no banco.
- O status Vercel do commit continua `failure` no preview. PR #2714 segue aberto; branch `fix/reconcile-canonical-pending-migrations` está publicado no SHA `3b52583f1`; `main` continua em `c344508711797a730893644449b16a05f12f4fce`. O ledger canônico permanece com 2.552 versões até `20261027160000`; as seis migrations posteriores não têm recibo. Nenhuma alteração foi aplicada ao Supabase.

### Verificação posterior no head `e8219bb` (2026-10-28)

- A nova execução [Deploy Gates #40774546193](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546193) terminou com falha em Gate E40. O artefato reportou 13.827 bytes fora da allowlist; conteúdos diferem dos artefatos da execução falha anterior (#40770613073, 24.438 bytes) e da execução verde intermediária (#40773362267, drift vazio). Não há mudança de schema, migration, allowlist ou ledger feita por esta sessão que explique a variação. Portanto o Gate Final verde intermediário não comprova estabilidade: a reconciliação continua bloqueada até uma execução reproduzível e a causa da variação ser identificada.
- No head `e8219bb`, `db-schema-drift-check` [#40774546164](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546164) foi cancelado; Copilot [#40774559306](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774559306) falhou por quota; o CI de reposição [#40774546123](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546123) ainda estava em execução na última consulta. PR #2714 não foi mesclado e a `main` continua sem as alterações da branch.
- Atualização: no SHA `c5e5a964d98fb930df35ceae5b52bd27ffb1a6c7`, o Deploy Gates [run 40775602248](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40775602248) concluiu `failure`: apenas Gate E40 falhou (artefato `schema-reconciliation-evidence`, 58.049 bytes); os outros gates bloqueantes concluíram com sucesso. O ledger canônico foi relido e contém 2.552 versões, com as três aplicações recentes identificadas; as seis versões pendentes permanecem sem recibo. A execução estável exigida para liberar o PR ainda não foi obtida. Nenhuma gravação no banco foi realizada.
- Investigação de E40: os 7 `CREATE MATERIALIZED VIEW` no artefato #40775602248 correspondem exatamente às queries do baseline após ignorar `WITH NO DATA`; as sete MVs estão `ispopulated=true` no canônico (`pg_catalog.pg_matviews`). O artefato é falso positivo da população do dump vazio, não evidência de diferença estrutural. Foi implementado no branch um ajuste restrito ao sanitizador do replay para remover essa cláusula apenas em MVs e preservando definições SQL; teste focado `tests/scripts/drift-baseline.test.mjs` passou (102/102). A correção ainda depende do E40 remoto para validação.
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
