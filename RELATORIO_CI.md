# RELATÓRIO CI — Baseline e Inventário de Falhas

**Data**: 2026-11-08  
**Main HEAD**: `1d3dafae93722b7e19f426bcf63701a80ab4b148`  
**Sessão**: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj

---

## 1. Baseline local (antes de qualquer alteração)

| Etapa | Comando | Resultado |
|---|---|---|
| Install | `npm ci` | ✅ OK |
| Build | `npm run build` | ✅ OK (7.64s, sem erros) |
| Lint | `npm run lint` | ✅ OK (0 erros, 0 warnings) |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit` | ✅ OK (exit 0) |
| Testes unitários | `npm test` (vitest) | ❌ BLOQUEADO — Worker crash/OOM: "Worker exited unexpectedly with exit code 1 during starting state". Node v22.23.4. Pool de workers esgota memória ao inicializar o ambiente de testes. Sem alteração introduzida. |

---

## 2. Inventário de workflows — última execução em main

### Falhas confirmadas (última execução = failure)

| Workflow | Arquivo | Último Run | SHA | Conclusão | Link |
|---|---|---|---|---|---|
| edge-functions-drift-check | `edge-functions-drift-check.yml` | 42491884076 | `46ec263` | **failure** | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42491884076) |
| db-schema-drift-check | `db-schema-drift-check.yml` | 42467725023 | `8c3abe3` | **failure** | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42467725023) |
| Nightly Full CI | `nightly-full.yml` | 42439844067 | `16408a6` | **failure** | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42439844067) |
| Kit Coverage — Integration | `kit-coverage-integration.yml` | 42443979822 | `5e28c6c` | **failure** | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42443979822) |
| E2E • ColorSwatch 2 linhas (Grid) | `e2e-color-swatch-grid.yml` | 42440258426 | `9c33e63` | **failure** | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42440258426) |
| DB — Aplicação controlada de migration única (E15) | `db-apply-migration.yml` | 42447046724 | `e09f412` | **failure** (rollback header ausente — corrigido nesta PR; requer re-dispatch manual) | [link](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42447046724) |

### Sucesso confirmado

| Workflow | Último Run | SHA | Conclusão |
|---|---|---|---|
| Branch Protection Sentinel | 42494087662 | `1d3dafa` | ✅ success |
| E2E — Personalization Flow | 42490893784 | `46ec263` | ✅ success |
| Uptime Monitor | 42492964100 | `46ec263` | ✅ success |

---

## 3. Comparação baseline × final

| Etapa | Baseline | Final (esta PR) |
|---|---|---|
| install | ✅ | ✅ (sem alteração em package.json/lock) |
| build | ✅ | ✅ |
| lint | ✅ | ✅ |
| typecheck | ✅ | ✅ |
| vitest | ❌ BLOQUEADO (OOM local) | ❌ BLOQUEADO — sem alteração de código de teste |

**Arquivos alterados nesta PR**:
- `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` — adicionado cabeçalho `-- Rollback:` (comment-only, nenhum DDL alterado)
- `PENDENCIAS.md` — novo (documentação de bloqueios de CI)
- `RELATORIO_CI.md` — este arquivo (novo)

**Regressões introduzidas**: nenhuma. Diff é docs + comment em migration ainda não aplicada ao banco.
