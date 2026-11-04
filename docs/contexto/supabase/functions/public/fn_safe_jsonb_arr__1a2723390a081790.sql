CREATE OR REPLACE FUNCTION public.fn_safe_jsonb_arr(p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
DECLARE
  j jsonb;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN RETURN NULL; END IF;
  BEGIN
    j := p_value::jsonb;
    IF jsonb_typeof(j) = 'array' THEN
      RETURN CASE WHEN jsonb_array_length(j) > 0 THEN j ELSE NULL END;
    ELSIF jsonb_typeof(j) = 'object' THEN
      SELECT NULLIF(jsonb_agg(v), '[]'::jsonb) INTO j FROM jsonb_each_text(j) e(k, v) WHERE NULLIF(btrim(v),'') IS NOT NULL;
      RETURN j;
    ELSIF jsonb_typeof(j) = 'string' THEN
      RETURN jsonb_build_array(j #>> '{}');
    END IF;
    RETURN NULL;
  EXCEPTION WHEN OTHERS THEN
    RETURN (
      SELECT NULLIF(COALESCE(jsonb_agg(btrim(e)), '[]'::jsonb), '[]'::jsonb)
      FROM unnest(string_to_array(p_value, CASE WHEN position('|' in p_value) > 0 THEN '|' ELSE ',' END)) e
      WHERE btrim(e) <> ''
    );
  END;
END;
$function$
