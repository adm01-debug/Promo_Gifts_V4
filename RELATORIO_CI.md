# RELATÓRIO CI — Promo Gifts V4

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
