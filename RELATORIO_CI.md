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
