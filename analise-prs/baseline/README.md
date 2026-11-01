# Baseline main — 2026-11-01

**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`

## Resultados

| Check | Resultado | Evidência |
|---|---|---|
| `npx tsc --noEmit` | ✅ exit 0 | Saída vazia (sem erros) |
| `npx vitest run` | ⚠️ 5 falhas pré-existentes | 3 arquivos / 5 testes falhos; 26042 passaram; 1135 skipped |
| `npm install` | ✅ | Concluído sem erros |

## Falhas pré-existentes no main (vitest)

O vitest finalizou com 3 test files falhando e 5 testes com erro (output capturado via `tail -15`; as stacks apontam para `@testing-library/dom/wait-for.js` — provável timeout em componente assíncrono). Essas falhas **existem no main antes de qualquer PR** e devem ser tratadas como ruído de baseline, não como regressão introduzida pelas PRs analisadas.

## Nota

O baseline aqui é para medir regressão introduzida por PRs — a comparação é sempre **diferença vs esta linha de base**, não "CI verde absoluto".

Contexto do RELATORIO_CI.md (disponível nas branches): CI passou em 6 SHAs consecutivos nos gates principais (Gate Final verde). Falhas pré-existentes documentadas em PENDENCIAS.md: P1 (4 secrets E2E ausentes), P7 (db-schema-drift-check), P8 (edge-functions-drift-check), P12 (Kit Coverage GRANT ausente).
