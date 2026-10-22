-- P03 — ANALYZE em tabelas com estatísticas obsoletas
-- Achado: ID-INT-002 (Seção 4) e ID-PERF-001 (Seção 5)
-- Severidade: MÉDIO
-- Status: NÃO APLICADA
--
-- Impacto: Tabelas com n_live_tup=0 nas stats mas com alto volume de seq scans
-- indicam que o planner do PostgreSQL usa informações desatualizadas para
-- escolher planos de execução. ANALYZE é operação de leitura — sem lock de escrita.
--
-- user_organizations tem 8,2M seq scans com 0% idx hit — maior prioridade.
--
-- Caminho de aplicação: pode ser executado diretamente no Dashboard → Query Editor
-- pois é operação de leitura pura (não altera dados, só atualiza estatísticas).

-- Atualizar estatísticas das tabelas identificadas com possível obsolescência
ANALYZE public.user_organizations;
ANALYZE public.system_settings;
ANALYZE public.integration_credentials;
ANALYZE public.user_roles;
ANALYZE public.categories;

-- Após o ANALYZE, verificar se pg_stat_user_tables mostra rows reais:
-- SELECT relname, n_live_tup, n_dead_tup, last_analyze
-- FROM pg_stat_user_tables
-- WHERE relname IN ('user_organizations', 'system_settings', 'integration_credentials', 'user_roles', 'categories')
-- ORDER BY relname;

-- Se user_organizations continuar com 0 rows após ANALYZE, a tabela está de fato vazia.
-- Nesse caso, investigar quais queries ainda acessam a tabela (podem estar causando
-- carga desnecessária) via pg_stat_activity ou extensão pg_stat_statements.

-- === ROLLBACK ===
-- ANALYZE é operação somente de leitura que atualiza pg_statistic (metadados internos).
-- Não há transação a reverter: não altera linhas, não cria objetos, não remove nada.
-- "Rollback" neste contexto = aguardar o próximo autovacuum recalcular as estatísticas
-- naturalmente (ocorre automaticamente em 24-48h com carga de escrita normal).
-- Se o ANALYZE produzir plano de execução pior (raro), executar:
--   VACUUM ANALYZE public.user_organizations; -- força recompilação completa
-- Não há ação de rollback destrutiva necessária ou possível.
