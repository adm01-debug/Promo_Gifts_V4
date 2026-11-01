# PROGRESSO por onda

Atualizado: 2026-11-01 main `de5345d` (22:30Z)

| Onda | Estado | Feito (PR/SHA) | Em andamento | Bloqueado | Proximo |
|---|---|---|---|---|---|
| O1 Baseline e inventario | Quase fechada | backlogs ci/banco/supabase/funcionalidades commitados; consolidacao #2566 | -- | PEND-B01 npm ci E403; PEND-F01 MAPA ausente | Aprovacao do PO |
| O2 Estabilizar | Quase fechada | E2E fixes #2721 merged 2026-10-29; edge deploy E66 run 40230472012 confirmado (commit 9b5f283); CI Gate Final verde em de5345d | -- | PEND-C01 E77 Quotes ainda vermelho | -- |
| O3 Banco | Quase fechada | SB-0001..SB-0009 (#2730 merged 2026-10-29); PERF-001/003/005; reconciliacao ledger #2937 merged 2026-10-31 | -- | PEND-D02 drift E40 em acompanhamento; PR #2944 release-1.6.1 aguarda PO para mergear (deploy prod) | -- |
| O4 Supabase funcional | Quase fechada | Fase A concluida #2905 merged 2026-10-31; 109 edges inventariadas | -- | PEND-S01 crons SB-002/003 apontam para edges inexistentes; PEND-S02 SB-017 Auth config | -- |
| O5 Funcionalidades | Em andamento | FT-059 kit-builder #2902 merged; cart template #2884 merged; audit suite nav #2940 (CI aguardando verificacao) | #2940 feat audit suite nav | #2927 fix url state (Supabase Preview failed); #2941 security allowlist (conflito) | Monitorar #2940 |
| O6 Validacao final | Em andamento | BACKLOG_PRODUCAO.md como index; BASELINE.md com Gate Final sha 59a7a607 | Smoke test producao; checklist de prontidao | Aguarda O2-O5 fecharem | Smoke test fluxos criticos |

Regra: cada linha so vira "Feito" com SHA/PR e evidencia. Este arquivo e atualizado a cada merge relevante.

## Mergeado em 2026-10-26 ate 2026-11-01

- 2026-10-26: #2443 DB reconciliacao (via PR merged confirmado em revalidacao 2026-10-31)
- 2026-10-29: #2721 fix location-panel-timeout-cleanup (E2E fixes)
- 2026-10-29: #2730 banco SB-0001..SB-0009 repair-only ledger
- 2026-10-31: #2937 reconciliacao ledger repair-only E99
- 2026-10-31: #2905 Supabase Fase A
- 2026-10-31: releases 1.5.0 e 1.6.0 (release-please)
- 2026-11-01: multiplos merges frente CI/banco/Supabase (de5345d = HEAD main)

## Incidentes registrados

- PEND-I01 (2026-11-01): sessao Claude Desktop aplicou DDL diretamente em producao via MCP fora do fluxo autorizado. Ver PENDENCIAS.md secao PEND-I01.
