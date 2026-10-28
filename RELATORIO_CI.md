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

### Verificação posterior no head `e8219bb` (2026-10-28)

- A nova execução [Deploy Gates #40774546193](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546193) terminou com falha em Gate E40. O artefato reportou 13.827 bytes fora da allowlist; conteúdos diferem dos artefatos da execução falha anterior (#40770613073, 24.438 bytes) e da execução verde intermediária (#40773362267, drift vazio). Não há mudança de schema, migration, allowlist ou ledger feita por esta sessão que explique a variação. Portanto o Gate Final verde intermediário não comprova estabilidade: a reconciliação continua bloqueada até uma execução reproduzível e a causa da variação ser identificada.
- No head `e8219bb`, `db-schema-drift-check` [#40774546164](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546164) foi cancelado; Copilot [#40774559306](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774559306) falhou por quota; o CI de reposição [#40774546123](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40774546123) ainda estava em execução na última consulta. PR #2714 não foi mesclado e a `main` continua sem as alterações da branch.
- Atualização: no SHA `c5e5a964d98fb930df35ceae5b52bd27ffb1a6c7`, o Deploy Gates [run 40775602248](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40775602248) concluiu `failure`: apenas Gate E40 falhou (artefato `schema-reconciliation-evidence`, 58.049 bytes); os outros gates bloqueantes concluíram com sucesso. O ledger canônico foi relido e contém 2.552 versões, com as três aplicações recentes identificadas; as seis versões pendentes permanecem sem recibo. A execução estável exigida para liberar o PR ainda não foi obtida. Nenhuma gravação no banco foi realizada.
