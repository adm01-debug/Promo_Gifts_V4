CREATE OR REPLACE FUNCTION public.fn_extract_packaging_info(p_description text, p_packing text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_refs   text[]; v_refs2 text[]; v_all text[];
  v_included text;
  v_extract JSONB;
BEGIN
  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
    RETURN jsonb_build_object('optional_refs','[]'::jsonb,'included_mention',NULL,
                              'has_optional_mention',false,'packing_raw',p_packing);
  END IF;

  -- Extrair referências opcionais (padrões existentes mantidos)
  SELECT array_agg(DISTINCT m[1]) INTO v_refs
  FROM regexp_matches(p_description,'(\d{5})\s+vendid[ao]s?\s+opcionalmente','gi') m;

  SELECT array_agg(DISTINCT m[1]) INTO v_refs2
  FROM regexp_matches(p_description,'vendid[ao]s?\s+opcionalmente\s*[:.]?\s*(\d{5})','gi') m;

  v_all := ARRAY(SELECT DISTINCT unnest(COALESCE(v_refs,'{}') || COALESCE(v_refs2,'{}')) ORDER BY 1);
  IF array_length(v_all,1) IS NULL THEN v_all := NULL; END IF;

  -- Usar fn_extract_packaging_from_description (abrangente) para included_mention
  v_extract := fn_extract_packaging_from_description(p_description);
  IF (v_extract->>'found')::boolean = true THEN
    v_included := v_extract->>'packaging_text';
  ELSE
    v_included := NULL;
  END IF;

  RETURN jsonb_build_object(
    'optional_refs', COALESCE(to_jsonb(v_all), '[]'::jsonb),
    'included_mention', v_included,
    'has_optional_mention', (p_description ~* 'vendid[ao]s?\s+opcionalmente'),
    'packing_raw', p_packing
  );
END;
$function$
