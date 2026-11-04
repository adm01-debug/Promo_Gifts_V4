CREATE OR REPLACE FUNCTION public.invalidate_used_approval_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded';
    NEW.expires_at := now();
  END IF;
  RETURN NEW;
END;
$function$
