-- E99: Mirror repair-only — DDL aplicada via MCP em 2026-10-22T19:56:16 UTC
-- Objetivo: adicionar SECURITY DEFINER + SET search_path à função update_company_fields
-- Proteção: impede search_path injection (E30/auditoria-acl-2026-10-22)
-- Este arquivo existe somente como documentação (ledger já atualizado antes do commit)
-- Rollback: ver supabase/rollbacks/20261022195616_rollback.sql (irreversível sem a definição pré-E99, não versionada no repo)
-- Aplicar via db-apply-migration.yml com mode=repair-only

-- Primeira iteração da correção de segurança:
-- adiciona SECURITY DEFINER e fixa search_path na função update_company_fields
-- (sem guard auth.uid() — adicionado na migration 20261022203935)
CREATE OR REPLACE FUNCTION public.update_company_fields(p_company_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_key   text;
  v_value text;
  v_sets  text[] := ARRAY[]::text[];
  v_sql   text;
  v_row   record;
BEGIN
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_data) LOOP
    IF v_key NOT IN ('id', 'created_at', 'user_id', 'updated_at') THEN
      v_sets := array_append(v_sets, format('%I = %L', v_key, v_value));
    END IF;
  END LOOP;

  IF cardinality(v_sets) = 0 THEN
    RETURN jsonb_build_object('error', 'no valid fields');
  END IF;

  v_sql := 'UPDATE public.companies SET ' || array_to_string(v_sets, ', ')
        || ', updated_at = now() WHERE id = ' || quote_literal(p_company_id)
        || ' RETURNING id, nome_fantasia';

  EXECUTE v_sql INTO v_row;
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('error', 'not found');
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'nome', v_row.nome_fantasia);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_company_fields(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_company_fields(uuid, jsonb) TO authenticated;
