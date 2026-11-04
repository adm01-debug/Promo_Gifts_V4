CREATE OR REPLACE FUNCTION public.fn_sanitize_text(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT NULLIF(btrim(regexp_replace(
           translate(p, chr(160)||chr(8203)||chr(8204)||chr(8205)||chr(65279), ' '),
           '\s+',' ','g')), '');
$function$
