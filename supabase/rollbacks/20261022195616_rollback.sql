-- Rollback de 20261022195616_fix_update_company_fields_security_definer_search_path.sql
-- NÃO REVERSÍVEL por arquivo: a definição de public.update_company_fields anterior à E99
-- (sem SECURITY DEFINER) não está versionada no repo. Reverter exige copiá-la de um backup
-- ou do histórico do banco; reverter para uma definição inventada reabriria o risco de
-- search_path injection (E30). Este arquivo não executa DDL.
SELECT 1;
