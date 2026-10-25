-- Rollback de 20261022195616_fix_update_company_fields_security_definer_search_path.sql
-- NÃO REVERSÍVEL por arquivo: a definição de public.update_company_fields anterior à E99
-- (sem SECURITY DEFINER) não está versionada no repo. Reverter para uma definição inventada
-- reabriria o risco de search_path injection (E30). Falha de propósito para não parecer sucesso.
DO $rollback$
BEGIN
  RAISE EXCEPTION 'rollback manual: 20261022195616 não tem definição anterior versionada; recuperar de backup do banco';
END
$rollback$;
