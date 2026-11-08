# PROGRESSO por onda

Atualizado: 2026-11-08 main `561693ff` (01:00Z)

| Onda | Estado | Feito (PR/SHA) | Em andamento | Bloqueado | Proximo |
|---|---|---|---|---|---|
| O1 Baseline e inventario | Quase fechada | backlogs ci/banco/supabase/funcionalidades commitados; consolidacao #2566 | -- | PEND-B01 npm ci E403; PEND-F01 MAPA ausente | Aprovacao do PO |
| O2 Estabilizar | Quase fechada | E2E fixes #2721 merged 2026-10-29; edge deploy E66 run 40230472012 confirmado (commit 9b5f283); CI Gate Final verde em de5345d | -- | PEND-C01 E77 Quotes ainda vermelho | -- |
| O3 Banco | Quase fechada | SB-0001..SB-0009 (#2730 merged 2026-10-29); PERF-001/003/005; reconciliacao ledger #2937 merged 2026-10-31 | -- | PEND-D02 drift E40 em acompanhamento; PR #2944 release-1.6.1 aguarda PO para mergear (deploy prod) | -- |
| O4 Supabase funcional | Quase fechada | Fase A concluida #2905 merged 2026-10-31; 109 edges inventariadas | -- | ~~PEND-S01 resolvida~~ (ver PENDENCIAS); PEND-S02 SB-017 Auth config | -- |
| O5 Funcionalidades | Em andamento | FT-059 kit-builder #2902 merged; cart template #2884 merged; audit suite nav #2940 mergeada 2026-11-01T23:08Z (fix await useRuptureAlerts.ts:73 aplicado antes do merge) | Agente FT-175 em andamento | #3151..#3185 open (outras frentes) | Monitorar agente FT-175 |
| O6 Validacao final | Em andamento | BACKLOG_PRODUCAO.md como index; BASELINE.md com Gate Final sha 59a7a607; Vercel deploy green 2026-11-08T00:42Z (SHA 561693ff) | Smoke test producao; checklist de prontidao | PEND-I01 DDL fora do fluxo (ver PENDENCIAS) | Smoke test fluxos criticos |

Regra: cada linha so vira "Feito" com SHA/PR e evidencia. Este arquivo e atualizado a cada merge relevante.

## Mergeado em 2026-10-26 ate 2026-11-01

- 2026-10-26: #2443 DB reconciliacao (via PR merged confirmado em revalidacao 2026-10-31)
- 2026-10-29: #2721 fix location-panel-timeout-cleanup (E2E fixes)
- 2026-10-29: #2730 banco SB-0001..SB-0009 repair-only ledger
- 2026-10-31: #2937 reconciliacao ledger repair-only E99
- 2026-10-31: #2905 Supabase Fase A
- 2026-10-31: releases 1.5.0 e 1.6.0 (release-please)
- 2026-11-01: multiplos merges frente CI/banco/Supabase; #2940 audit-suite-nav (23:08Z)
- 2026-11-01: PR #2959 docs estado (PROGRESSO.md, PENDENCIAS.md) mergeada

## Mergeado de 2026-11-02 a 2026-11-08

- 2026-11-08: main SHA 561693ff — Vercel deploy green; PRs #3151..#3185 open (varias frentes)

## Incidentes registrados

- PEND-I01 (2026-11-01): sessao Claude Desktop aplicou DDL diretamente em producao via MCP fora do fluxo autorizado. Ver PENDENCIAS.md secao PEND-I01.
