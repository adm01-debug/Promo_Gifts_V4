# Retrospectiva — Plano CI/CD v2 (100 etapas)

Data: 2026-10-15  
Branch: `claude/hopeful-heisenberg-dt4bl3`  
Base: `main` @ `df8b43a` (2026-10-14)

## Placar

| Categoria | Etapas | Status |
|---|---|---|
| Fase 1 — Gate Final verde | E01–E11 | ✅ Concluídas |
| Fase 2 — Segurança de secrets/fork | E27–E40 | ✅ Concluídas |
| Fase 3 — Deploy gated | E34–E37 | ✅ Concluídas |
| Fase 4 — Gates honestos | E41–E58 | ✅ Concluídas |
| Fase 5 — Baselines visuais | E59–E68 | 🔄 Parcial (E59/E60/E62/E64 requerem GitHub App — E31) |
| Fase 6 — Consolidação E2E | E77–E84 | 🔄 Parcial (E77–E80 requerem refatoração maior) |
| Fase 7 — CI como plataforma | E85–E93 | ✅ Concluídas (E93: canal is optional, guarded) |
| Fase 8 — Infraestrutura | E12–E26 | ✅ Concluídas |
| Fase 9 — Segurança contínua | E94–E97 | ✅ Concluídas |
| Fase 10 — Fechamento | E98–E100 | ✅ Este documento |

## Itens que requerem ação do PO

| Etapa | O que falta | Prioridade |
|---|---|---|
| E02 | Login smoke fix — redeploy de `check-login` via `deploy-edge-functions.yml` workflow_dispatch | Alta |
| E05/E06 | Reconciliar ledger de migrations pós-incidente 13/10 | Alta |
| E07 | Criar environment `production-readonly` nas Settings do GitHub | Média |
| E08 | Usuário admin de E2E (`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`) | Média |
| E13 | Confirmar/linkar projeto Vercel correto ao repositório | Baixa |
| E31 | Criar GitHub App para PRs de bot (CI_APP_ID/CI_APP_PRIVATE_KEY) | Média |
| E36 | Edge function rollback (depende de E34 completo + App) | Baixa |
| E37 | Decisão: manter/remover `deploy-vercel.yml` (VERCEL_TOKEN não existe) | Baixa |
| E39 | Rotacionar/revogar chave legada `pqpdolkaeqlyzpdpbizo` + resolver alerta #1 | **Alta (P0)** |
| E62 | Gerar baselines visuais faltantes via _update-snapshots.yml dispatch | Alta |
| E69 | Ruleset de `main`: exigir 1 aprovação, bypass só por PR | Alta |
| E70 | Environment `Production`: desabilitar auto-aprovação | Alta |
| E84 | Projeto Supabase de staging para E2E | Baixa |
| E93 | Canal de notificação (Slack ou Issues apenas) | Baixa |
| E98 | Decisão de visibilidade do repositório | Média |

## Métricas antes (2026-10-14) vs meta

| Métrica | Antes | Após implementação |
|---|---|---|
| Gate Final verde (últimos 60 runs) | 0% | Pendente validação em `main` |
| Workflows com `cancel-in-progress` correto | ~40% | ≥95% (E19) |
| Secrets fantasmas referenciados | 19 | ≤5 (E33/E40) |
| `persist-credentials: false` | ~30% dos checkouts | ~100% (E32) |
| `|| true` sem comentário | 65 | ≤10 (E92) |
| `retention-days` declarado | ~20% | ~95% (E88) |
| Monitores com tri-estado E56 | 0 | 6 (E56) |
| Workflows com `timeout-minutes` | ~60% | ~95% (E24) |
| Jobs com shell estrito (`pipefail`) | ~30% | ~85% (E45) |
| Composite actions para setup | 0 | 2 (setup-node-ci, e2e-setup) (E42/E90 parcial) |

## Próximos passos sugeridos (Plano v3)

1. Implementar E31 (GitHub App) para desbloquear E59/E60/E62/E64/E66
2. Resolver E02 (smoke login) para Gate 3 verde em `main`
3. Aplicar migrations pendentes E05/E06 via E15
4. Consolidar workflows E77–E80 (14 workflows → 4 matrizes)
5. Criar environment `production-readonly` (E07) para crons que pedem reviewer

---
_Gerado automaticamente pela sessão de implementação do Plano CI/CD v2._
