CREATE OR REPLACE FUNCTION public.fn_pbd_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version=pbd_v1_3_20260627 | ANTI-REGRESSAO: manter SET search_path
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    -- Simetria com UPDATE: usuario autenticado nao-dev nao pode CRIAR badge de sistema.
    -- Preserva seed/migracao (auth.uid() IS NULL) e dev.
    IF NEW.is_system = true AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'dev'::app_role) THEN
      NEW.is_system := false;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.badge_key IS DISTINCT FROM OLD.badge_key THEN
      RAISE EXCEPTION 'badge_key e imutavel (% -> %)', OLD.badge_key, NEW.badge_key USING ERRCODE = '23514';
    END IF;
    IF NEW.is_system IS DISTINCT FROM OLD.is_system AND NOT public.has_role(auth.uid(), 'dev'::app_role) THEN
      NEW.is_system := OLD.is_system;
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), OLD.updated_by);
  END IF;
  RETURN NEW;
END;$function$
