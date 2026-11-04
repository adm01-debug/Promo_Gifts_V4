CREATE OR REPLACE FUNCTION public.fn_xbz_enrich_stock(p_supplier_id uuid, p_reference text, p_qty numeric DEFAULT NULL::numeric, p_multiplos numeric DEFAULT NULL::numeric, p_disponivel boolean DEFAULT NULL::boolean, p_venda_minima numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int;
BEGIN
  UPDATE supplier_products_raw
  SET
    raw_data = raw_data || jsonb_strip_nulls(jsonb_build_object(
      'QuantidadeDisponivel', p_qty::text,
      'Multiplos',            p_multiplos::text,
      'Disponivel',           p_disponivel::text,
      'VendaMinima',          p_venda_minima::text,
      '_ruiz_sync_at',        to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )),
    updated_at = now()
  WHERE supplier_id       = p_supplier_id
    AND supplier_reference = p_reference
    AND raw_data IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'reference', p_reference,
    'ts', now()
  );
END;
$function$
