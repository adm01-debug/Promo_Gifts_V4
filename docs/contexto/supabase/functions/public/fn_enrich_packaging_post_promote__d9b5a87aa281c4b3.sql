CREATE OR REPLACE FUNCTION public.fn_enrich_packaging_post_promote(p_supplier_id uuid, p_max_discover integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_extract_cnt int := 0;
  v_compat_cnt  int := 0;
  v_pip_cnt     int := 0;
  v_pip_norm    int := 0;
  v_discover_cnt int := 0;
  v_product RECORD;
  v_disc jsonb;
BEGIN
  PERFORM set_config('app.write_source','pipeline', true);

  -- PASSO 1: Atualizar description_packaging_info e optional_packaging_ref em gold
  WITH upd AS (
    UPDATE products p
    SET description_packaging_info = fn_extract_packaging_info(p.description, p.packing_type),
        optional_packaging_ref = NULLIF((fn_extract_packaging_info(p.description, p.packing_type)->'optional_refs'->>0),''),
        has_optional_packaging = CASE
          WHEN fn_extract_packaging_info(p.description, p.packing_type)->>'has_optional_mention' = 'true'
               OR p.optional_packaging_ref IS NOT NULL THEN true
          ELSE p.has_optional_packaging END
    WHERE p.supplier_id = p_supplier_id
      AND p.description IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO v_extract_cnt FROM upd;

  -- PASSO 2: Inserir/atualizar product_packaging_compatibility supplier_indicated
  WITH pares AS (
    SELECT p.id AS product_id, pk.id AS packaging_id, r.ref,
           substring(p.description from '[^.]{0,80}' || r.ref || '[^.]{0,40}') AS trecho
    FROM products p
    CROSS JOIN LATERAL jsonb_array_elements_text(p.description_packaging_info->'optional_refs') r(ref)
    JOIN products pk ON pk.sku = r.ref AND pk.supplier_id = p.supplier_id AND pk.product_type='packaging'
    WHERE p.supplier_id = p_supplier_id AND jsonb_array_length(p.description_packaging_info->'optional_refs') > 0
  )
  INSERT INTO product_packaging_compatibility (
    product_id, packaging_id, compatibility_source, supplier_reference_code,
    supplier_reference_text, is_recommended,
    fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm, fit_gap_diameter_mm,
    fit_gap_min_mm, fit_gap_avg_mm, fit_rating
  )
  SELECT pr.product_id, pr.packaging_id, 'supplier_indicated', pr.ref, pr.trecho, true,
         (f->>'gap_height_mm')::numeric, (f->>'gap_width_mm')::numeric,
         (f->>'gap_length_mm')::numeric, (f->>'gap_diameter_mm')::numeric,
         (f->>'gap_min_mm')::numeric, (f->>'gap_avg_mm')::numeric,
         NULLIF(f->>'fit_rating','')
  FROM pares pr
  CROSS JOIN LATERAL (SELECT fn_calculate_packaging_fit(pr.product_id, pr.packaging_id) AS f) c
  ON CONFLICT (product_id, packaging_id) DO UPDATE
     SET compatibility_source='supplier_indicated',
         supplier_reference_code=EXCLUDED.supplier_reference_code,
         supplier_reference_text=EXCLUDED.supplier_reference_text,
         is_recommended=true;
  GET DIAGNOSTICS v_compat_cnt = ROW_COUNT;

  -- PASSO 3: Criar/atualizar product_included_packagings para produtos novos
  WITH candidatos AS (
    SELECT p.id AS product_id,
           COALESCE(NULLIF(trim(p.packing_type),''), initcap(p.description_packaging_info->>'included_mention')) AS nome,
           p.packing_type AS raw_packing,
           p.packing_type_canonical,
           CASE WHEN p.packing_type_canonical ~* 'veludo|aveludad|berco|berço' THEN true ELSE false END AS tem_berco,
           CASE WHEN p.packing_type_canonical ~* 'kraft|craft' THEN 'kraft'
                WHEN p.packing_type_canonical ~* 'veludo|aveludad' THEN 'veludo'
                WHEN p.packing_type_canonical ~* 'non[- ]?woven|tnt' THEN 'non-woven'
                WHEN p.packing_type_canonical ~* 'madeira|bambu' THEN 'madeira'
                WHEN p.packing_type_canonical ~* 'metal|lata|alum' THEN 'metal'
                WHEN p.packing_type_canonical ~* 'pl[aá]stic|pvc' THEN 'plástico'
                WHEN p.packing_type_canonical ~* 'papel seda|manteiga' THEN 'papel seda'
                WHEN p.packing_type_canonical ~* 'caixa|cart[aã]o|estojo' THEN 'cartão'
                WHEN p.packing_type_canonical ~* 'bolsa|saco' THEN 'tecido'
                ELSE NULL END AS material,
           CASE WHEN p.packing_type_canonical ~* 'pret[ao]' THEN 'Preto'
                WHEN p.packing_type_canonical ~* 'branc[ao]' THEN 'Branco'
                WHEN p.packing_type_canonical ~* 'kraft|craft' THEN 'Kraft natural'
                WHEN p.packing_type_canonical ~* 'transparente' THEN 'Transparente' ELSE NULL END AS cor
    FROM products p
    WHERE p.supplier_id = p_supplier_id
      AND p.product_type = 'product'
      AND p.packing_classification = 'commercial'
      AND NOT EXISTS (SELECT 1 FROM product_included_packagings pip WHERE pip.product_id = p.id)
  )
  INSERT INTO product_included_packagings
    (product_id, name, material, color, has_inner_cradle, supplier_packaging_name, is_default, can_be_disabled, can_be_customized, active, notes)
  SELECT product_id, left(nome,200), material, cor, tem_berco, raw_packing, true, true, true, true,
         'Gerado pelo pipeline (fn_enrich_packaging_post_promote)'
  FROM candidatos WHERE nome IS NOT NULL;
  GET DIAGNOSTICS v_pip_cnt = ROW_COUNT;

  -- PASSO 4: Normalizar nomes pip para produtos deste fornecedor
  WITH upd AS (
    UPDATE product_included_packagings pip
    SET name = p.packing_type_canonical
    FROM products p
    WHERE pip.product_id = p.id AND p.supplier_id = p_supplier_id
      AND p.packing_type_canonical IS NOT NULL
      AND pip.name != p.packing_type_canonical AND pip.name = p.packing_type
    RETURNING 1
  ) SELECT count(*) INTO v_pip_norm FROM upd;

  -- PASSO 5: Auto-discover compatibilidade dimensional (limitado a p_max_discover produtos)
  FOR v_product IN
    SELECT id FROM products
    WHERE supplier_id = p_supplier_id AND product_type='product'
      AND is_active = true AND height_cm IS NOT NULL
    ORDER BY updated_at DESC LIMIT p_max_discover
  LOOP
    v_disc := fn_auto_discover_compatible_packagings(v_product.id, 'good');
    v_discover_cnt := v_discover_cnt + COALESCE((v_disc->>'discovered')::int, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'supplier_id', p_supplier_id,
    'gold_packaging_info_updated', v_extract_cnt,
    'compatibility_supplier_indicated', v_compat_cnt,
    'pip_created', v_pip_cnt,
    'pip_names_normalized', v_pip_norm,
    'compatibility_discovered', v_discover_cnt
  );
END;
$function$
