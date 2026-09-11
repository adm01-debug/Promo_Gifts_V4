CREATE OR REPLACE FUNCTION public.fn_spot_batch_to_silver(p_batch_size integer DEFAULT 500)
RETURNS TABLE(processed integer, errors integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_bronze_id UUID; v_processed INT := 0; v_errors INT := 0;
  v_supplier_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';  -- SPOT/Stricker (fixo, robusto)
BEGIN
  FOR v_bronze_id IN (
    SELECT spr.id
    FROM public.supplier_products_raw spr
    WHERE spr.supplier_id = v_supplier_id
      AND spr.attempts < 5
      -- DEDUP CANÔNICO (BUG-2 fix): antes checava silver_variants (tabela legada/morta),
      -- o que reprocessava todo o catálogo. Agora checa a intermediária real.
      AND NOT EXISTS (
        SELECT 1 FROM public.produtos_padronizacao_variantes ppv
        WHERE ppv.supplier_id = v_supplier_id
          AND ppv.variant_reference = spr.supplier_reference
      )
    ORDER BY spr.imported_at
    LIMIT p_batch_size
  ) LOOP
    BEGIN
      PERFORM public.fn_spot_to_silver(v_bronze_id);  -- delega p/ standardize_raw + standardize_variant
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Erro bronze_id %: %', v_bronze_id, SQLERRM;
    END;
  END LOOP;
  RETURN QUERY SELECT v_processed, v_errors;
END;
$function$;;
