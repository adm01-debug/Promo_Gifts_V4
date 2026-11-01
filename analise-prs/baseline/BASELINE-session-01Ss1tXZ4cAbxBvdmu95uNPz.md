# Baseline — Sessão 01Ss1tXZ4cAbxBvdmu95uNPz (2026-11-01)

**main SHA fixado:** `a25070630788f77b297431665878319ad74bb587`
**Data:** 2026-11-01
**Modelo:** Claude Sonnet 4.6

## TypeScript
- **Resultado:** SEM ERROS (exit 0)
- **Evidência:** `analise-prs/baseline/typecheck.txt` da sessão anterior (SHA `66d032af...`) confirma exit 0. SHA `a25070630` difere só em `analise-prs/` (docs — não processado pelo TSC).

## Lint (ESLint)
- **Resultado:** OOM (pre-existente — não é nova regressão)
- **Evidência:** `analise-prs/baseline/lint.txt` — process.exitCode 1 por OOM no ESLint fork. Causa: heap insuficiente. Fix aplicado no PR #2991 (`.husky/pre-push` → 4096MB), mas o ESLint direto ainda falha com OOM.
- **Nota:** Gate 1 CI (lint + TSC) usa `continue-on-error` somente para lint local; o TSC passa.

## Vitest (testes unitários)
- **Resultado:** NÃO COLETADO nesta sessão (shell bk9sk5a7q encerrou sem output)
- **CI canônico:** Run #40223579961, SHA `7d3bd4ba`, ✅ 429 testes / 0 falhas (2026-10-25)
- **Referência:** `analise-prs/baseline/unit-tests.txt` e `vitest-baseline-9a97f9a2.md` das sessões anteriores

## CI (Gate Final - Deploy Ready)
- **Run canônico:** #40223579961 — SHA `7d3bd4ba` — ✅ SUCCESS
- **Última execução conhecida:** 2026-10-25
- **Referência:** `analise-prs/baseline/checks-main-*.json`

## PRs analisadas nesta sessão
- Total abertos no início: 27
- Analisados: 27 (100%)
- JA_EM_MAIN: 8
- DECISAO_HUMANA: 19
- MERGEAR pelo agente: 0
