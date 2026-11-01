# Baseline main — 2026-11-01

**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`

## Resultados

| Check | Resultado | Evidência |
|---|---|---|
| `npx tsc --noEmit` | ✅ exit 0 | Saída vazia (sem erros) |
| `npx vitest run` | ⏳ em execução | Background task bx8udrv2j |
| `npm install` | ✅ | Concluído sem erros |

## Nota

O CI do main pode estar vermelho em alguns gates (conforme PENDENCIAS.md da sessão). O baseline aqui é para medir regressão introduzida por PRs — a comparação é sempre **diferença vs esta linha de base**, não "CI verde absoluto".

Contexto do RELATORIO_CI.md (disponível nas branches): CI passou em 6 SHAs consecutivos nos gates principais (Gate Final verde). Falhas pré-existentes documentadas em PENDENCIAS.md: P1 (4 secrets E2E ausentes), P7 (db-schema-drift-check), P8 (edge-functions-drift-check), P12 (Kit Coverage GRANT ausente).
