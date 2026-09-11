
CREATE OR REPLACE FUNCTION public.fn_auto_discover_all_compatible_packagings(
    p_min_fit_rating text DEFAULT 'good',
    p_config_type    text DEFAULT 'default',
    p_only_missing   boolean DEFAULT true  -- true = só produtos sem compat; false = todos
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_prefix      TEXT;
    v_min         DECIMAL; v_tight DECIMAL; v_good DECIMAL; v_max DECIMAL;
    v_inserted    INT := 0;
    v_skipped     INT := 0;
    v_incompat    INT := 0;
BEGIN
    -- Determinar prefixo de config
    v_prefix := lower(trim(COALESCE(p_config_type,'default')));
    IF v_prefix NOT IN ('fragile','precision','bottles') THEN v_prefix := ''; END IF;
    IF v_prefix <> '' THEN v_prefix := v_prefix || '_'; END IF;

    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'min_gap_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'min_gap_mm'), 2
    ) INTO v_min;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'tight_max_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'tight_gap_max_mm'), 5
    ) INTO v_tight;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'good_max_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'good_gap_max_mm'), 15
    ) INTO v_good;
    SELECT COALESCE(
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = v_prefix || 'max_gap_mm'),
        (SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key = 'max_gap_mm'), 50
    ) INTO v_max;

    -- ─────────────────────────────────────────────────────────────────────────
    -- CTE: Produto × Embalagem — cálculo em bloco (sem cursor)
    -- ─────────────────────────────────────────────────────────────────────────
    WITH
    -- Produtos candidatos (com dimensões)
    prods AS (
        SELECT p.id, p.height_cm, p.width_cm, p.length_cm, p.diameter_cm, p.shape_type, p.supplier_id
        FROM products p
        WHERE p.is_active = true
          AND p.product_type IN ('product','kit')
          AND p.height_cm IS NOT NULL
          AND p.width_cm  IS NOT NULL
          AND (
              NOT p_only_missing
              OR NOT EXISTS (
                  SELECT 1 FROM product_packaging_compatibility x
                  WHERE x.product_id = p.id AND x.active = true
              )
          )
    ),
    -- Embalagens disponíveis com dimensões internas
    pkgs AS (
        SELECT pk.id, pk.internal_height_cm, pk.internal_width_cm, pk.internal_length_cm,
               pk.internal_diameter_cm, pk.supplier_id
        FROM products pk
        WHERE pk.product_type = 'packaging'
          AND pk.is_active = true
          AND pk.internal_height_cm IS NOT NULL
    ),
    -- Cross product: calcular folgas
    pairs AS (
        SELECT
            pr.id AS product_id,
            pk.id AS packaging_id,
            pr.supplier_id AS prod_supplier,
            pk.supplier_id AS pkg_supplier,
            pr.shape_type,
            -- Para produtos cilíndricos em caixas retangulares: orientação ótima
            CASE WHEN pr.shape_type = 'cylindrical' THEN
                -- gap diâmetro vs. menor dimensão da caixa
                (LEAST(pk.internal_height_cm, pk.internal_width_cm, pk.internal_length_cm)
                 - COALESCE(pr.diameter_cm, pr.width_cm)) * 10
            ELSE
                (pk.internal_height_cm - pr.height_cm) * 10
            END AS gap_h_raw,

            CASE WHEN pr.shape_type = 'cylindrical' THEN
                -- gap altura vs. maior dimensão da caixa
                (GREATEST(pk.internal_height_cm, pk.internal_width_cm, pk.internal_length_cm)
                 - pr.height_cm) * 10
            ELSE
                (pk.internal_width_cm - pr.width_cm) * 10
            END AS gap_w_raw,

            CASE WHEN pr.shape_type = 'cylindrical' THEN NULL
            ELSE (pk.internal_length_cm - pr.length_cm) * 10
            END AS gap_l_raw
        FROM prods pr
        CROSS JOIN pkgs pk
    ),
    -- Folga mínima e classificação
    classified AS (
        SELECT
            product_id, packaging_id, prod_supplier, pkg_supplier, shape_type,
            gap_h_raw, gap_w_raw, gap_l_raw,
            CASE WHEN shape_type = 'cylindrical'
                 THEN LEAST(COALESCE(gap_h_raw, 999), COALESCE(gap_w_raw, 999))
                 ELSE LEAST(COALESCE(gap_h_raw, 999), COALESCE(gap_w_raw, 999), COALESCE(gap_l_raw, 999))
            END AS gap_min,
            CASE WHEN shape_type = 'cylindrical'
                 THEN (COALESCE(gap_h_raw, 0) + COALESCE(gap_w_raw, 0)) / 2.0
                 ELSE (COALESCE(gap_h_raw, 0) + COALESCE(gap_w_raw, 0) + COALESCE(gap_l_raw, 0)) / 3.0
            END AS gap_avg
        FROM pairs
    ),
    rated AS (
        SELECT
            product_id, packaging_id, prod_supplier, pkg_supplier, shape_type,
            gap_h_raw, gap_w_raw, gap_l_raw, gap_min, gap_avg,
            CASE
                WHEN gap_min IS NULL OR gap_min >= 900 THEN 'incompatible'
                WHEN gap_min < 0          THEN 'too_tight'
                WHEN gap_min < v_min      THEN 'too_tight'
                WHEN gap_min <= v_tight   THEN 'tight'
                WHEN gap_min <= v_good    THEN 'good'
                WHEN gap_min <= v_max     THEN 'loose'
                ELSE 'too_large'
            END AS fit_rating
        FROM classified
    ),
    -- Filtrar por min_fit_rating solicitado
    compatibles AS (
        SELECT * FROM rated
        WHERE fit_rating = ANY(
            CASE p_min_fit_rating
                WHEN 'tight'  THEN ARRAY['tight']
                WHEN 'good'   THEN ARRAY['tight','good']
                WHEN 'loose'  THEN ARRAY['tight','good','loose']
                ELSE               ARRAY['tight','good','loose']
            END
        )
    ),
    -- Inserir novos pares (ignorar existentes)
    ins AS (
        INSERT INTO product_packaging_compatibility (
            product_id, packaging_id, compatibility_source,
            fit_rating, fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm,
            fit_gap_min_mm, fit_gap_avg_mm,
            is_same_supplier, auto_discovered_at, config_type_used, active
        )
        SELECT
            product_id, packaging_id, 'dimension_calculated',
            fit_rating,
            ROUND(COALESCE(gap_h_raw, 0)::numeric, 2),
            ROUND(COALESCE(gap_w_raw, 0)::numeric, 2),
            ROUND(COALESCE(gap_l_raw, 0)::numeric, 2),
            ROUND(gap_min::numeric, 2),
            ROUND(gap_avg::numeric, 2),
            (prod_supplier = pkg_supplier),
            now(),
            COALESCE(NULLIF(p_config_type,'default'),'default'),
            true
        FROM compatibles
        ON CONFLICT (product_id, packaging_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted FROM ins;

    -- Contar incompatíveis (estimativa)
    SELECT COUNT(*)
    INTO v_incompat
    FROM (
        SELECT pr.id
        FROM products pr
        WHERE pr.is_active = true AND pr.product_type IN ('product','kit')
          AND pr.height_cm IS NOT NULL
    ) prs
    CROSS JOIN (SELECT id FROM products WHERE product_type = 'packaging' AND is_active = true AND internal_height_cm IS NOT NULL) pkk
    WHERE NOT EXISTS (
        SELECT 1 FROM product_packaging_compatibility x
        WHERE x.product_id = prs.id AND x.packaging_id = pkk.id
    );

    RETURN jsonb_build_object(
        'success',         true,
        'inserted',        v_inserted,
        'config_type',     p_config_type,
        'min_fit_rating',  p_min_fit_rating,
        'only_missing',    p_only_missing,
        'limits_mm',       jsonb_build_object('min',v_min,'tight',v_tight,'good',v_good,'max',v_max)
    );
END;
$function$;

COMMENT ON FUNCTION public.fn_auto_discover_all_compatible_packagings IS
'Versão batch de fn_auto_discover_compatible_packagings.
Processa TODOS os produtos de uma vez (set-based, sem cursor).
Suporta config_type: default | fragile | precision | bottles.';
;
