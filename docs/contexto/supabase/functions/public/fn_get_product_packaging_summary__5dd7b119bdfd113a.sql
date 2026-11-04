CREATE OR REPLACE FUNCTION public.fn_get_product_packaging_summary(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_included  JSONB;
    v_compat    JSONB;
    v_product   RECORD;
BEGIN
    SELECT sku, name, product_type, shape_type, height_cm, width_cm, length_cm, diameter_cm
    INTO v_product FROM products WHERE id = p_product_id;

    IF v_product IS NULL THEN
        RETURN jsonb_build_object('error','Produto não encontrado');
    END IF;

    -- Embalagens inclusas
    SELECT jsonb_agg(jsonb_build_object(
        'id',            pip.id,
        'name',          pip.name,
        'material',      pip.material,
        'color',         pip.color,
        'can_customize', pip.can_be_customized,
        'can_disable',   pip.can_be_disabled,
        'has_cradle',    pip.has_inner_cradle,
        'dims_internal', CASE WHEN pip.internal_height_cm IS NOT NULL
            THEN jsonb_build_object('h',pip.internal_height_cm,'w',pip.internal_width_cm,'l',pip.internal_length_cm)
            ELSE NULL END,
        'areas_count',   (SELECT COUNT(*) FROM included_packaging_print_areas WHERE packaging_id = pip.id AND active = true),
        'techniques',    (SELECT jsonb_agg(technique_name ORDER BY display_order) FROM included_packaging_techniques WHERE packaging_id = pip.id AND active = true)
    ) ORDER BY pip.is_default DESC)
    INTO v_included
    FROM product_included_packagings pip
    WHERE pip.product_id = p_product_id AND pip.active = true;

    -- Embalagens compatíveis (opcionais recomendadas)
    SELECT jsonb_agg(jsonb_build_object(
        'packaging_id',  ppc.packaging_id,
        'sku',           pkg.sku,
        'name',          pkg.name,
        'fit_rating',    ppc.fit_rating,
        'gap_min_mm',    ppc.fit_gap_min_mm,
        'source',        ppc.compatibility_source,
        'recommended',   ppc.is_recommended,
        'same_supplier', ppc.is_same_supplier,
        'supplier',      (SELECT name FROM suppliers WHERE id = pkg.supplier_id),
        'price',         (SELECT unit_price FROM supplier_packagings WHERE packaging_id = ppc.packaging_id AND is_available = true ORDER BY unit_price LIMIT 1)
    ) ORDER BY ppc.is_recommended DESC, ppc.fit_gap_min_mm NULLS LAST)
    INTO v_compat
    FROM product_packaging_compatibility ppc
    JOIN products pkg ON pkg.id = ppc.packaging_id
    WHERE ppc.product_id = p_product_id AND ppc.active = true
      AND ppc.fit_rating IN ('tight','good','loose');

    RETURN jsonb_build_object(
        'product',       jsonb_build_object('sku',v_product.sku,'name',v_product.name,'shape',v_product.shape_type,
                            'dims',jsonb_build_object('h',v_product.height_cm,'w',v_product.width_cm,'l',v_product.length_cm,'d',v_product.diameter_cm)),
        'included',      COALESCE(v_included, '[]'::jsonb),
        'compatible',    COALESCE(v_compat, '[]'::jsonb),
        'has_packaging', (v_included IS NOT NULL AND jsonb_array_length(COALESCE(v_included,'[]'::jsonb)) > 0),
        'has_options',   (v_compat IS NOT NULL AND jsonb_array_length(COALESCE(v_compat,'[]'::jsonb)) > 0),
        'generated_at',  now()
    );
END;
$function$
