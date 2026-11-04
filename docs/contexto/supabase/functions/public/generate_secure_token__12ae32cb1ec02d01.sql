CREATE OR REPLACE FUNCTION public.generate_secure_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$function$
