CREATE OR REPLACE FUNCTION public.fn_spot_to_silver(p_bronze_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r public.supplier_products_raw%ROWTYPE;
  v_parent text; v_p jsonb; v_v jsonb;
BEGIN
  SELECT * INTO r FROM public.supplier_products_raw WHERE id=p_bronze_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','raw_nao_encontrado'); END IF;

  -- DEPRECATED 2026-06: antes gravava nas tabelas silver_* (legadas/abandonadas).
  -- Agora DELEGA para o pipeline canonico dirigido pelo de-para (supplier_field_mappings):
  --   fn_standardize_raw (parent) + fn_standardize_variant (variante) -> produtos_padronizacao(_variantes).
  v_parent := public.fn_derive_parent_ref(r.supplier_id, r.supplier_reference, r.raw_data);
  v_p := public.fn_standardize_raw(p_bronze_id, v_parent);
  v_v := public.fn_standardize_variant(p_bronze_id);

  RETURN jsonb_build_object(
    'success',    true,
    'deprecated', true,
    'note', 'fn_spot_to_silver redirecionada para fn_standardize_raw + fn_standardize_variant (Silver canonico produtos_padronizacao).',
    'parent',  v_p,
    'variant', v_v
  );
END;
$function$;;
