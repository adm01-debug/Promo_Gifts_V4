CREATE OR REPLACE FUNCTION public.fn_xbz_enrich_stock_batch(p_supplier_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int := 0;
BEGIN
  UPDATE supplier_products_raw spr
  SET
    raw_data   = spr.raw_data || patch.p,
    stock_data = COALESCE(spr.stock_data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'QuantidadeDisponivel',                 item->'QuantidadeDisponivel',
      'QuantidadeDisponivelEstoquePrincipal', item->'QuantidadeDisponivelEstoquePrincipal',
      'ReposicaoDataPrevista',                item->'ReposicaoDataPrevista',
      'Disponivel',                           item->'Disponivel'
    ))
  FROM jsonb_array_elements(p_items) AS item
  CROSS JOIN LATERAL (
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'QuantidadeDisponivel',                 item->'QuantidadeDisponivel',
      'QuantidadeDisponivelEstoquePrincipal', item->'QuantidadeDisponivelEstoquePrincipal',
      'ReposicaoDataPrevista',                item->'ReposicaoDataPrevista',
      'Multiplos',                            item->'Multiplos',
      'VendaMinima',                          item->'VendaMinima',
      'Disponivel',                           item->'Disponivel',
      'IpiTaxa',                              item->'IpiTaxa',
      'PrecoVenda',                           item->'PrecoVenda',
      'IdProduto',                            item->'IdProduto',
      'CodigoXbz',                            item->'CodigoXbz',
      'StatusConfiabilidade',                 item->'StatusConfiabilidade'
    )) AS p
  ) patch
  WHERE spr.supplier_id = p_supplier_id
    AND spr.supplier_sku = item->>'CodigoComposto'
    AND spr.raw_data IS NOT NULL
    AND NOT (spr.raw_data @> patch.p);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated',      v_updated,
    'total_input',  jsonb_array_length(p_items),
    'skipped_noop', jsonb_array_length(p_items) - v_updated,
    'campos',       'guard simetrico raw_data @> patch; sem carimbo de stock_synced_at; tipos JSON preservados',
    'ts',           now()
  );
END;
$function$
