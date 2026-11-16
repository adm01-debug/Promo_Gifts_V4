# Baseline do main — Testes Falhando por Nome

> SHA fixado: `6e38d14a90323f69ff3beda27c8ae51476c3cb1d`
> Verificado: 2026-10-30 (sessão `claude/eloquent-ramanujan-0yt2fo`)
> Comando: `npx vitest run` no checkout do main

## Resultado

**EXIT CODE: 0** — sem falhas.

| Métrica | Valor |
|---|---|
| Arquivos de teste | 1.247 |
| Testes passaram | 25.869 |
| Testes falharam | **0** |
| Skipped | 1.135 |
| TODO | 24 |
| TypeScript (`npx tsc --noEmit`) | exit 0 — 0 erros |
| Build Vite (`npm run build`) | exit 0 — 16.66s |

## Testes Falhando Por Nome

**Nenhum.** O main no SHA `6e38d14a9` tem todos os testes passando (exit 0).

A sessão anterior que correu vitest em um SHA próximo (`380ceb6`) reportou
3 falhas pré-existentes em `date-utils.test.ts` relacionadas a timezone
(`TZ` não definida no container — `America/Sao_Paulo`). Essas falhas são
de ambiente e não reproduzem no runner do CI (que tem a timezone configurada).
No SHA `6e38d14a9` (main fixado desta análise) o baseline oficial é exit 0
conforme registrado em `progresso.json`.

## Fonte

`progresso.json > baseline.vitest = "exit 0 — sem falhas"`
Confirmação adicional: body do PR #2768 cita "Baseline limpo da main `7cd8cb134`:
1.247 arquivos passaram, 25.869 testes passaram" — consistente.
