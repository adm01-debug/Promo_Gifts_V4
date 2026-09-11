
DO $$
DECLARE
  v_xbz integer;
  v_sm  integer;
BEGIN
  PERFORM set_config('app.write_source',     'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true',     true);

  -- XBZ: corrigir os 162 residuais (Padrão C, D, E)
  -- Pattern: Gold.name tem " – " E difere do fn_display(Silver.name)
  UPDATE public.products p
  SET
    name          = public.fn_display_product_name(pp.name),
    locked_fields = array_remove(p.locked_fields, 'name'),
    updated_at    = now()
  FROM public.produtos_padronizacao pp
  WHERE pp.supplier_id        = p.supplier_id
    AND pp.supplier_reference = p.supplier_reference
    AND p.supplier_id         = 'd6718a29-e954-4c1b-bd84-03ea24884900'
    AND p.is_active            = true
    AND p.name LIKE '% – %'
    AND p.name <> public.fn_display_product_name(pp.name)
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_xbz = ROW_COUNT;

  -- SóMarcas: corrigir os 16 residuais
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
    AND p.name <> public.fn_display_product_name(pp.name)
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_sm = ROW_COUNT;

  RAISE NOTICE '[fix_residuals] XBZ=% SM=%', v_xbz, v_sm;

  -- Validação: Nenhum " – " deve restar em XBZ ou SM onde Silver difere
  IF EXISTS (
    SELECT 1 FROM products p
    JOIN produtos_padronizacao pp ON pp.supplier_id=p.supplier_id AND pp.supplier_reference=p.supplier_reference
    WHERE p.supplier_id IN ('d6718a29-e954-4c1b-bd84-03ea24884900','841cd690-210a-422a-908c-7676828db272')
      AND p.is_active=true
      AND p.name LIKE '% – %'
      AND p.name <> public.fn_display_product_name(pp.name)
  ) THEN
    RAISE EXCEPTION 'FALHA: residuais ainda existem apos fix';
  END IF;
END;
$$;
;
