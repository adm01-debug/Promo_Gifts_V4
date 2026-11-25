-- Migration: 20261125074200_revoke_anon_apply_classification_suggestions.sql
-- Rollback: supabase/rollbacks/20261125074200_rollback.sql
--
-- Fecha escrita de catalogo por qualquer portador da chave anon.
--
-- `classification_audit.apply_high_confidence_suggestions(p_dry_run boolean, p_min_matches integer)`
-- e SECURITY DEFINER, `SET search_path TO 'public', 'classification_audit'`, e NAO possui nenhuma
-- checagem de identidade: `pg_get_functiondef` nao referencia `auth.uid()`, `has_role()`,
-- `is_admin*` ou `is_supervisor*` em nenhum ponto do corpo.
--
-- Com `p_dry_run = false` o corpo executa:
--   INSERT INTO product_category_assignments (product_id, category_id, is_primary)
--   SELECT ... FROM classification_audit.category_suggestions ... WHERE s.matches >= p_min_matches;
--
-- O ACL medido em producao (projeto doufsxqlfjyuvxuezpln, 2026-11-25T10:37Z) era `=X/postgres`,
-- ou seja o grant default de PUBLIC — `has_function_privilege('anon', ...)` = true e
-- `has_function_privilege('authenticated', ...)` = true. A chave anon vai no bundle do front,
-- entao qualquer visitante podia chamar a RPC com `p_min_matches = 0` e reescrever a
-- classificacao do catalogo inteiro (filtros, facetas do super-filtro e URLs indexadas passam a
-- depender de dado adulterado).
--
-- Nenhum consumidor depende do grant: `apply_high_confidence_suggestions` nao aparece em `src/`
-- (grep 2026-11-25: 0 ocorrencias fora de dumps `SCHEMA_LIVE.sql`, `ALL_IN_ONE.sql`,
-- `baseline/20261015140000_baseline_schema.sql`, `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` e do
-- bootstrap `20260512000000_bootstrap_missing_application_schemas.sql`). E ferramenta de DBA/auditoria,
-- executada por automacao com `service_role`.
--
-- O que esta migration faz:
--   * REVOKE EXECUTE de PUBLIC (cobre anon e authenticated pelo grant default);
--   * GRANT EXECUTE explicito para service_role, preservando a automacao de auditoria;
--   * post-check que aborta a transacao se anon ou authenticated ainda puderem executar, ou se o
--     service_role perder o privilegio.
--
-- O que NAO faz, de proposito:
--   * nao toca `classification_audit.has_material_conflict`, `has_type_conflict`,
--     `matches_category_prefix` e `validate_match_phrase` — sao predicados puros, sem efeito
--     colateral, e permanecem executaveis por PUBLIC (contrato atual de leitura);
--   * nao mexe em `check_login_rate_limit`, `request_password_reset`, `submit_quote_response` nem
--     nos `fn_super_filtro*` — expositores intencionais do fluxo anonimo;
--   * nao altera o corpo da funcao (nenhuma mudanca de comportamento para service_role).
--
-- Seguranca da operacao: REVOKE/GRANT sao idempotentes e reversiveis pelo rollback.

REVOKE EXECUTE ON FUNCTION classification_audit.apply_high_confidence_suggestions(boolean, integer) FROM PUBLIC

GRANT EXECUTE ON FUNCTION classification_audit.apply_high_confidence_suggestions(boolean, integer) TO service_role

DO $$
BEGIN
  IF has_function_privilege('anon', 'classification_audit.apply_high_confidence_suggestions(boolean,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'pos-check falhou: anon ainda executa apply_high_confidence_suggestions';
  END IF;
  IF has_function_privilege('authenticated', 'classification_audit.apply_high_confidence_suggestions(boolean,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'pos-check falhou: authenticated ainda executa apply_high_confidence_suggestions';
  END IF;
  IF NOT has_function_privilege('service_role', 'classification_audit.apply_high_confidence_suggestions(boolean,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'pos-check falhou: service_role perdeu o privilegio';
  END IF;
END $$
