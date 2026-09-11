
-- ══════════════════════════════════════════════════════════════════
-- 16A: VIEW vw_packaging_health — painel de saúde do módulo
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_packaging_health AS
WITH stats AS (
    SELECT
        -- Embalagens inclusas
        (SELECT COUNT(*) FROM product_included_packagings WHERE active = true)                      AS pip_total,
        (SELECT COUNT(*) FROM product_included_packagings WHERE active = true AND material IS NOT NULL) AS pip_com_material,
        (SELECT COUNT(*) FROM product_included_packagings WHERE active = true AND internal_height_cm IS NOT NULL) AS pip_com_dims_internas,
        (SELECT COUNT(*) FROM product_included_packagings WHERE active = true AND can_be_customized = true) AS pip_personalizaveis,
        -- Print areas e técnicas
        (SELECT COUNT(*) FROM included_packaging_print_areas WHERE active = true)                    AS areas_total,
        (SELECT COUNT(*) FROM included_packaging_techniques  WHERE active = true)                    AS tecnicas_total,
        -- Compatibilidades
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE active = true)                   AS compat_total,
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE active = true AND fit_rating = 'tight') AS compat_tight,
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE active = true AND fit_rating = 'good')  AS compat_good,
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE active = true AND fit_rating = 'loose') AS compat_loose,
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE active = true AND is_recommended = true) AS compat_recomendados,
        (SELECT COUNT(*) FROM product_packaging_compatibility WHERE compatibility_source = 'supplier_indicated' AND active = true) AS compat_supplier,
        -- Produtos
        (SELECT COUNT(*) FROM products WHERE product_type = 'packaging' AND is_active = true)        AS pkgs_catalogados,
        (SELECT COUNT(*) FROM products WHERE product_type = 'packaging' AND is_active = true AND internal_height_cm IS NOT NULL) AS pkgs_com_dims,
        (SELECT COUNT(DISTINCT product_id) FROM product_packaging_compatibility WHERE active = true) AS produtos_com_compat,
        (SELECT COUNT(*) FROM products WHERE is_active = true AND product_type IN ('product','kit'))  AS produtos_total,
        -- Catálogo
        (SELECT COUNT(*) FROM packagings WHERE active = true)    AS packagings_catalog,
        (SELECT COUNT(*) FROM supplier_packagings WHERE active = true) AS supplier_packagings,
        -- Config
        (SELECT config_value FROM packaging_compatibility_config WHERE config_key = 'min_gap_mm')    AS cfg_min_gap,
        (SELECT config_value FROM packaging_compatibility_config WHERE config_key = 'tight_gap_max_mm') AS cfg_tight_max,
        (SELECT config_value FROM packaging_compatibility_config WHERE config_key = 'good_gap_max_mm')  AS cfg_good_max,
        (SELECT config_value FROM packaging_compatibility_config WHERE config_key = 'max_gap_mm')    AS cfg_max_gap
)
SELECT
    -- Embalagens inclusas
    pip_total               AS "pip_total",
    pip_com_material        AS "pip_com_material",
    ROUND(pip_com_material::numeric  / NULLIF(pip_total,0) * 100, 1) AS "pip_material_pct",
    pip_com_dims_internas   AS "pip_dims_internas",
    pip_personalizaveis     AS "pip_personalizaveis",
    -- Personalização
    areas_total             AS "areas_gravacao_total",
    tecnicas_total          AS "tecnicas_total",
    -- Compatibilidades
    compat_total            AS "compat_total",
    compat_tight            AS "compat_tight",
    compat_good             AS "compat_good",
    compat_loose            AS "compat_loose",
    compat_recomendados     AS "compat_recomendados",
    compat_supplier         AS "compat_supplier_indicated",
    ROUND(compat_recomendados::numeric / NULLIF(compat_total,0) * 100, 1) AS "compat_recom_pct",
    -- Cobertura de produtos
    produtos_total          AS "produtos_ativos_total",
    produtos_com_compat     AS "produtos_com_compat",
    (produtos_total - produtos_com_compat) AS "produtos_sem_compat",
    ROUND(produtos_com_compat::numeric / NULLIF(produtos_total,0) * 100, 1) AS "cobertura_compat_pct",
    -- Catálogo de embalagens
    pkgs_catalogados        AS "pkgs_catalogados",
    pkgs_com_dims           AS "pkgs_com_dims_internas",
    packagings_catalog      AS "packagings_catalog_entries",
    supplier_packagings     AS "supplier_packagings_entries",
    -- Config atual
    cfg_min_gap  || 'mm'  AS "config_min_gap",
    cfg_tight_max|| 'mm'  AS "config_tight_max",
    cfg_good_max || 'mm'  AS "config_good_max",
    cfg_max_gap  || 'mm'  AS "config_max_gap",
    now()                   AS "snapshot_at"
FROM stats;

COMMENT ON VIEW public.vw_packaging_health IS
'Painel de saúde do módulo de embalagens. Mostra cobertura, qualidade e configuração atual.';

-- ══════════════════════════════════════════════════════════════════
-- 16B: fn_get_product_packaging_summary — versão melhorada
-- ══════════════════════════════════════════════════════════════════
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
$function$;

COMMENT ON FUNCTION public.fn_get_product_packaging_summary IS
'Retorna sumário completo de embalagens de um produto:
- included: embalagens inclusas com áreas e técnicas de personalização
- compatible: embalagens opcionais compatíveis com fit_rating e preços';
;
