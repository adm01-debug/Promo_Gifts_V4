CREATE OR REPLACE FUNCTION public.admin_execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'dev'::public.app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role dev'
      USING ERRCODE = '42501';
  END IF;

  -- Espelha mfaAal2 da rota: claim aal do JWT já verificado pelo PostgREST.
  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'insufficient_privilege: requer sessão AAL2'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.execute_role_migration_batch(_label, _reason, _items, _dry_run);
END;
$function$
