# Dossiê — `claude/fix-sync-log-ci-261019-1730`

**Veredito:** FECHAR (superseded; mergear = regressão)
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** PRs #2419 (fechada), #2311 e #2305 (mergeadas em 19/10 — o conteúdo útil já entrou por elas).

## Evidências
- scripts/check-security-definer-acl.mjs: main já tem MAX_RETRIES=3 (L108) e trata 500/503/504 (L128) com saída INCONCLUSIVE — superset do 504-only da branch.
- .as-assertions-baseline.json: main productionAsCount=2146 (gerado 2026-10-30); branch voltaria para 2164 (afrouxa baseline).
- .as-unknown-baseline.json: idem (branch 250, gerado 19/10).
- ProductFormFullscreen cast e contrato magazine-reader: já em main.

**Conclusão:** Mergear reverteria o script de retry mais completo e subiria baselines de TS: REGRESSÃO.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
