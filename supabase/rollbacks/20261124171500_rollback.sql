-- Rollback de 20261124171500_internal_managed_schema_dictionary.sql
--
-- CUIDADO: em producao (`doufsxqlfjyuvxuezpln`) a tabela e ANTERIOR a esta
-- migration — ela foi criada direto no banco em 2026-11-24 e o repo apenas passou a
-- descreve-la. Este rollback so deve rodar se a decisao for remover o objeto de vez
-- (nenhum consumidor conhecido em `src/`, `supabase/functions/` ou cron no repo).
--
-- Executar apenas via `db-apply-migration.yml` / `psql` transacional, com aprovacao
-- humana (Regra 8).

-- Rollback:
DROP TABLE IF EXISTS internal.managed_schema_dictionary;
