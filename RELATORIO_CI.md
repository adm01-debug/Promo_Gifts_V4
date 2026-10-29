# RELATÓRIO CI — Promo Gifts V4

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
| Kit Coverage — Integration | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | ❌ failure | schedule SHA `62af0798` — GRANT ausente (P12) |
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
| P12 | Kit Coverage — Integration | `permission denied for view v_kit_component_complete` | Opção A: resolver P7 e mergear PR #2701 com GRANT. Opção B: `db-apply-migration.yml` com GRANT SELECT |
| P13 | N/A (Vercel infra) | Projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` gerando builds duplicados | Deletar projeto fantasma no dashboard Vercel |
