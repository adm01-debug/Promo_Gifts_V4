# Relatório de Branches — revalidado em 2026-11-01

Base: main `5ae127eade34db1662a92103db9e6bb3c345df03` · produção doufsxqlfjyuvxuezpln (somente leitura). **Substitui o relatório de 2026-10-24**, cujas conclusões ("3 migrations pendentes", "brechas ativas") estão desatualizadas.

## 1. Decisões humanas (topo)
1. **Recibos E15 no SYNC_LOG**: 10 migrations estão no ledger de produção mas `supabase/MIGRATIONS_SYNC_LOG.md` do main ainda diz "pendente — não aplicada". Correção docs-only pronta em `/mnt/project-files/estado/sync_log_recibos_e15.patch` (10 linhas). Não vira PR por esta sessão porque a escrita só pode ir pelo MCP FOREVER, que exige o arquivo inteiro (267 KB). Autorize o push por git (ou outra rota) e eu abro a PR.
2. Ressalvas opcionais: 2 correções shellcheck (db-apply-migration.yml L190 e update-snapshots.yml L110) — workflows, proibido para esta sessão. **E33 já aplicado em main** (grep E2E_USER nos 8 arquivos e2e-update-*-snapshots.yml = 0 linhas); sem PR necessário.

## 2. Mergeadas nesta sessão
Nenhuma (nenhum candidato válido).

## 3. PRs prontas aguardando aprovação
Nenhuma. A lista AGUARDANDO APROVAÇÃO de 24/10 (3 PRs) está vazia: tudo já foi mergeado/aplicado.

## 4. Vereditos das 9 branches TOP
| Branch | Veredito | Prova principal |
|---|---|---|
| claude/fix-contract-mag-reader-261019-2110 | FECHAR (superseded) | cors.ts:20 e contrato já em main |
| claude/fix-sync-log-ci-261019-1730 | FECHAR (mergear = regressão) | main tem retry 500/503/504 e baselines mais novos |
| claude/fix-rollback-261019-1637 | FECHAR | main tem rollback que restaura a constraint; o da branch só dropa |
| claude/fix-gitleaks-gate-261019-1800 | FECHAR (mergear = regressão) | allowlist com regex genérico afrouxa o scan |
| claude/chore-migrations-sync-log-261019-1600 | FECHAR | PGPORT, EXAMPLE_API_KEY e recibo já em main |
| claude/fix-audit-acl-regrole-261024-1635 | FECHAR / DRIFT resolvido | 20261024163500 no ledger; prosrc sem regrole |
| claude/security-brechas-e30-e40-e18-2026-10-22 | JÁ MERGEADA (PR #2416, 24/10 20:16Z) | 3 versões no ledger; privilégios provados no catálogo |
| claude/gifted-dijkstra-uojt52 | FECHAR | 2 arquivos, ambos já em main |
| devin/probe-e184-legacy-refs | FECHAR | 0 refs `pqpdolkae` em cron/funções de produção |
Detalhes e linhas de prova: `dossies/*.md`. Cruzamento com banco: `cruzamento-supabase.md`.

## 5. DRIFT
Nenhum migration das branches fora de produção. Único drift: documental (item 1 do topo).

## 6. F/A/B (44)
`confirmacao_ABF.md`. 30 descartáveis sem ressalva, 10 recibos E15 (achado) e 3 ressalvas (shellcheck, happy-faraday, gh-pages). E33 já aplicado em main.

## 7. NÃO VERIFICADO
- Merge de teste em worktree, typecheck/lint/testes e Postgres temporário: não executados — não há candidato a merge; registrado em baseline/README_2026-11-01.md.
- Comparação por presença de linhas é heurística; para cada FECHAR foram lidos os trechos citados nos dossiês.
- Contagem de edge functions: 110 hoje vs 151 no relatório de 24/10 (outra fonte de contagem; não investigado).

## 8. Produção não mudou
list_migrations antes/depois: 2552 / hash f7e12e7e259a39a6 em ambos. list_edge_functions: 110 / hash 5266aafeed41b327 em ambos. Nenhuma DDL, deploy ou apply.
