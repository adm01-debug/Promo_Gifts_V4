-- PROPOSTA NÃO APLICADA. Dependência da atualização transacional de itens.
-- Preserva o comportamento atual e permite que uma RPC, já sob FOR UPDATE,
-- solicite exatamente um incremento explícito de versão para mutações só de filhos.

DO $precondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.increment_quote_version()'::regprocedure
      AND md5(p.prosrc)='8dc69376bb204fa774c7b193a7bbce4f'
      AND NOT p.prosecdef
      AND pg_get_userbyid(p.proowner)='postgres'
      AND p.proconfig=ARRAY['search_path=pg_catalog, public']::text[]
  ) THEN
    RAISE EXCEPTION 'increment_quote_version: definition or metadata drift; recollect before applying';
  END IF;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.increment_quote_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  -- explicit_client_version_bump_v1
  _old jsonb := to_jsonb(OLD)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
  _new jsonb := to_jsonb(NEW)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
BEGIN
  IF _old IS DISTINCT FROM _new
     OR NEW.version = COALESCE(OLD.version, 0) + 1 THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$function$;

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.increment_quote_version()'::regprocedure
      AND NOT p.prosecdef
      AND pg_get_userbyid(p.proowner)='postgres'
      AND p.proconfig=ARRAY['search_path=pg_catalog, public']::text[]
      AND position('explicit_client_version_bump_v1' IN p.prosrc)>0
  ) THEN
    RAISE EXCEPTION 'increment_quote_version: postcondition failed';
  END IF;
END;
$postcondition$;
