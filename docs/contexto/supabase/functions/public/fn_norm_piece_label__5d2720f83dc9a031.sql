CREATE OR REPLACE FUNCTION public.fn_norm_piece_label(p text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT btrim(regexp_replace(
           lower(extensions.unaccent(coalesce(regexp_replace(p, '\(.*?\)', '', 'g'), ''))),
           '\s+', ' ', 'g'))
$function$
