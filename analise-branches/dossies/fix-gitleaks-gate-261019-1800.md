# Dossiê — `claude/fix-gitleaks-gate-261019-1800`

**Veredito:** FECHAR (superseded; mergear = regressão)
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** PRs #2418 e #2306 fechadas sem merge.

## Evidências
- deploy-gates.yml: main já instala o binário gitleaks (L799-805, Gate E23).
- .gitleaks.toml: main já tem paths docs/, audit/, tests/, dist/ e regexes específicos; só 2/34 linhas da branch coincidem.
- Branch adiciona regexes genéricos no allowlist (`SERVICE_ROLE_KEY`, `YOUR_JWT_TOKEN`, `\.placeholder`, `abc123def456`): qualquer linha contendo esses textos fica isenta do scan — afrouxa o gate sem prova de falso positivo.
- Branch troca `grep "...: '\*'"` por `grep "...: '*'"` em deploy-gates.yml (muda o padrão do check CORS).

**Conclusão:** REGRESSÃO de segurança se mergeada.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
