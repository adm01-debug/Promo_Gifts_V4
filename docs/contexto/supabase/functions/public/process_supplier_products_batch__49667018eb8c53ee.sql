CREATE OR REPLACE FUNCTION public.process_supplier_products_batch(p_supplier_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(staging_id uuid, supplier_reference text, success boolean, product_id uuid, variants_created integer, error_message text, processed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_std jsonb; v_prom jsonb;
BEGIN
  v_std  := public.fn_standardize_supplier(p_supplier_id, p_limit);
  v_prom := public.fn_promote_supplier(p_supplier_id, NULL);
  staging_id         := NULL::uuid;
  supplier_reference := NULL::text;
  success            := COALESCE((v_prom->>'success')::boolean, false)
                        AND COALESCE((v_std->>'erros')::int, 0) = 0;
  product_id         := NULL::uuid;
  variants_created   := COALESCE((v_prom->>'variantes_promovidas')::integer, 0);
  error_message      := CASE WHEN success THEN NULL
                             ELSE 'erros no pipeline; ver fn_standardize_supplier/fn_promote_supplier' END;
  processed_at       := now();
  RETURN NEXT;
END;
$function$
