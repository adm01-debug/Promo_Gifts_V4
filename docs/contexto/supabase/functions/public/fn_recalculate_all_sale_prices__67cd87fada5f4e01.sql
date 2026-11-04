CREATE OR REPLACE FUNCTION public.fn_recalculate_all_sale_prices(p_batch_size integer DEFAULT 500)
 RETURNS TABLE(processed integer, updated integer, errors integer, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_processed INTEGER := 0;
  v_updated INTEGER := 0;
  v_errors INTEGER := 0;
  v_record RECORD;
  v_new_price NUMERIC;
BEGIN
  FOR v_record IN 
    SELECT id, name, cost_price, sale_price  -- CORRIGIDO: base_price → cost_price
    FROM products
    WHERE cost_price IS NOT NULL AND cost_price > 0  -- CORRIGIDO: base_price → cost_price
    LIMIT p_batch_size
  LOOP
    BEGIN
      v_processed := v_processed + 1;
      v_new_price := fn_calculate_sale_price(v_record.id, 1, NULL);
      IF v_new_price IS NOT NULL AND v_new_price != COALESCE(v_record.sale_price, 0) THEN
        UPDATE products
        SET sale_price = v_new_price, updated_at = NOW()
        WHERE id = v_record.id;
        v_updated := v_updated + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;
  RETURN QUERY SELECT v_processed, v_updated, v_errors,
    format('Processados: %s, Atualizados: %s, Erros: %s', v_processed, v_updated, v_errors);
END;
$function$
