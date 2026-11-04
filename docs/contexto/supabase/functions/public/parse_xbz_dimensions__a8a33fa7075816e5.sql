CREATE OR REPLACE FUNCTION public.parse_xbz_dimensions(p_raw_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN jsonb_build_object(
        'peso_kg', COALESCE((p_raw_data->>'peso')::NUMERIC, 0),
        'altura_cm', COALESCE((p_raw_data->>'altura')::NUMERIC, 0),
        'largura_cm', COALESCE((p_raw_data->>'largura')::NUMERIC, 0),
        'profundidade_cm', COALESCE((p_raw_data->>'profundidade')::NUMERIC, 0)
    );
END;
$function$
