# RELATÓRIO CI — Promo Gifts V4
**Gerado em:** 2026-10-28  
**Branch de correção:** `fix/ci-workflows` (esta sessão)  
**SHA main no momento do diagnóstico:** `8c81483` (pós-fix Gate E40)  
**SHA main final (pós-merge PR #2709):** `da7bdb8b` (relatório consolidado)

---

## 1. Inventário de Workflows — Estado atual na Main (SHA `da7bdb8b`)

| Workflow | Último run na main | Conclusão | Observação |
|---|---|---|---|
| Deploy Gates (Gate Final) | [40753179645](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179645) | ✅ success | SHA `da7bdb8b` |
| Branch Protection Sentinel | [40753179362](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179362) | ✅ success | SHA `da7bdb8b` |
| E2E — Critical Flows | [40753179399](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179399) | ✅ success* | SHA `da7bdb8b` — 90% skipped (requireAuth sem secrets) |
| E2E — Personalization Flow | [40753179296](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179296) | ✅ success* | SHA `da7bdb8b` — skipped (requireAuth) |
| E2E • Swatch QuickView | [40753179537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179537) | ✅ success | SHA `da7bdb8b` |
| CI Replenishment Module E2E | [40735988559](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988559) | ❌ failure | SHA `9bb37c44` — 4 secrets E2E ausentes (P1) |
| Edge Integration Tests — All | [40735988490](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988490) | ❌ failure | SHA `9bb37c44` — versões edge functions desatualizadas (P11) |
| edge-functions-drift-check | [40740410933](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40740410933) | ❌ failure | SHA `c7bc0ba6` — drift GitHub × canônico (P8) |
| db-schema-drift-check | [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | ❌ failure | workflow_dispatch SHA `2cee272b` — ledger divergente (P7) |
| Kit Coverage — Integration | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | ❌ failure | schedule SHA `62af0798` — GRANT ausente (P12) |
| E2E Quotes — Matrix (E77) | N/A | N/A | Workflow só roda em PR; 0 execuções na main |

> `*` success via `requireAuth`: os testes verificam se as secrets E2E estão presentes; sem elas, o suite é skipped integralmente e o workflow retorna success. A causa raiz (secrets ausentes) está em P1.

---

## 2. Comparação Baseline × Final

| SHA | Evento | Deploy Gates | Observação |
|---|---|---|---|
| Antes desta sessão | workflows em falha | ❌ (P0/P4: Gate E40 + pg_cron) | Baseline problemático |
| `8c81483` | fix(migrations): guard pg_cron | ✅ [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) | P0/P4 corrigidos |
| `c73cb9b` | fix(ci): CI Security Calendar RDP v10 | ✅ [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) | P5 corrigido |
| `4562f376` | Correções de documentação | ✅ [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | P9 confirmado |
| `d784edb6` | docs: PENDENCIAS.md (#2708) | ✅ [40750126659](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750126659) | Sem regressão |
| `da7bdb8b` | docs: RELATORIO_CI.md (#2709) | ✅ [40753179645](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179645) | SHA final — sem regressão |

**Conclusão:** Deploy Gates verde em 5 SHAs consecutivos após as correções. Nenhuma regressão introduzida pelos commits desta sessão.

---

## 8. Tabela de Prova Consolidada — Todos os Workflows em Falha

| Workflow | Run ID | Conclusão | Link | Bloqueio |
|---|---|---|---|---|
| Deploy Gates (Gate Final) | 40753179645 | ✅ success | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179645) | — corrigido (P0/P4) |
| Branch Protection Sentinel | 40753179362 | ✅ success | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179362) | — corrigido (P3) |
| E2E — Critical Flows | 40753179399 | ✅ success | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179399) | — skipped sem secrets (P1) |
| E2E — Personalization Flow | 40753179296 | ✅ success | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179296) | — skipped sem secrets (P1) |
| CI Security — Calendar/RDP | 40745678435 | ✅ success | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435) | — corrigido (P5) |
| CI Replenishment Module E2E | 40735988559 | ❌ failure | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988559) | [P1 → PENDENCIAS.md](PENDENCIAS.md#P1): 4 secrets E2E ausentes |
| Edge Integration Tests — All | 40735988490 | ❌ failure | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40735988490) | [P11 → PENDENCIAS.md](PENDENCIAS.md#P11): deploy edge functions desatualizado |
| edge-functions-drift-check | 40740410933 | ❌ failure | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40740410933) | [P8 → PENDENCIAS.md](PENDENCIAS.md#P8): drift GitHub × canônico |
| db-schema-drift-check | 40708395880 | ❌ failure | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880) | [P7 → PENDENCIAS.md](PENDENCIAS.md#P7): ledger divergente (local_only=1108) |
| Kit Coverage — Integration | 40628415319 | ❌ failure | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | [P12 → PENDENCIAS.md](PENDENCIAS.md#P12): GRANT SELECT ausente |
| E2E Quotes — Matrix (E77) | N/A | N/A | — | [P6 → PENDENCIAS.md](PENDENCIAS.md#P6): workflow PR-only, sem runs na main |

> Workflows com ❌ failure têm bloqueio documentado em `PENDENCIAS.md` com motivo exato e ação necessária do PO.

---

## 6. Runs de referência — workflows verdes na main após as correções

| Workflow | Run ID | SHA | Conclusão | Data |
|---|---|---|---|---|
| Deploy Gates (Gate Final) | [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) | `8c81483` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) | `c73cb9b` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40739341785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341785) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40741742537](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741742537) | `4562f376` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40750126659](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40750126659) | `d784edb6` | ✅ success | 2026-10-28 |
| Deploy Gates (Gate Final) | [40753179645](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179645) | `da7bdb8b` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) | `c7bc0ba6` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40741741700](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40741741700) | `4562f376` | ✅ success | 2026-10-28 |
| Branch Protection Sentinel | [40753179362](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179362) | `da7bdb8b` | ✅ success | 2026-10-28 |
| E2E — Critical Flows | [40753179399](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40753179399) | `da7bdb8b` | ✅ success | 2026-10-28 |

**Gate Final verde em 6 runs consecutivos na main — condição de processo satisfeita.**

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
