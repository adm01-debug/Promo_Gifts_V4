CREATE OR REPLACE FUNCTION public.fn_standardize_parent(p_supplier_id uuid, p_parent_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_rep uuid; v_res jsonb;
BEGIN
  -- representante: a raw com mais conteúdo (maior raw_data) do grupo; empate por menor id
  SELECT pv.raw_id INTO v_rep
  FROM public.produtos_padronizacao_variantes pv
  WHERE pv.supplier_id=p_supplier_id AND pv.parent_reference=p_parent_reference AND pv.raw_id IS NOT NULL
  ORDER BY length((SELECT raw_data::text FROM public.supplier_products_raw WHERE id=pv.raw_id)) DESC NULLS LAST, pv.raw_id
  LIMIT 1;
  IF v_rep IS NULL THEN RETURN jsonb_build_object('success',false,'error','sem_representante','parent',p_parent_reference); END IF;
  v_res := public.fn_standardize_raw(v_rep, p_parent_reference);
  -- Enriquecimento ASIA (dims/peso/caixa-master/galeria) pós-padronização do pai
  IF p_supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid THEN
    PERFORM public.fn_asia_enrich_parent(p_supplier_id, p_parent_reference);
  END IF;
  RETURN v_res;
END;
$function$;;
