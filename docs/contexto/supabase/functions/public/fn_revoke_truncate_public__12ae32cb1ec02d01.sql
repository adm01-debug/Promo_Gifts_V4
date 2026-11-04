CREATE OR REPLACE FUNCTION public.fn_revoke_truncate_public()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/*
  v1_2026-06-13 — Revoga TRUNCATE de anon/authenticated em todas as tabelas públicas.
  Supabase recria permissões via supabase_admin em novas tabelas/views/matviews.
  Este job roda diariamente para manter o inventário limpo.
*/
DECLARE v_antes int; v_depois int;
BEGIN
  SELECT count(*) INTO v_antes FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated') AND privilege_type='TRUNCATE' AND table_schema='public';

  REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
  REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

  SELECT count(*) INTO v_depois FROM information_schema.role_table_grants
  WHERE grantee IN ('anon','authenticated') AND privilege_type='TRUNCATE' AND table_schema='public';

  RAISE NOTICE 'fn_revoke_truncate_public: antes=% depois=% revogados=%', v_antes, v_depois, v_antes-v_depois;
  RETURN v_antes - v_depois;
END $function$
