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
| P12 | Kit Coverage — Integration | `permission denied for view v_kit_component_complete` | Opção A: resolver P7 e mergear PR #2701 com GRANT. Opção B: `db-apply-migration.yml` com GRANT SELECT |
| P13 | N/A (Vercel infra) | Projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` gerando builds duplicados | Deletar projeto fantasma no dashboard Vercel |
