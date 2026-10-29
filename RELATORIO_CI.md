# RELATÓRIO CI — Promo Gifts V4
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

---

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

---
