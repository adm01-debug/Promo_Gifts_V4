
DO $$
DECLARE
  v_rows_b2  integer;
  v_rows_c   integer;
BEGIN
  PERFORM set_config('app.write_source', 'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true', true);

  -- GAP-B2: "Kit vinho – 23cmxø6,1cm (AxøD)" → "Kit vinho"
  -- Regex expandida: captura também "Ncm" antes do separador x
  UPDATE public.products p
  SET
    name          = public.fn_display_product_name(pp.name),
    locked_fields = array_remove(p.locked_fields, 'name'),
    updated_at    = now()
  FROM public.produtos_padronizacao pp
  WHERE pp.supplier_id        = p.supplier_id
    AND pp.supplier_reference = p.supplier_reference
    AND p.supplier_id         = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    AND p.is_active            = true
    AND p.name LIKE '% – %'
    AND p.name ~ '\d+cm[xX×]'   -- Ncm antes do x (GAP-B2 pattern)
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_rows_b2 = ROW_COUNT;

  -- GAP-C: "Nome – ref. SKU" → nome limpo
  -- O sufixo "– ref. XXXXX" é redundante (SKU já está em products.sku)
  UPDATE public.products p
  SET
    name          = public.fn_display_product_name(pp.name),
    locked_fields = array_remove(p.locked_fields, 'name'),
    updated_at    = now()
  FROM public.produtos_padronizacao pp
  WHERE pp.supplier_id        = p.supplier_id
    AND pp.supplier_reference = p.supplier_reference
    AND p.supplier_id         = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    AND p.is_active            = true
    AND p.name ~ '– ref\.'    -- GAP-C pattern
    AND NULLIF(TRIM(pp.name), '') IS NOT NULL;

  GET DIAGNOSTICS v_rows_c = ROW_COUNT;

  RAISE NOTICE '[fix_asia_gap_b2_and_c] B2=%rows, C=%rows', v_rows_b2, v_rows_c;

  -- Validação: nenhum " – " deve restar nos produtos Asia ativos
  IF EXISTS (SELECT 1 FROM products WHERE supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'
             AND is_active=true AND name LIKE '% – %') THEN
    RAISE EXCEPTION 'FALHA: ainda existem produtos Asia com sufixo – apos o fix';
  END IF;
END;
$$;
;
