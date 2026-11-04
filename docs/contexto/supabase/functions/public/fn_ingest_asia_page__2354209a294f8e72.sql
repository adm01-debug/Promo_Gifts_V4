CREATE OR REPLACE FUNCTION public.fn_ingest_asia_page(p_produtos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_prod jsonb; v_n int := 0; v_vars int := 0; v_r jsonb;
BEGIN
  IF jsonb_typeof(p_produtos) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'esperado_array_de_produtos');
  END IF;
  FOR v_prod IN SELECT * FROM jsonb_array_elements(p_produtos) LOOP
    v_r := public.fn_ingest_asia_product(v_prod);
    IF (v_r->>'success')::bool THEN
      v_n := v_n + 1;
      v_vars := v_vars + COALESCE((v_r->>'variacoes')::int, 0);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'produtos', v_n, 'variacoes', v_vars);
END;
$function$
