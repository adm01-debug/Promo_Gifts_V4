
DO $$
DECLARE
  v_rows  integer;
  v_t0    timestamptz := clock_timestamp();
BEGIN
  PERFORM set_config('app.write_source',     'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true',     true);

  UPDATE public.products p
  SET
    name          = public.fn_display_product_name(pp.name),
    locked_fields = array_remove(p.locked_fields, 'name'),
    updated_at    = now()
  FROM public.produtos_padronizacao pp
  WHERE pp.supplier_id          = p.supplier_id
    AND pp.supplier_reference   = p.supplier_reference
    AND p.supplier_id           = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    AND p.is_active             = true
    AND p.name LIKE '% – %'
    AND p.name ~ '\d+[,.]?\d*\s*[xXøØ]'
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows < 280 OR v_rows > 310 THEN
    RAISE EXCEPTION 'Contagem fora do esperado (280-310): % linhas. Abortando.', v_rows;
  END IF;
END;
$$;
;
