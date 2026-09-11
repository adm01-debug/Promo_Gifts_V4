-- UNIFICAÇÃO MEDALLION — Fase 3/4: neutraliza atalhos Bronze→Gold.

CREATE OR REPLACE FUNCTION public.fn_process_raw_v2(
    p_supplier_id uuid, p_batch_size integer DEFAULT 100, p_bulk_mode boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_std jsonb; v_prom jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;
  v_std  := public.fn_standardize_supplier(p_supplier_id, p_batch_size);
  v_prom := public.fn_promote_supplier(p_supplier_id, NULL);
  RETURN jsonb_build_object(
    'success', true, 'redirected', true,
    'pipeline', 'fn_standardize_supplier + fn_promote_supplier',
    'supplier_id', p_supplier_id,
    'parents_processed',  COALESCE((v_prom->>'pais_promovidos')::int, 0),
    'variants_processed', COALESCE((v_prom->>'variantes_promovidas')::int, 0),
    'standardize', v_std, 'promote', v_prom);
END;
$function$;

COMMENT ON FUNCTION public.fn_process_raw_v2(uuid, integer, boolean) IS
  'DEPRECATED/REDIRECIONADA 2026-06-05: delega ao pipeline Medallion de 3 fases (fn_standardize_supplier + fn_promote_supplier). Nao grava mais Bronze->Gold direto.';

CREATE OR REPLACE FUNCTION public.process_supplier_product(
    p_supplier_id uuid, p_raw_data jsonb, p_supplier_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'success', false, 'deprecated', true,
    'error', 'process_supplier_product descontinuada: use o pipeline Medallion (supplier_products_raw -> fn_standardize_supplier -> fn_promote_supplier)',
    'supplier_id', p_supplier_id, 'supplier_reference', p_supplier_reference);
END;
$function$;

COMMENT ON FUNCTION public.process_supplier_product(uuid, jsonb, text) IS
  'DEPRECATED 2026-06-05: writer Bronze->Gold direto neutralizado. Candidata a DROP em follow-up.';

CREATE OR REPLACE FUNCTION public.process_supplier_products_batch(
    p_supplier_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE(staging_id uuid, supplier_reference text, success boolean,
              product_id uuid, variants_created integer, error_message text,
              processed_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
$function$;

COMMENT ON FUNCTION public.process_supplier_products_batch(uuid, integer) IS
  'DEPRECATED/REDIRECIONADA 2026-06-05: delega ao pipeline Medallion 3 fases. Candidata a DROP em follow-up.';;
