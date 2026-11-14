CREATE OR REPLACE FUNCTION public.fn_admin_sync_external_connections()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_dev((SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN public.sync_external_connections_from_credentials(NULL::text, 'manual'::text, (SELECT auth.uid()));
END;
$function$
