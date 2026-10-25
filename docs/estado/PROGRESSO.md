# PROGRESSO por onda

Atualizado: 2026-10-25 · main `0773535`

| Onda | Estado | Feito (PR/SHA) | Em andamento | Bloqueado | Próximo |
|---|---|---|---|---|---|
| O1 Baseline e inventário | Quase fechada | backlog por camada em `docs/estado/backlog/{ci,banco,supabase,funcionalidades}.md`; este PR consolida | — | Medição local da baseline (PEND-B01); `MAPA_2026-10-24.md`/`resgate-online/` ausentes (PEND-F01) | Aprovação do PO |
| O2 Estabilizar | Em andamento | SB-006 fix `materials-api` (#2552 mergeada); CI-001 resolvido (#2524) | E2E vermelhos (CI-002/003/005/006) | `deploy-edge-functions.yml` sem jobs (PEND-E01): #2552 não está em produção | Diagnóstico do workflow de deploy (frente CI) |
| O3 Banco | Em andamento | P01, P02, P03a, P08, P10, P19 aplicados (ver `banco.md`) | Prova em PG temporário dos 460 itens | DDL/ledger em produção aguarda PO (DB-001a/b, DB-007, #2443) | Lotes por segurança/grants |
| O4 Supabase funcional | Em andamento | Inventário verificado (109=109 edges) | SB-006 | SB-001/002/003/013 (cron/segredo/decisão PO), SB-017 não verificável por MCP | Re-medir logs 7d |
| O5 Funcionalidades | Em andamento | 416 itens FT mapeados | Fila de execução (10 temas) | Decisões de PO listadas em `funcionalidades.md` | Ordem 1 (links públicos mortos) |
| O6 Validação final | Não iniciada | — | — | Depende de O2–O5 | Smoke test + checklist de prontidão |

Regra: cada linha só vira "Feito" com SHA/PR e evidência. Este arquivo é atualizado a cada merge relevante.
