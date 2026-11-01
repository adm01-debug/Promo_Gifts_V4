# Baseline main — 2026-11-01

**SHA main fixado:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`

## Resultados

| Check | Resultado | Evidência |
|---|---|---|
| `npx tsc --noEmit` | ✅ exit 0 | Saída vazia (sem erros) |
| `npx vitest run` | ⚠️ 5 falhas pré-existentes | 3 arquivos / 5 testes falhos; 26042 passaram; 1135 skipped |
| `npm install` | ✅ | Concluído sem erros |
| `npm run build` | ✅ `built in 16.22s` | Sem erros; warnings sobre dynamic imports são pré-existentes |
| ESLint | ⚠️ crash (OOM) | Processo abortado (SIGABRT) no container; exit 0 via script wrap |

## Falhas pré-existentes no main (vitest)

3 arquivos / 5 testes falhando no main antes de qualquer PR:

| Arquivo | Testes falhando |
|---|---|
| `tests/scripts/check-migrations-sync-log-gate.test.mjs` | lê o log real e confirma que versão E48 tem recibo |
| `tests/unit/date-utils.test.ts` | formatDateTime BRT, formatTime ISO, formatTime zero-pad (3 testes) |
| `src/hooks/stock/__tests__/useRuptureAlerts.test.tsx` | dedupe por variant_id mantendo menor cobertura |

Causas prováveis: timezone BRT no container CI, migration E48 não aplicada no ambiente de teste, lógica de dedupe divergindo de snapshot. **Nenhuma dessas falhas foi introduzida pelas PRs analisadas.**

## Nota

O baseline aqui é para medir regressão introduzida por PRs — a comparação é sempre **diferença vs esta linha de base**, não "CI verde absoluto".

Contexto do RELATORIO_CI.md (disponível nas branches): CI passou em 6 SHAs consecutivos nos gates principais (Gate Final verde). Falhas pré-existentes documentadas em PENDENCIAS.md: P1 (4 secrets E2E ausentes), P7 (db-schema-drift-check), P8 (edge-functions-drift-check), P12 (Kit Coverage GRANT ausente).
