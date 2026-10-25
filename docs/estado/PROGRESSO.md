# PROGRESSO por onda

Atualizado: 2026-10-25 · main `193ae5a` (21:01Z)

| Onda | Estado | Feito (PR/SHA) | Em andamento | Bloqueado | Próximo |
|---|---|---|---|---|---|
| O1 Baseline e inventário | Quase fechada | backlog por camada em `docs/estado/backlog/{ci,banco,supabase,funcionalidades}.md`; este PR consolida | — | Medição local da baseline (PEND-B01); `MAPA_2026-10-24.md`/`resgate-online/` ausentes (PEND-F01) | Aprovação do PO |
| O2 Estabilizar | Em andamento | CI-001 resolvido (#2524, d74b33f); SB-006 `materials-api` timeout (#2552, 35fdb57); SB-012 fallback `categories-api` removido (3e1adf1); preflight E99 `SET search_path TO` (64faa1d) | E2E vermelhos (CI-002/003/005/006) | Deploy de edge: run #331 em `waiting` (aprovação do environment Production, PEND-E01); #2552 e `categories-api` ainda não estão em produção | Diagnóstico do workflow de deploy (frente CI) |
| O3 Banco | Em andamento | P01, P02, P03a, P08, P10, P19 aplicados (ver `banco.md`) | Prova em PG temporário dos 460 itens | DDL/ledger em produção aguarda PO (DB-001a/b, DB-007, #2443) | Lotes por segurança/grants |
| O4 Supabase funcional | Em andamento | Inventário verificado (109=109 edges) | Deploy das edges após aprovação; re-medir 5xx 7d | SB-001/002/003/013 (cron/segredo/decisão PO), SB-017 não verificável por MCP | Re-medir logs 7d |
| O5 Funcionalidades | Em andamento | 416 itens FT mapeados; feitos hoje: LGPD anonimização (#2548, 9be832a), `weight_g=0` (#2551, 97eed25), mock de selos/supplier trust (#2553, aebd333), mock de BI (#2554, e653844; f87c4b1), 13 data-testids do kit-builder (6842702), header (be7d4e3), `auth-audit.ts` morto (5d480cd), serviços órfãos (521450d) | Fila de execução (10 temas); #2547 links públicos (frente de funcionalidades) | Decisões de PO listadas em `funcionalidades.md` | Ordem 1 (links públicos mortos) |
| O6 Validação final | Não iniciada | — | — | Depende de O2–O5 | Smoke test + checklist de prontidão |

Regra: cada linha só vira "Feito" com SHA/PR e evidência. Este arquivo é atualizado a cada merge relevante.

## Mergeado hoje (2026-10-25) no main
Backlogs: #2544 (CI), #2545 (funcionalidades), #2549 (Supabase), #2556 (banco, 15e10fd; evidências em 193ae5a), #2566 (consolidação, 3e4c513). Segredos de cron documentados em `SEGREDOS.md` (1047f49); SB-020/021 no backlog Supabase (cfe8487).
