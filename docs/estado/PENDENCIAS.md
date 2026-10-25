# Pendências da meta Produção (docs/estado)

Dono: frente 5 (consolidação). Pendências de CI anteriores continuam em `/PENDENCIAS.md` (raiz, P1..P68) e `/RELATORIO_CI.md`; serão incorporadas aqui na consolidação final.

Atualizado: 2026-10-25 · main `0773535`

## PEND-E01 — deploy-edge-functions.yml não inicia jobs

- **Evidência (list_runs_for_workflow, 2026-10-25):** runs #326..#330 `completed/cancelled`; run #331 ([40230472012](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40230472012), criado 20:22Z, sha `0773535`) `pending` sem job. Todos `workflow_dispatch`.
- **Efeito em produção:** o fix da #2552 (`materials-api`) está mergeado no main, mas NÃO está publicado. Único caminho autorizado de deploy de edge é este workflow (CLAUDE.md, REGRA #8).
- **Causa:** NÃO VERIFICADA — diagnóstico com a frente de CI (runner/environment/aprovação pendente são as hipóteses a checar).
- **Depende de:** frente de CI; possível ação humana (aprovação de environment ou runner).

## PEND-B01 — baseline local do main não medida (npm ci E403)

- **Erro exato:** `npm ci` → `E403 403 Forbidden - GET https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/pngjs/-/pngjs-7.0.0.tgz` (`package-lock.json:13781`, única entrada fora de registry.npmjs.org).
- **Efeito:** typecheck/lint/testes/build não medidos no container da sessão (sem node_modules, `tsc` dá ~49.800 erros de módulo ausente — não é baseline).
- **Depende de:** decisão do PO — liberar reescrita local da URL (sem commit) ou medir pelo CI.
