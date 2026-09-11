
-- ══════════════════════════════════════════════════════════════════
-- 16C: fn_promote_packaging_to_gold — pipeline Silver → Gold
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_promote_packaging_to_gold(
    p_supplier_id  uuid DEFAULT NULL,  -- NULL = todos os fornecedores
    p_batch_size   int  DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_promoted_included  INT := 0;
    v_promoted_compat    INT := 0;
    v_promoted_type      INT := 0;
    v_errors             INT := 0;
BEGIN
    -- ─────────────────────────────────────────────────────────
    -- PASSO 1: Atualizar product_type='packaging' para produtos
    --          que têm is_packaging_product=true no Silver
    --          (via product_packaging.has_optional_packaging e packing_classification)
    -- ─────────────────────────────────────────────────────────
    WITH candidates AS (
        SELECT DISTINCT pp.product_id
        FROM product_packaging pp
        JOIN products p ON p.id = pp.product_id
        WHERE p.product_type <> 'packaging'
          AND pp.packing_classification = 'packaging_product'
          AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
        LIMIT p_batch_size
    )
    UPDATE products p
    SET product_type = 'packaging', updated_at = now()
    FROM candidates c
    WHERE p.id = c.product_id;
    GET DIAGNOSTICS v_promoted_type = ROW_COUNT;

    -- ─────────────────────────────────────────────────────────
    -- PASSO 2: Criar/atualizar product_included_packagings
    --          a partir de product_packaging (Silver) onde
    --          has_commercial_packaging = true e sem registo existente
    -- ─────────────────────────────────────────────────────────
    WITH silver AS (
        SELECT 
            pp.product_id,
            pp.packing_type       AS pip_name,
            pp.packaging_material AS pip_material,
            pp.packaging_color    AS pip_color,
            pp.packaging_finish   AS pip_finish,
            pp.has_inner_cradle   AS pip_cradle,
            pp.cradle_material    AS pip_cradle_mat,
            p.supplier_id
        FROM product_packaging pp
        JOIN products p ON p.id = pp.product_id
        WHERE pp.packing_classification = 'commercial'
          AND pp.packing_type IS NOT NULL
          AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
          AND NOT EXISTS (
              SELECT 1 FROM product_included_packagings pip
              WHERE pip.product_id = pp.product_id AND pip.active = true
          )
        LIMIT p_batch_size
    )
    INSERT INTO product_included_packagings (
        product_id, name, material, color, finish,
        has_inner_cradle, cradle_material,
        can_be_customized, can_be_disabled, is_default,
        supplier_id, ingest_source, active
    )
    SELECT 
        product_id,
        COALESCE(NULLIF(trim(pip_name),''), 'Embalagem'),
        pip_material,
        pip_color,
        pip_finish,
        COALESCE(pip_cradle, false),
        pip_cradle_mat,
        -- Determinar can_be_customized por material
        CASE WHEN pip_material ILIKE ANY(ARRAY['%polybag%','%plástico bolha%','%película%'])
             THEN false ELSE true END,
        true,   -- can_be_disabled
        true,   -- is_default
        supplier_id,
        CASE 
            WHEN supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0' THEN 'spot_properties'
            WHEN supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118' THEN 'asia_manual'
            WHEN supplier_id = '841cd690-210a-422a-908c-7676828db272' THEN 'sm_scraping'
            WHEN supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN 'xbz_manual'
            ELSE 'pipeline_auto'
        END,
        true
    FROM silver
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_promoted_included = ROW_COUNT;

    -- ─────────────────────────────────────────────────────────
    -- PASSO 3: Criar compatibilidades supplier_indicated
    --          a partir de optional_packaging_ref em products
    -- ─────────────────────────────────────────────────────────
    WITH refs AS (
        SELECT DISTINCT
            p.id AS product_id,
            p.optional_packaging_ref AS ref_sku
        FROM products p
        WHERE p.optional_packaging_ref IS NOT NULL
          AND p.is_active = true
          AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    ),
    resolved AS (
        SELECT r.product_id, pkg.id AS packaging_id
        FROM refs r
        JOIN products pkg ON pkg.sku = r.ref_sku AND pkg.product_type = 'packaging' AND pkg.is_active = true
        WHERE NOT EXISTS (
            SELECT 1 FROM product_packaging_compatibility ppc
            WHERE ppc.product_id = r.product_id AND ppc.packaging_id = pkg.id
        )
        LIMIT p_batch_size
    )
    INSERT INTO product_packaging_compatibility (
        product_id, packaging_id, compatibility_source,
        is_recommended, is_same_supplier, active
    )
    SELECT 
        product_id, packaging_id, 'supplier_indicated',
        true,
        (SELECT supplier_id FROM products WHERE id = product_id) = 
        (SELECT supplier_id FROM products WHERE id = packaging_id),
        true
    FROM resolved
    ON CONFLICT (product_id, packaging_id) DO NOTHING;
    GET DIAGNOSTICS v_promoted_compat = ROW_COUNT;

    RETURN jsonb_build_object(
        'success',           true,
        'promoted_type',     v_promoted_type,
        'promoted_included', v_promoted_included,
        'promoted_compat',   v_promoted_compat,
        'errors',            v_errors,
        'supplier_id',       p_supplier_id,
        'batch_size',        p_batch_size,
        'executed_at',       now()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error',   SQLERRM,
        'sqlstate', SQLSTATE
    );
END;
$function$;

COMMENT ON FUNCTION public.fn_promote_packaging_to_gold IS
'Pipeline Silver → Gold para módulo de embalagens.
- Passo 1: Classifica products como product_type=packaging
- Passo 2: Cria product_included_packagings a partir de product_packaging (Silver)
- Passo 3: Cria product_packaging_compatibility supplier_indicated via optional_packaging_ref
p_supplier_id: NULL = todos | UUID = fornecedor específico
p_batch_size: limite por execução (default 500)';
;
