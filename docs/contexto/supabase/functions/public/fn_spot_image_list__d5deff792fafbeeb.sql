CREATE OR REPLACE FUNCTION public.fn_spot_image_list(p_csv text, p_base text DEFAULT 'https://www.spotgifts.com.br/fotos/produtos/'::text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    to_jsonb(
      ARRAY(
        SELECT p_base || btrim(e)
        FROM unnest(string_to_array(p_csv, ',')) AS e
        WHERE btrim(e) <> ''
      )
    ),
    '[]'::jsonb
  );
$function$
