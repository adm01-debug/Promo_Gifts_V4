CREATE OR REPLACE FUNCTION public.fn_sm_variant_coherence_guard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fixed int := 0;
BEGIN
  -- Advisory lock: evita execução concorrente (padrão do projeto)
  IF NOT pg_try_advisory_lock(74108912) THEN
    RETURN jsonb_build_object('status','locked','at',now());
  END IF;

  -- Reativa variantes de produtos SM ativos (coerência 1:1)
  UPDATE product_variants pv
  SET is_active = true, updated_at = now()
  FROM produtos_padronizacao_variantes ppv
  JOIN produtos_padronizacao pp ON pp.id = ppv.pad_id
  JOIN products p ON p.id = pp.product_id
  WHERE pv.id = ppv.variant_id
    AND pp.supplier_id = '841cd690-210a-422a-908c-7676828db272'
    AND p.is_active = true
    AND pv.is_active = false;
  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  PERFORM pg_advisory_unlock(74108912);
  RETURN jsonb_build_object('status','ok','variants_reactivated',v_fixed,'at',now());
END;
$function$
