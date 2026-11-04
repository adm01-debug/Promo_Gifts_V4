CREATE OR REPLACE FUNCTION public.fn_pbd_block_system_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version=pbd_v1_20260627
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Badge de sistema "%" nao pode ser excluida (apenas desabilitada via is_enabled).', OLD.badge_key USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;$function$
