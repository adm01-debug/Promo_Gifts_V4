CREATE OR REPLACE FUNCTION public.fn_sync_all_is_new()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_set_true INTEGER;
    v_set_false INTEGER;
BEGIN
    -- Produtos com novidade ativa → is_new = TRUE
    UPDATE products p
    SET is_new = TRUE
    FROM product_novelties pn
    WHERE pn.product_id = p.id
      AND pn.is_active = TRUE
      AND p.is_new = FALSE;
    
    GET DIAGNOSTICS v_set_true = ROW_COUNT;
    
    -- Produtos sem novidade ativa → is_new = FALSE
    UPDATE products p
    SET is_new = FALSE
    WHERE p.is_new = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM product_novelties pn 
          WHERE pn.product_id = p.id AND pn.is_active = TRUE
      );
    
    GET DIAGNOSTICS v_set_false = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'set_to_true', v_set_true,
        'set_to_false', v_set_false,
        'total_changed', v_set_true + v_set_false,
        'executed_at', NOW()
    );
END;
$function$
