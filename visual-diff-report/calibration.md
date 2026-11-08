# Calibragem do diff visual — Colapso do LocationPanel

Gerado em 2026-11-08T04:16:22.892Z
Diffs processados: **0**

## Combinações (menos falhas primeiro)

| threshold | maxDiffPixelRatio | Falhas | mobile | tablet | desktop |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0.1 | 0.005 | **0** | 0 | 0 | 0 |
| 0.2 | 0.005 | **0** | 0 | 0 | 0 |
| 0.25 | 0.005 | **0** | 0 | 0 | 0 |
| 0.3 | 0.005 | **0** | 0 | 0 | 0 |
| 0.4 | 0.005 | **0** | 0 | 0 | 0 |
| 0.1 | 0.01 | **0** | 0 | 0 | 0 |
| 0.2 | 0.01 | **0** | 0 | 0 | 0 |
| 0.25 | 0.01 | **0** | 0 | 0 | 0 |
| 0.3 | 0.01 | **0** | 0 | 0 | 0 |
| 0.4 | 0.01 | **0** | 0 | 0 | 0 |
| 0.1 | 0.015 | **0** | 0 | 0 | 0 |
| 0.2 | 0.015 | **0** | 0 | 0 | 0 |
| 0.25 | 0.015 | **0** | 0 | 0 | 0 |
| 0.3 | 0.015 | **0** | 0 | 0 | 0 |
| 0.4 | 0.015 | **0** | 0 | 0 | 0 |
| 0.1 | 0.02 | **0** | 0 | 0 | 0 |
| 0.2 | 0.02 | **0** | 0 | 0 | 0 |
| 0.25 | 0.02 | **0** | 0 | 0 | 0 |
| 0.3 | 0.02 | **0** | 0 | 0 | 0 |
| 0.4 | 0.02 | **0** | 0 | 0 | 0 |
| 0.1 | 0.03 | **0** | 0 | 0 | 0 |
| 0.2 | 0.03 | **0** | 0 | 0 | 0 |
| 0.25 | 0.03 | **0** | 0 | 0 | 0 |
| 0.3 | 0.03 | **0** | 0 | 0 | 0 |
| 0.4 | 0.03 | **0** | 0 | 0 | 0 |

## Como interpretar

- **Falhas = 0**: par candidato — o menor `threshold` + menor `ratio` com zero falhas é o mais seguro.
- **Falhas > 0**: par ainda deixa regressões conhecidas passarem despercebidas.
- A simulação é heurística (baseada no tamanho do `-diff.png`); use como guia inicial e valide re-rodando o spec com os valores escolhidos.

Atualize `SCREENSHOT_OPTS` em `e2e/customization/collapse-reflow.spec.ts` com o par escolhido.