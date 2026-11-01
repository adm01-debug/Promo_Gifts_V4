# BACKLOG DE PRODUÇÃO (índice único)

> **Revalidação mais recente:** [REVALIDACAO_PLANO_2026-10-31.md](./REVALIDACAO_PLANO_2026-10-31.md). As contagens e bloqueios desta página são o snapshot de 25/10; use a revalidação posterior para PRs, workflows e divergências identificadas depois dessa data. Nenhuma pendência de schema é autorizada por este índice.

Consolida as quatro frentes (main `0773535`, 2026-10-25). O detalhe, a evidência arquivo:linha e o SQL proposto ficam nos arquivos de origem; aqui está o índice com IDs, para nada entrar em O2+ sem ID.

| Camada | Arquivo | IDs | Itens | Estado de partida |
|---|---|---|---|---|
| CI / PRs | [backlog/ci.md](backlog/ci.md) | CI-001..CI-008 | 8 + 15 PRs abertas | CI-001 resolvido (#2524); CI-002..006 E2E vermelhos; CI-008 aguarda PO |
| Banco | [backlog/banco.md](backlog/banco.md), [banco_migrations_460.tsv](backlog/banco_migrations_460.tsv) | DB-001..DB-007, DB-P01..P19 | 460 migrations só-no-repo, 7 só-em-prod, 5 prefixos duplicados | P01/P02/P03a/P08/P10/P19 aplicados; resto aguarda PO |
| Supabase | [backlog/supabase.md](backlog/supabase.md) | SB-001..SB-019 | 19 achados | 109=109 edges; 3 crons quebrados; 5xx por saturação do banco |
| Funcionalidades | [backlog/funcionalidades.md](backlog/funcionalidades.md) | FT-001..FT-416 | 416 | Fila de execução de 10 temas |
| Bloqueios | [PENDENCIAS.md](PENDENCIAS.md) | PEND-* | 7 | Aguardam PO |

## Itens de maior severidade (ordem de ataque)
1. **PEND-E01** deploy de edge parado: fix `materials-api` fora de produção (O2).
2. **SB-001/002/003** crons com 401/404 em 100% das execuções (O4, aprovação).
3. **SB-004/005** saturação do banco e falhas de cron mascaradas por `fn_cron_safe_run` (O3/O4, aprovação).
4. **CI-002/003/005/006** E2E vermelhos (dados do usuário E2E).
5. **DB-001/002** drift de 460 migrations (O3, aprovação).
6. **SB-019** drift de conteúdo das edges (107/109 por hash).
7. **FT** fila de execução ordens 1..10 (O5).

## Critério de FEITO
Cada ID só passa a FEITO com SHA/PR + evidência (consulta, log, run). Estado por onda em [PROGRESSO.md](PROGRESSO.md); régua em [BASELINE.md](BASELINE.md).
