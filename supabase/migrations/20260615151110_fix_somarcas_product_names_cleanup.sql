
DO $$
DECLARE
  v_rows integer;
  v_t0   timestamptz := clock_timestamp();
BEGIN
  PERFORM set_config('app.write_source',     'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true',     true);

  UPDATE public.products p
  SET
    name          = public.fn_display_product_name(pp.name),
    locked_fields = array_remove(p.locked_fields, 'name'),
    updated_at    = now()
  FROM public.produtos_padronizacao pp
  WHERE pp.supplier_id        = p.supplier_id
    AND pp.supplier_reference = p.supplier_reference
    AND p.supplier_id         = '841cd690-210a-422a-908c-7676828db272'
    AND p.is_active            = true
    AND p.name LIKE '% – %'
    AND p.name ~ '\d+[,.]?\d*\s*[xXøØ]'
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RAISE NOTICE '[fix_somarcas_product_names_cleanup] % produtos corrigidos em % ms',
    v_rows, ROUND(EXTRACT(EPOCH FROM clock_timestamp()-v_t0)*1000)::int;

  IF v_rows < 300 OR v_rows > 340 THEN
    RAISE EXCEPTION 'Contagem fora do esperado (300-340): % linhas. Abortando.', v_rows;
  END IF;
END;
$$;
;
